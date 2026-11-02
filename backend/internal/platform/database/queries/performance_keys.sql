-- name: ListMediaCodesForActivity :many
SELECT sqlc.embed(media_codes)
FROM media_codes
WHERE activity_id = sqlc.arg(activity_id)
    AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
ORDER BY code;

-- Creates the configuration row on first use, so a fresh database does not need a seeded singleton, and
-- raises the counter in the same statement, so two codes can never take the same number.
-- name: TakeNextMediaCode :one
INSERT INTO performance_configuration (
    id, media_code_next, code_attributes,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ('performance', sqlc.arg(start_at)::bigint + 1, '[]',
    1, sqlc.arg(updated_at), sqlc.arg(updated_by_id), sqlc.arg(updated_by_name),
    sqlc.arg(updated_at), sqlc.arg(updated_by_id), sqlc.arg(updated_by_name))
ON CONFLICT (id) DO UPDATE SET
    media_code_next = performance_configuration.media_code_next + 1,
    version = performance_configuration.version + 1,
    updated_at = excluded.updated_at, updated_by_id = excluded.updated_by_id,
    updated_by_name = excluded.updated_by_name
RETURNING (performance_configuration.media_code_next - 1)::bigint AS code;

-- name: PutMediaCode :exec
INSERT INTO media_codes (
    id, code, activity_id, attributes, landing_page, status,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT (id) DO UPDATE SET
    attributes = excluded.attributes, landing_page = excluded.landing_page, status = excluded.status,
    version = excluded.version, updated_at = excluded.updated_at,
    updated_by_id = excluded.updated_by_id, updated_by_name = excluded.updated_by_name;

-- name: PutIntegrationID :exec
INSERT INTO activity_integration_ids (
    id, activity_id, source_id, value,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (id) DO UPDATE SET
    value = excluded.value, version = excluded.version, updated_at = excluded.updated_at,
    updated_by_id = excluded.updated_by_id, updated_by_name = excluded.updated_by_name;

-- The four queries below serve the recycle bin, not a person: history collects an activity's children
-- before deleting it, so they carry no scope filter.
-- name: FactIDsOfActivities :many
SELECT id FROM performance_facts WHERE activity_id = ANY (sqlc.arg(activity_ids)::text[]) ORDER BY id;

-- name: MediaCodeIDsOfActivities :many
SELECT id FROM media_codes WHERE activity_id = ANY (sqlc.arg(activity_ids)::text[]) ORDER BY id;

-- name: AliasIDsOfActivities :many
SELECT id FROM activity_external_name_aliases
WHERE activity_id = ANY (sqlc.arg(activity_ids)::text[]) ORDER BY id;

-- name: IntegrationIDsOfActivities :many
SELECT id FROM activity_integration_ids
WHERE activity_id = ANY (sqlc.arg(activity_ids)::text[]) ORDER BY id;

-- name: GetPerformanceFact :one
SELECT sqlc.embed(performance_facts) FROM performance_facts WHERE id = $1;

-- name: GetMediaCode :one
SELECT sqlc.embed(media_codes) FROM media_codes WHERE id = $1;

-- name: GetAlias :one
SELECT sqlc.embed(activity_external_name_aliases) FROM activity_external_name_aliases WHERE id = $1;

-- name: GetIntegrationID :one
SELECT sqlc.embed(activity_integration_ids) FROM activity_integration_ids WHERE id = $1;

-- name: DeletePerformanceFacts :exec
DELETE FROM performance_facts WHERE id = ANY (sqlc.arg(ids)::text[]);

-- name: DeleteMediaCodes :exec
DELETE FROM media_codes WHERE id = ANY (sqlc.arg(ids)::text[]);

-- name: DeleteAliases :exec
DELETE FROM activity_external_name_aliases WHERE id = ANY (sqlc.arg(ids)::text[]);

-- name: DeleteIntegrationIDs :exec
DELETE FROM activity_integration_ids WHERE id = ANY (sqlc.arg(ids)::text[]);

-- name: PutAlias :exec
INSERT INTO activity_external_name_aliases (
    id, activity_id, name,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (id) DO UPDATE SET
    name = excluded.name, version = excluded.version, updated_at = excluded.updated_at,
    updated_by_id = excluded.updated_by_id, updated_by_name = excluded.updated_by_name;

-- name: ListAliasesOfActivity :many
SELECT * FROM activity_external_name_aliases
WHERE activity_id = sqlc.arg(activity_id)
ORDER BY name COLLATE "C";

-- name: ListIntegrationIDsOfActivity :many
SELECT * FROM activity_integration_ids
WHERE activity_id = sqlc.arg(activity_id)
ORDER BY source_id COLLATE "C";

-- name: DeleteIntegrationID :execrows
DELETE FROM activity_integration_ids
WHERE activity_id = sqlc.arg(activity_id) AND source_id = sqlc.arg(source_id);

-- name: DeleteAlias :execrows
DELETE FROM activity_external_name_aliases
WHERE id = sqlc.arg(id) AND activity_id = sqlc.arg(activity_id);

-- name: MediaCodeUsed :one
SELECT EXISTS (
    SELECT 1 FROM performance_facts
    WHERE matched_on = 'mediaCode' AND matched_key = sqlc.arg(code)::text
)::boolean AS used;

-- name: GetPerformanceConfiguration :one
SELECT * FROM performance_configuration WHERE id = 'performance';

-- name: PutPerformanceConfiguration :exec
INSERT INTO performance_configuration (
    id, media_code_next, code_attributes,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ('performance', $1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (id) DO UPDATE SET
    media_code_next = excluded.media_code_next, code_attributes = excluded.code_attributes,
    version = excluded.version, updated_at = excluded.updated_at,
    updated_by_id = excluded.updated_by_id, updated_by_name = excluded.updated_by_name;

-- name: ListCodeActivityTypes :many
SELECT activity_type_id FROM performance_code_activity_types ORDER BY activity_type_id COLLATE "C";

-- name: ClearCodeActivityTypes :exec
DELETE FROM performance_code_activity_types;

-- name: AddCodeActivityType :exec
INSERT INTO performance_code_activity_types (activity_type_id) VALUES ($1) ON CONFLICT DO NOTHING;
