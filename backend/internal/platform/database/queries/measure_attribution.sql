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
SELECT f.id, f.source_reference, s.name AS source_name, f.activity_id::text AS activity_id, f.fact_date,
    f.amount_minor::bigint AS amount_minor, coalesce(f.currency, '') AS currency, coalesce(f.journey_ref, '') AS journey_ref
FROM performance_facts f
JOIN performance_sources s ON s.id = f.source_id
WHERE f.stage = 'revenue' AND NOT f.held AND f.replaced_by_id IS NULL
    AND f.fact_date BETWEEN make_date(sqlc.arg(year)::int, 1, 1) AND make_date(sqlc.arg(year)::int, 12, 31)
    AND activity_in_scope(f.activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
    AND (f.activity_id = ANY(sqlc.arg(activity_ids)::text[])
        OR f.journey_ref IN (
            SELECT journey_ref FROM performance_facts
            WHERE activity_id = ANY(sqlc.arg(activity_ids)::text[]) AND journey_ref IS NOT NULL
                AND NOT held AND replaced_by_id IS NULL
                AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
                    sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])))
ORDER BY f.fact_date, f.id;

-- name: AttributionTouches :many
SELECT DISTINCT journey_ref::text AS journey_ref, activity_id::text AS activity_id, fact_date, stage, web_metric
FROM performance_facts
WHERE journey_ref = ANY(sqlc.arg(journey_refs)::text[]) AND stage <> 'revenue' AND activity_id IS NOT NULL
    AND NOT held AND replaced_by_id IS NULL
    AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
ORDER BY journey_ref, fact_date, activity_id, stage, web_metric;

-- name: AttributionHeldFacts :one
SELECT count(*)::int AS held_facts
FROM performance_facts
WHERE held AND replaced_by_id IS NULL
    AND (journey_ref = ANY(sqlc.arg(journey_refs)::text[]) OR activity_id = sqlc.arg(activity_id)::text)
    AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[]);

-- name: AttributionActivityNames :many
SELECT a.id, a.name, a.status, p.id AS plan_id, p.name AS plan_name
FROM activities a
JOIN initiatives i ON i.id = a.initiative_id
JOIN campaigns c ON c.id = i.campaign_id
JOIN plans p ON p.id = c.plan_id
WHERE a.id = ANY(sqlc.arg(activity_ids)::text[])
    AND activity_in_scope(a.id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
ORDER BY a.id;
