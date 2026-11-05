-- +goose Up
ALTER TABLE line_items
    ADD COLUMN approval text NOT NULL DEFAULT 'notApproved' CHECK (approval IN ('approved', 'notApproved'));

UPDATE line_items li
SET approval = 'approved'
FROM activities a
WHERE a.id = li.activity_id AND a.status = 'approved';

-- line_item_ids is empty for a round of the whole record; a round for some line items holds back only its own.
ALTER TABLE approval_rounds
    ADD COLUMN line_item_ids text[] NOT NULL DEFAULT '{}',
    ADD COLUMN held_back_line_item_ids text[] NOT NULL DEFAULT '{}',
    ADD CONSTRAINT approval_rounds_held_back_check
        CHECK (cardinality(line_item_ids) = 0 OR held_back_line_item_ids <@ line_item_ids);

-- +goose Down
ALTER TABLE approval_rounds
    DROP CONSTRAINT approval_rounds_held_back_check,
    DROP COLUMN held_back_line_item_ids,
    DROP COLUMN line_item_ids;

ALTER TABLE line_items DROP COLUMN approval;
