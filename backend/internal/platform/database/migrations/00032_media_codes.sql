-- +goose Up
-- Media-code configuration lives here, not on the activity type, which feature 002 owns.
CREATE TABLE media_codes (
    id              text        PRIMARY KEY CHECK (id ~ '^MC-[0-9]+$'),
    code            bigint      NOT NULL UNIQUE CHECK (code > 0),
    activity_id     text        NOT NULL REFERENCES activities (id) DEFERRABLE INITIALLY DEFERRED,
    attributes      json        NOT NULL CHECK (json_typeof(attributes) = 'object'),
    landing_page    text        NOT NULL CHECK (char_length(landing_page) <= 2000),
    status          text        NOT NULL CHECK (status IN ('active', 'inactive')),
    version         integer     NOT NULL CHECK (version >= 1),
    created_at      timestamptz NOT NULL,
    created_by_id   text        NOT NULL,
    created_by_name text        NOT NULL,
    updated_at      timestamptz NOT NULL,
    updated_by_id   text        NOT NULL,
    updated_by_name text        NOT NULL
);

CREATE INDEX media_codes_activity_idx ON media_codes (activity_id);

-- Only superseded names: the current one stays activities.external_name, and rows in flight still match after a rename.
CREATE TABLE activity_external_name_aliases (
    id              text        PRIMARY KEY CHECK (id ~ '^XN-[0-9]+$'),
    activity_id     text        NOT NULL REFERENCES activities (id) DEFERRABLE INITIALLY DEFERRED,
    name            text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    version         integer     NOT NULL CHECK (version >= 1),
    created_at      timestamptz NOT NULL,
    created_by_id   text        NOT NULL,
    created_by_name text        NOT NULL,
    updated_at      timestamptz NOT NULL,
    updated_by_id   text        NOT NULL,
    updated_by_name text        NOT NULL
);

CREATE UNIQUE INDEX activity_external_name_aliases_name_idx
    ON activity_external_name_aliases (lower(name COLLATE "C"));
CREATE INDEX activity_external_name_aliases_activity_idx
    ON activity_external_name_aliases (activity_id);

CREATE TABLE activity_integration_ids (
    id              text        PRIMARY KEY CHECK (id ~ '^IID-[0-9]+$'),
    activity_id     text        NOT NULL REFERENCES activities (id) DEFERRABLE INITIALLY DEFERRED,
    source_id       text        NOT NULL REFERENCES performance_sources (id) DEFERRABLE INITIALLY DEFERRED,
    value           text        NOT NULL CHECK (char_length(value) BETWEEN 1 AND 200),
    version         integer     NOT NULL CHECK (version >= 1),
    created_at      timestamptz NOT NULL,
    created_by_id   text        NOT NULL,
    created_by_name text        NOT NULL,
    updated_at      timestamptz NOT NULL,
    updated_by_id   text        NOT NULL,
    updated_by_name text        NOT NULL
);

CREATE UNIQUE INDEX activity_integration_ids_one_per_source_idx
    ON activity_integration_ids (activity_id, source_id);
CREATE UNIQUE INDEX activity_integration_ids_value_idx
    ON activity_integration_ids (source_id, lower(value COLLATE "C"));

-- One row, like overspend_configuration and purchase_request_configuration.
CREATE TABLE performance_configuration (
    id                    text        PRIMARY KEY CHECK (id = 'performance'),
    media_code_next       bigint      NOT NULL CHECK (media_code_next > 0),
    code_attributes       json        NOT NULL CHECK (json_typeof(code_attributes) = 'array'),
    version               integer     NOT NULL CHECK (version >= 1),
    created_at            timestamptz NOT NULL,
    created_by_id         text        NOT NULL,
    created_by_name       text        NOT NULL,
    updated_at            timestamptz NOT NULL,
    updated_by_id         text        NOT NULL,
    updated_by_name       text        NOT NULL
);

CREATE TABLE performance_code_activity_types (
    activity_type_id text NOT NULL REFERENCES activity_types (id) DEFERRABLE INITIALLY DEFERRED,
    PRIMARY KEY (activity_type_id)
);
