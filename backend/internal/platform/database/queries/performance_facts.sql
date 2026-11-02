-- name: ListFactsForActivity :many
SELECT sqlc.embed(performance_facts), s.name AS source_name
FROM performance_facts
JOIN performance_sources s ON s.id = performance_facts.source_id
WHERE performance_facts.activity_id = sqlc.arg(activity_id)
    AND performance_facts.replaced_by_id IS NULL
    AND (NOT sqlc.arg(counted_only)::boolean OR NOT performance_facts.held)
    AND (sqlc.narg(search)::text IS NULL
         OR s.name ILIKE '%' || sqlc.narg(search) || '%'
         OR performance_facts.stage ILIKE '%' || sqlc.narg(search) || '%'
         OR performance_facts.web_metric ILIKE '%' || sqlc.narg(search) || '%'
         OR performance_facts.matched_on ILIKE '%' || sqlc.narg(search) || '%'
         OR performance_facts.import_id ILIKE '%' || sqlc.narg(search) || '%'
         OR performance_facts.source_reference ILIKE '%' || sqlc.narg(search) || '%')
    AND activity_in_scope(performance_facts.activity_id, sqlc.arg(sees_everything)::boolean,
        sqlc.arg(viewer_id)::text, sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
ORDER BY performance_facts.fact_date DESC, performance_facts.id COLLATE "C"
LIMIT sqlc.arg(max_rows);

-- name: ReleaseHeldFactsForActivity :execrows
UPDATE performance_facts
SET held = false, version = version + 1, updated_at = sqlc.arg(updated_at),
    updated_by_id = sqlc.arg(updated_by_id), updated_by_name = sqlc.arg(updated_by_name)
WHERE activity_id = sqlc.arg(activity_id) AND held;

-- name: HoldFactsForActivity :execrows
-- A replaced fact is never shown, so it never comes back held.
UPDATE performance_facts
SET held = true, version = version + 1, updated_at = sqlc.arg(updated_at),
    updated_by_id = sqlc.arg(updated_by_id), updated_by_name = sqlc.arg(updated_by_name)
WHERE activity_id = sqlc.arg(activity_id) AND NOT held AND replaced_by_id IS NULL;

-- name: PutPerformanceFact :exec
INSERT INTO performance_facts (
    id, source_id, import_id, source_reference, activity_id, matched_on, matched_key, fact_date, stage, web_metric,
    count_value, amount_minor, currency, journey_ref, held, replaced_by_id,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
ON CONFLICT (id) DO UPDATE SET
    activity_id = excluded.activity_id, matched_on = excluded.matched_on, held = excluded.held,
    replaced_by_id = excluded.replaced_by_id, version = excluded.version, updated_at = excluded.updated_at,
    updated_by_id = excluded.updated_by_id, updated_by_name = excluded.updated_by_name;

-- name: CurrentFactsByReferences :many
SELECT sqlc.embed(performance_facts)
FROM performance_facts
WHERE source_id = sqlc.arg(source_id) AND source_reference = ANY(sqlc.arg(source_references)::text[])
    AND replaced_by_id IS NULL
ORDER BY source_reference COLLATE "C", stage COLLATE "C", web_metric COLLATE "C";

-- name: ListFactsOfImport :many
SELECT sqlc.embed(performance_facts)
FROM performance_facts
WHERE import_id = sqlc.arg(import_id)
ORDER BY id COLLATE "C";

-- name: FactsReplacedBy :many
SELECT sqlc.embed(performance_facts)
FROM performance_facts
WHERE replaced_by_id = ANY(sqlc.arg(replacer_ids)::text[])
ORDER BY id COLLATE "C";

-- name: FactTotalsBySource :many
SELECT f.source_id, s.name AS source_name, count(*) AS fact_count, max(f.fact_date)::date AS last_fact_date
FROM performance_facts f
JOIN performance_sources s ON s.id = f.source_id
WHERE f.activity_id = sqlc.arg(activity_id)::text AND f.replaced_by_id IS NULL
GROUP BY f.source_id, s.name
ORDER BY s.name COLLATE "C", f.source_id;

-- name: HeldActivityIDsOfSource :many
SELECT DISTINCT activity_id::text
FROM performance_facts
WHERE source_id = sqlc.arg(source_id) AND held AND replaced_by_id IS NULL AND activity_id IS NOT NULL
ORDER BY activity_id::text;

-- name: ActivityFactTotals :many
SELECT stage, web_metric, date_trunc('month', fact_date)::date AS month, coalesce(currency, '') AS currency,
    coalesce(sum(count_value), 0)::bigint AS counts, coalesce(sum(amount_minor), 0)::bigint AS amount_minor,
    count(*) AS fact_count
FROM performance_facts
WHERE activity_id = sqlc.arg(activity_id)::text AND NOT held AND replaced_by_id IS NULL
    AND fact_date BETWEEN make_date(sqlc.arg(year)::int, 1, 1) AND make_date(sqlc.arg(year)::int, 12, 31)
    AND activity_in_scope(activity_id, sqlc.arg(sees_everything)::boolean, sqlc.arg(viewer_id)::text,
        sqlc.arg(views_plans)::boolean, sqlc.arg(viewer_team_ids)::text[])
GROUP BY stage, web_metric, month, currency
ORDER BY stage COLLATE "C", web_metric COLLATE "C", month, currency COLLATE "C";
