-- +goose Up
CREATE TABLE post_investment_reviews (
    id                 text        PRIMARY KEY CHECK (id ~ '^PIR-[0-9]+$'),
    activity_id        text        NOT NULL UNIQUE REFERENCES activities (id) DEFERRABLE INITIALLY DEFERRED,
    status             text        NOT NULL CHECK (status IN ('draft', 'submitted')),
    business_case      text        NOT NULL CHECK (char_length(business_case) <= 200 AND business_case = btrim(business_case)),
    currency           text        NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    amount_spent_minor bigint      CHECK (amount_spent_minor >= 0),
    margin_minor       bigint,
    remarks            text        NOT NULL CHECK (char_length(remarks) <= 2000),
    submitted_at       timestamptz,
    submitted_by_id    text,
    submitted_by_name  text,
    version            integer     NOT NULL CHECK (version >= 1),
    created_at         timestamptz NOT NULL,
    created_by_id      text        NOT NULL,
    created_by_name    text        NOT NULL,
    updated_at         timestamptz NOT NULL,
    updated_by_id      text        NOT NULL,
    updated_by_name    text        NOT NULL,
    CHECK ((status = 'submitted') = (submitted_at IS NOT NULL)),
    CHECK ((submitted_at IS NULL) = (submitted_by_id IS NULL) AND (submitted_by_id IS NULL) = (submitted_by_name IS NULL)),
    CHECK (status = 'draft' OR (business_case <> '' AND amount_spent_minor > 0 AND margin_minor IS NOT NULL))
);
