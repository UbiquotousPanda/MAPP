-- name: GetHomeActionReminder :one
SELECT person_id, hidden_until, updated_at
FROM home_action_reminders
WHERE person_id = $1;

-- name: PutHomeActionReminder :exec
INSERT INTO home_action_reminders (person_id, hidden_until, updated_at)
VALUES ($1, $2, $3)
ON CONFLICT (person_id) DO UPDATE SET
    hidden_until = excluded.hidden_until,
    updated_at = excluded.updated_at;
