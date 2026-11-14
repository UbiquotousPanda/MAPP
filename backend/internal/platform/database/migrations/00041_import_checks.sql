-- +goose Up
-- Each check imports once (check_id); kept_reason says why Undo kept a created record, recorded when it ran.
ALTER TABLE plan_imports ADD COLUMN check_id text UNIQUE CHECK (check_id <> '');
ALTER TABLE plan_import_records ADD COLUMN kept_reason text CHECK (kept_reason <> '');
