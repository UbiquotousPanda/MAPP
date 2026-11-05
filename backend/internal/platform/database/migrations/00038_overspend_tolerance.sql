-- +goose Up
-- demo-mvp #4: how far over its budget planned cost may go before a budget set to Refuse refuses, in whole per cent.
ALTER TABLE overspend_configuration
    ADD COLUMN tolerance_percent integer NOT NULL DEFAULT 10 CHECK (tolerance_percent BETWEEN 0 AND 100);

INSERT INTO overspend_configuration (
    id, default_mode, approval_over_planned_cost, tolerance_percent, version, created_at, created_by_id,
    created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES (
    'overspend', 'warn', 'warn', 10, 1, now(), 'system', 'SP&A One', now(), 'system', 'SP&A One'
)
ON CONFLICT (id) DO NOTHING;
