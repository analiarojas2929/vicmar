param(
    [string]$PostgresBin = "C:/Program Files/PostgreSQL/18/bin",
    [string]$PostgrestExe
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $root ".vicmar-db.local"
$data = Join-Path $runtime "data"
$pgCtl = Join-Path $PostgresBin "pg_ctl.exe"
$psql = Join-Path $PostgresBin "psql.exe"
$endpoint = "http://127.0.0.1:3001"

if (!$PostgrestExe) {
    $PostgrestExe = Join-Path $runtime "postgrest/postgrest.exe"
    if (!(Test-Path $PostgrestExe)) {
        $installed = Get-Command postgrest.exe -ErrorAction SilentlyContinue
        if ($installed) { $PostgrestExe = $installed.Source }
    }
}
foreach ($binary in @($pgCtl, $psql)) {
    if (!(Test-Path -LiteralPath $binary -PathType Leaf)) { throw "Executable not found: $binary" }
}

function Invoke-LocalCommand([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program exited with code $LASTEXITCODE." }
}

New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$adminSecret = Join-Path $runtime "admin-password"
$catalogSecret = Join-Path $runtime "catalog-password"
foreach ($secret in @($adminSecret, $catalogSecret)) {
    if (!(Test-Path -LiteralPath $secret)) {
        [IO.File]::WriteAllText($secret, [guid]::NewGuid().ToString("N"))
    }
}

if (!(Test-Path (Join-Path $data "PG_VERSION"))) {
    Invoke-LocalCommand (Join-Path $PostgresBin "initdb.exe") @(
        "-D", $data, "-U", "postgres", "--auth=scram-sha-256", "--encoding=UTF8",
        "--locale=C", "--pwfile=$adminSecret"
    )
}

& $pgCtl status -D $data *> $null
if ($LASTEXITCODE -ne 0) {
    Invoke-LocalCommand $pgCtl @(
        "start", "-w", "-D", $data, "-l", (Join-Path $runtime "postgres.log"),
        "-o", "-h 127.0.0.1 -p 5433"
    )
}

$env:PGPASSWORD = [IO.File]::ReadAllText($adminSecret)
$env:VICMAR_CATALOG_PASSWORD = [IO.File]::ReadAllText($catalogSecret)
$env:VICMAR_TERRITORY_FILE = Join-Path $root "src/config/chile-territory.json"
$connection = @("-h", "127.0.0.1", "-p", "5433", "-U", "postgres", "-X", "-v", "ON_ERROR_STOP=1")
$database = Invoke-LocalCommand $psql ($connection + @("-d", "postgres", "-Atc", "SELECT 1 FROM pg_database WHERE datname = 'vicmar'"))
if ($database -ne "1") {
    Invoke-LocalCommand $psql ($connection + @("-d", "postgres", "-c", "CREATE DATABASE vicmar"))
}
$connection += @("-d", "vicmar")
$schema = Invoke-LocalCommand $psql ($connection + @("-Atc", "SELECT to_regclass('api.regions')"))
if (!$schema) {
    Invoke-LocalCommand $psql ($connection + @("-f", (Join-Path $PSScriptRoot "schema.sql")))
}
$regions = Invoke-LocalCommand $psql ($connection + @("-Atc", "SELECT count(*) FROM api.regions"))
if ($regions -eq "0") {
    Invoke-LocalCommand $psql ($connection + @("-f", (Join-Path $PSScriptRoot "territory.sql")))
}

if (!(Test-Path -LiteralPath $PostgrestExe -PathType Leaf)) { throw "Executable not found: $PostgrestExe" }
$env:Path = "$PostgresBin;$env:Path"
$env:PGPASSWORD = $env:VICMAR_CATALOG_PASSWORD
$env:PGRST_DB_URI = "postgresql://vicmar_catalog_authenticator@127.0.0.1:5433/vicmar"
$env:PGRST_DB_SCHEMAS = "api"
$env:PGRST_DB_ANON_ROLE = "vicmar_catalog_reader"
$env:PGRST_SERVER_HOST = "127.0.0.1"
$env:PGRST_SERVER_PORT = "3001"

try { $catalog = Invoke-RestMethod "$endpoint/regions?select=code" -TimeoutSec 2 }
catch { $catalog = $null }
if (!$catalog) {
    $api = Start-Process -FilePath $PostgrestExe -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtime "postgrest.log") `
        -RedirectStandardError (Join-Path $runtime "postgrest-error.log")
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try { $catalog = Invoke-RestMethod "$endpoint/regions?select=code" -TimeoutSec 2; break }
        catch {
            if ($api.HasExited) { break }
            Start-Sleep -Milliseconds 500
        }
    }
}
if (@($catalog).Count -ne 16) { throw "PostgREST is unavailable or returned an incomplete catalog. See .vicmar-db.local/postgrest-error.log." }
Write-Output "PostgREST ready at $endpoint"
