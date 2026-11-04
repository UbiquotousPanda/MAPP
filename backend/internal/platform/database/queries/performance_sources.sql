-- name: ListPerformanceSources :many
SELECT sqlc.embed(performance_sources),
    (SELECT count(*) FROM performance_facts f WHERE f.source_id = performance_sources.id)::integer AS fact_count
FROM performance_sources
WHERE sqlc.narg(id)::text IS NULL OR performance_sources.id = sqlc.narg(id)
ORDER BY lower(performance_sources.name COLLATE "C"), performance_sources.id COLLATE "C";

-- Freshness is derived, and a source that has never loaded simply has no row here, so nothing is NULL.
-- name: SourceFreshness :many
SELECT i.source_id, max(i.created_at)::timestamptz AS last_loaded_at, max(i.data_through)::date AS data_through
FROM performance_imports i
WHERE i.status = 'completed' AND i.data_through IS NOT NULL
GROUP BY i.source_id;

-- name: PutPerformanceSource :exec
INSERT INTO performance_sources (
    id, name, description, owner_id, category, status, delivery_route, cadence, integration_id,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
ON CONFLICT (id) DO UPDATE SET
    name = excluded.name, description = excluded.description, owner_id = excluded.owner_id,
    category = excluded.category, status = excluded.status, delivery_route = excluded.delivery_route,
    cadence = excluded.cadence, integration_id = excluded.integration_id, version = excluded.version,
    updated_at = excluded.updated_at, updated_by_id = excluded.updated_by_id,
    updated_by_name = excluded.updated_by_name;

-- name: PerformanceSourceUse :one
SELECT
    (SELECT count(*) FROM performance_facts f WHERE f.source_id = sqlc.arg(source_id))::integer AS facts,
    (SELECT count(*) FROM performance_imports i WHERE i.source_id = sqlc.arg(source_id))::integer AS imports,
    (SELECT count(*) FROM performance_review_rows r WHERE r.source_id = sqlc.arg(source_id))::integer AS review_rows,
    (SELECT count(*) FROM activity_integration_ids k WHERE k.source_id = sqlc.arg(source_id))::integer AS integration_ids;

-- name: DeletePerformanceSource :execrows
DELETE FROM performance_sources
WHERE performance_sources.id = sqlc.arg(source_id)
    AND NOT EXISTS (SELECT 1 FROM performance_facts f WHERE f.source_id = performance_sources.id)
    AND NOT EXISTS (SELECT 1 FROM performance_imports i WHERE i.source_id = performance_sources.id)
    AND NOT EXISTS (SELECT 1 FROM performance_review_rows r WHERE r.source_id = performance_sources.id)
    AND NOT EXISTS (SELECT 1 FROM activity_integration_ids k WHERE k.source_id = performance_sources.id);

-- name: ListPerformanceMappings :many
-- An empty or null source_ids means every source's mappings.
SELECT sqlc.embed(performance_source_mappings)
FROM performance_source_mappings
WHERE sqlc.arg(source_ids)::text[] IS NULL OR cardinality(sqlc.arg(source_ids)::text[]) = 0
    OR source_id = ANY (sqlc.arg(source_ids)::text[])
ORDER BY source_id COLLATE "C", lower(column_name COLLATE "C");

-- name: ActiveSuppliersForModel :many
SELECT m.id, m.source_id, m.meaning, m.stage, s.name AS source_name
FROM performance_source_mappings m
JOIN performance_sources s ON s.id = m.source_id
WHERE m.model_id = sqlc.arg(model_id)
    AND m.meaning = ANY (ARRAY['stage', 'revenue'])
    AND s.status = 'active'
ORDER BY m.id COLLATE "C";

-- name: PutPerformanceMapping :exec
INSERT INTO performance_source_mappings (
    id, source_id, column_name, meaning, key_type, stage, web_metric, model_id,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
ON CONFLICT (id) DO UPDATE SET
    column_name = excluded.column_name, meaning = excluded.meaning, key_type = excluded.key_type,
    stage = excluded.stage,
    web_metric = excluded.web_metric, model_id = excluded.model_id, version = excluded.version,
    updated_at = excluded.updated_at, updated_by_id = excluded.updated_by_id,
    updated_by_name = excluded.updated_by_name;

-- name: DeletePerformanceMapping :exec
DELETE FROM performance_source_mappings WHERE id = $1;
