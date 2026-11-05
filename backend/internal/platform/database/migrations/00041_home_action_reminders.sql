-- +goose Up
-- "Remind me later" on Home's action items: one row per person, written the first time they choose it.
CREATE TABLE home_action_reminders (
    person_id    text        PRIMARY KEY REFERENCES people (id) ON DELETE CASCADE,
    hidden_until date        NOT NULL,
    updated_at   timestamptz NOT NULL
);
