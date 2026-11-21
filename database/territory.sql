\getenv territory_file VICMAR_TERRITORY_FILE

BEGIN;
CREATE TEMP TABLE territory_import ON COMMIT DROP AS
SELECT region, position
FROM jsonb_array_elements(pg_read_file(:'territory_file')::jsonb)
    WITH ORDINALITY AS catalog(region, position);

INSERT INTO api.regions (code, name, position)
SELECT region->>'code', region->>'name', position FROM territory_import;

INSERT INTO api.communes (code, region_code, name)
SELECT commune->>'code', region->>'code', commune->>'name'
FROM territory_import
CROSS JOIN LATERAL jsonb_array_elements(region->'communes') AS entries(commune);
COMMIT;
