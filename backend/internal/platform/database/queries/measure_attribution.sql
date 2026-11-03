-- name: GetAttributionSettings :many
SELECT * FROM attribution_settings WHERE id = 'attribution';

-- name: PutAttributionSettings :exec
INSERT INTO attribution_settings (
    id, model, version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES (
    'attribution', $1, $2, $3, $4, $5, $6, $7, $8
)
ON CONFLICT (id) DO UPDATE SET
    model = excluded.model,
    version = excluded.version,
    updated_at = excluded.updated_at,
    updated_by_id = excluded.updated_by_id,
    updated_by_name = excluded.updated_by_name;

-- name: AttributionConversions :many
SELECT activity_id::text AS activity_id, fact_date, amount_minor::bigint AS amount_minor,
    coalesce(currency, '') AS currency, coalesce(journey_ref, '') AS journey_ref
FROM performance_facts
WHERE stage = 'revenue' AND NOT held AND replaced_by_id IS NULL
    AND fact_date BETWEEN make_date(sqlc.arg(year)::int, 1, 1) AND make_date(sqlc.arg(year)::int, 12, 31)
    AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
    AND (activity_id = ANY(sqlc.arg(activity_ids)::text[])
        OR journey_ref IN (
            SELECT journey_ref FROM performance_facts
            WHERE activity_id = ANY(sqlc.arg(activity_ids)::text[]) AND journey_ref IS NOT NULL
                AND NOT held AND replaced_by_id IS NULL
                AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
                    sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])))
ORDER BY fact_date, id;

-- name: AttributionTouches :many
SELECT DISTINCT journey_ref::text AS journey_ref, activity_id::text AS activity_id, fact_date
FROM performance_facts
WHERE journey_ref = ANY(sqlc.arg(journey_refs)::text[]) AND stage <> 'revenue' AND activity_id IS NOT NULL
    AND NOT held AND replaced_by_id IS NULL
    AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
ORDER BY journey_ref, fact_date, activity_id;
