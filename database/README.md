# Catálogo territorial de Chile

El esquema `api` expone 16 regiones y 346 comunas de solo lectura mediante PostgREST. La copia local de los códigos CUT se preparó a partir de `@clregions/data` 1.0.0. La clasificación oficial está publicada por [SUBDERE](https://www.subdere.gov.cl/documentacion/c%C3%B3digos-%C3%BAnicos-territoriales-actualizados-al-06-de-septiembre-2018). PostgreSQL carga el mismo catálogo que el cotizador, conserva los ceros iniciales y vincula cada comuna con su región.

## Arranque local en Windows

Instala PostgreSQL y descarga el ejecutable de Windows de [PostgREST](https://github.com/PostgREST/postgrest/releases). Extrae `postgrest.exe` en `.vicmar-db.local/postgrest/` o indica su ruta con `-PostgrestExe`. El script busca PostgreSQL 18 en la ruta habitual de instalación. Si lo instalaste en otra ruta, indica el directorio de binarios con `-PostgresBin`.

Desde la raíz del repositorio, ejecuta en PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File database/start-local.ps1
$env:VITE_POSTGREST_URL = "http://127.0.0.1:3001"
npm.cmd run dev
```

El script crea un clúster aislado de PostgreSQL en el puerto 5433 e inicia PostgREST en el 3001. Ambos escuchan en `127.0.0.1`. Los datos, credenciales locales y registros quedan en `.vicmar-db.local/`, que está excluido de Git. Puedes volver a ejecutar el script para arrancar los procesos con los datos existentes.

Para guardar la URL solo en desarrollo, agrega `VITE_POSTGREST_URL=http://127.0.0.1:3001` a `.env.development.local`. El cotizador usa el catálogo incluido cuando la URL está ausente o la API falla.

## Consultas

- `/regions?order=position` devuelve las regiones en orden geográfico.
- `/communes?region_code=eq.05&order=name` devuelve las comunas de Valparaíso.
- `/regions?select=code,name,communes(code,name)&order=position` devuelve el catálogo agrupado.
