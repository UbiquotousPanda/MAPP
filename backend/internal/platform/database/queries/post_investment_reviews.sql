-- name: ListPostInvestmentReviews :many
SELECT id, activity_id, status, business_case, currency, amount_spent_minor, margin_minor, remarks, submitted_at,
    submitted_by_id, submitted_by_name, version, created_at, created_by_id, created_by_name, updated_at,
    updated_by_id, updated_by_name
FROM post_investment_reviews
WHERE (sqlc.narg(activity_id)::text IS NULL OR activity_id = sqlc.narg(activity_id))
ORDER BY updated_at DESC, length(id) DESC, id COLLATE "C" DESC;

-- name: GetPostInvestmentReview :one
SELECT id, activity_id, status, business_case, currency, amount_spent_minor, margin_minor, remarks, submitted_at,
    submitted_by_id, submitted_by_name, version, created_at, created_by_id, created_by_name, updated_at,
    updated_by_id, updated_by_name
FROM post_investment_reviews
WHERE id = $1;

-- name: ListPostInvestmentReviewIDsOfActivity :many
SELECT id FROM post_investment_reviews WHERE activity_id = $1 ORDER BY length(id), id COLLATE "C";

-- name: InsertPostInvestmentReview :exec
INSERT INTO post_investment_reviews (
    id, activity_id, status, business_case, currency, amount_spent_minor, margin_minor, remarks, submitted_at,
    submitted_by_id, submitted_by_name, version, created_at, created_by_id, created_by_name, updated_at,
    updated_by_id, updated_by_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);

-- name: UpdatePostInvestmentReview :execrows
UPDATE post_investment_reviews
SET status = $2, business_case = $3, currency = $4, amount_spent_minor = $5, margin_minor = $6, remarks = $7,
    submitted_at = $8, submitted_by_id = $9, submitted_by_name = $10, version = $11, updated_at = $12,
    updated_by_id = $13, updated_by_name = $14
WHERE id = $1 AND version = sqlc.arg(previous_version)::integer;

-- name: DeletePostInvestmentReview :exec
DELETE FROM post_investment_reviews WHERE id = $1;
