-- name: ListPerformanceImports :many
SELECT sqlc.embed(performance_imports)
FROM performance_imports
WHERE (sqlc.narg(id)::text IS NULL OR id = sqlc.narg(id))
    AND (sqlc.narg(source_id)::text IS NULL OR source_id = sqlc.narg(source_id))
    AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
    AND (sqlc.narg(since)::timestamptz IS NULL OR created_at >= sqlc.narg(since))
    AND (sqlc.narg(until)::timestamptz IS NULL OR created_at <= sqlc.narg(until))
    AND (sqlc.narg(search)::text IS NULL
         OR file_name ILIKE '%' || sqlc.narg(search) || '%'
         OR created_by_name ILIKE '%' || sqlc.narg(search) || '%')
ORDER BY created_at DESC, id COLLATE "C"
LIMIT sqlc.arg(max_imports);

-- name: PutPerformanceImport :exec
INSERT INTO performance_imports (
    id, source_id, file_name, origin, status, data_through, rows_read, rows_matched, rows_held,
    rows_unattributed, rows_rejected, rows_unmatched,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
ON CONFLICT (id) DO UPDATE SET
    status = excluded.status, version = excluded.version, updated_at = excluded.updated_at,
    updated_by_id = excluded.updated_by_id, updated_by_name = excluded.updated_by_name;

-- name: ListPerformanceReviewRows :many
SELECT sqlc.embed(performance_review_rows), s.name AS source_name
FROM performance_review_rows
JOIN performance_sources s ON s.id = performance_review_rows.source_id
WHERE (sqlc.narg(status)::text IS NULL OR performance_review_rows.status = sqlc.narg(status))
    AND (sqlc.narg(status_not)::text IS NULL OR performance_review_rows.status <> sqlc.narg(status_not))
    AND (sqlc.narg(source_id)::text IS NULL OR performance_review_rows.source_id = sqlc.narg(source_id))
    AND (sqlc.narg(id)::text IS NULL OR performance_review_rows.id = sqlc.narg(id))
    AND (sqlc.narg(import_id)::text IS NULL OR performance_review_rows.import_id = sqlc.narg(import_id))
    AND (sqlc.narg(reason)::text IS NULL OR performance_review_rows.reason = sqlc.narg(reason))
    AND (sqlc.narg(key_text)::text IS NULL
         OR EXISTS (SELECT 1 FROM json_each_text(performance_review_rows.raw) kv
                    WHERE kv.value ILIKE '%' || sqlc.narg(key_text) || '%'))
    AND (sqlc.narg(since)::timestamptz IS NULL OR performance_review_rows.created_at >= sqlc.narg(since))
    AND (sqlc.narg(until)::timestamptz IS NULL OR performance_review_rows.created_at <= sqlc.narg(until))
ORDER BY performance_review_rows.created_at DESC, performance_review_rows.id COLLATE "C"
LIMIT sqlc.arg(max_rows);

-- name: PutPerformanceReviewRow :exec
INSERT INTO performance_review_rows (
    id, import_id, source_id, raw, parsed, reason, faults, candidates, status, comment,
    version, created_at, created_by_id, created_by_name, updated_at, updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
ON CONFLICT (id) DO UPDATE SET
    parsed = excluded.parsed, reason = excluded.reason, faults = excluded.faults,
    candidates = excluded.candidates,
    status = excluded.status, comment = excluded.comment, version = excluded.version,
    updated_at = excluded.updated_at, updated_by_id = excluded.updated_by_id,
    updated_by_name = excluded.updated_by_name;

-- name: PutPerformanceImportBreakdown :exec
INSERT INTO performance_import_breakdown (
    import_id, stage, web_metric, rows_read, rows_matched, rows_held,
    rows_unattributed, rows_rejected, rows_unmatched
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (import_id, stage, web_metric) DO UPDATE SET
    rows_read = excluded.rows_read, rows_matched = excluded.rows_matched,
    rows_held = excluded.rows_held, rows_unattributed = excluded.rows_unattributed,
    rows_rejected = excluded.rows_rejected, rows_unmatched = excluded.rows_unmatched;

-- name: DeletePerformanceImportBreakdown :exec
DELETE FROM performance_import_breakdown WHERE import_id = sqlc.arg(import_id);

-- name: ListPerformanceImportBreakdown :many
SELECT * FROM performance_import_breakdown
WHERE import_id = ANY(sqlc.arg(import_ids)::text[])
ORDER BY import_id COLLATE "C", stage COLLATE "C", web_metric COLLATE "C";

-- name: ListCurrencyCodes :many
SELECT code FROM currencies ORDER BY code;

-- name: LatestImportStatuses :many
SELECT DISTINCT ON (source_id) source_id, status
FROM performance_imports
WHERE source_id = ANY(sqlc.arg(source_ids)::text[])
ORDER BY source_id, created_at DESC, id COLLATE "C" DESC;
