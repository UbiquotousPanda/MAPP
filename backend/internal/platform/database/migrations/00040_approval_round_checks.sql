-- +goose Up
-- A round is open exactly while it has not ended; a delegation is cancelled with its time, by and name together.
ALTER TABLE approval_rounds ADD CONSTRAINT approval_rounds_open_until_ended
    CHECK ((outcome = 'open') = (ended_at IS NULL));
ALTER TABLE approval_delegations ADD CONSTRAINT approval_delegations_cancelled_together
    CHECK (num_nulls(cancelled_at, cancelled_by_id, cancelled_by_name) IN (0, 3));
