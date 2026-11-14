-- name: MatchActivitiesByID :many
SELECT id AS activity_id, lower(id) AS key
FROM activities
WHERE lower(id) = ANY (sqlc.arg(keys)::text[])
    AND activity_in_scope(id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[]);

-- name: MatchActivitiesByMediaCode :many
SELECT c.activity_id, c.code::text AS key
FROM media_codes c
WHERE c.code = ANY (sqlc.arg(codes)::bigint[])
    AND activity_in_scope(c.activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[]);

-- name: MatchActivitiesByIntegrationID :many
SELECT k.activity_id, k.value AS key
FROM activity_integration_ids k
WHERE k.source_id = sqlc.arg(source_id)
    AND lower(k.value COLLATE "C") = ANY (sqlc.arg(keys)::text[])
    AND activity_in_scope(k.activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[]);

-- name: MatchActivitiesByExternalName :many
SELECT a.id AS activity_id, lower(a.external_name COLLATE "C") AS key
FROM activities a
WHERE a.external_name <> '' AND lower(a.external_name COLLATE "C") = ANY (sqlc.arg(keys)::text[])
    AND activity_in_scope(a.id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
UNION
SELECT n.activity_id, lower(n.name COLLATE "C") AS key
FROM activity_external_name_aliases n
WHERE lower(n.name COLLATE "C") = ANY (sqlc.arg(keys)::text[])
    AND activity_in_scope(n.activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[]);

-- External names and aliases share one namespace, so a key never resolves to two activities.
-- name: ExternalNameHolders :many
SELECT a.id AS activity_id
FROM activities a
WHERE a.external_name <> '' AND lower(a.external_name COLLATE "C") = lower(sqlc.arg(name)::text COLLATE "C")
UNION
SELECT n.activity_id
FROM activity_external_name_aliases n
WHERE lower(n.name COLLATE "C") = lower(sqlc.arg(name)::text COLLATE "C");

-- name: ActivityKeyFacts :one
SELECT a.external_name, coalesce(a.mql IS NOT NULL OR a.revenue_minor IS NOT NULL, false)::boolean AS goal_entered
FROM activities a
WHERE a.id = sqlc.arg(activity_id)
    AND activity_in_scope(a.id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[]);
