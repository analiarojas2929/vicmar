\getenv catalog_password VICMAR_CATALOG_PASSWORD

BEGIN;
CREATE ROLE vicmar_catalog_reader NOLOGIN;
CREATE ROLE vicmar_catalog_authenticator LOGIN NOINHERIT PASSWORD :'catalog_password';
GRANT vicmar_catalog_reader TO vicmar_catalog_authenticator;

CREATE SCHEMA api;
CREATE TABLE api.regions (
    code text PRIMARY KEY CHECK (code ~ '^[0-9]{2}$'),
    name text NOT NULL UNIQUE,
    position smallint NOT NULL UNIQUE
);
CREATE TABLE api.communes (
    code text PRIMARY KEY CHECK (code ~ '^[0-9]{5}$'),
    region_code text NOT NULL REFERENCES api.regions (code),
    name text NOT NULL,
    CHECK (left(code, 2) = region_code),
    UNIQUE (region_code, name)
);

GRANT USAGE ON SCHEMA api TO vicmar_catalog_reader;
GRANT SELECT ON api.regions, api.communes TO vicmar_catalog_reader;
COMMIT;
