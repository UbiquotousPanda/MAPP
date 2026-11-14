-- +goose Up
-- Feature 059: every saved report view moves to its report among the five; a clashing name gets its old report's name.
-- The person's deferred foreign key is checked at once, so the last ALTER TABLE has no trigger events pending.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE report_views DROP CONSTRAINT report_views_report_check;

CREATE TEMPORARY TABLE report_moves (old_key text PRIMARY KEY, new_key text NOT NULL, rank integer NOT NULL,
    old_name text NOT NULL);
INSERT INTO report_moves VALUES
    ('planBudget', 'budget', 1, 'Plan budget'),
    ('approvals', 'approvals', 1, 'Approvals'),
    ('revenue', 'performance', 1, 'Revenue'),
    ('summary', 'performance', 2, 'Summary'),
    ('funnel', 'performance', 3, 'Funnel stages'),
    ('purchaseRequests', 'purchasing', 1, 'Purchase requests'),
    ('gsapLink', 'purchasing', 2, 'GSAP link'),
    ('planDetails', 'planData', 1, 'Plan details'),
    ('userAccess', 'planData', 2, 'User access');

WITH defaults AS (
    SELECT v.id, row_number() OVER (PARTITION BY v.person_id, m.new_key
        ORDER BY v.updated_at DESC, substring(v.id FROM 4)::bigint DESC) AS n
    FROM report_views v JOIN report_moves m ON m.old_key = v.report
    WHERE v.is_default)
UPDATE report_views v SET is_default = false FROM defaults d WHERE v.id = d.id AND d.n > 1;

UPDATE report_views v
SET name = rtrim(left(v.name, 60 - char_length(' (' || m.old_name || ')'))) || ' (' || m.old_name || ')'
FROM report_moves m
WHERE m.old_key = v.report AND EXISTS (
    SELECT 1 FROM report_views o JOIN report_moves om ON om.old_key = o.report
    WHERE o.person_id = v.person_id AND om.new_key = m.new_key AND om.rank < m.rank
        AND lower(o.name COLLATE "C") = lower(v.name COLLATE "C"));
UPDATE report_views v SET name = rtrim(left(v.name, 59 - char_length(v.id))) || ' ' || v.id
FROM report_moves m
WHERE m.old_key = v.report AND EXISTS (
    SELECT 1 FROM report_views o JOIN report_moves om ON om.old_key = o.report
    WHERE o.person_id = v.person_id AND om.new_key = m.new_key AND (om.rank, o.id) < (m.rank, v.id)
        AND lower(o.name COLLATE "C") = lower(v.name COLLATE "C"));

UPDATE report_views
SET query = trim(BOTH '&' FROM regexp_replace('&' || query || '&', '&(stage|revenueBy|performanceBy|costBy|roiBy)=[^&]*',
    '', 'g'))
WHERE report = 'summary';
UPDATE report_views SET query = concat_ws('&', nullif(query, ''), 'stage=inq')
WHERE report = 'funnel' AND query !~ '(^|&)stage=' AND char_length(query) <= 3990;
UPDATE report_views SET query = concat_ws('&', nullif(query, ''), 'tab=swbs')
WHERE report = 'gsapLink' AND query !~ '(^|&)tab=' AND char_length(query) <= 3990;
UPDATE report_views SET query = concat_ws('&', nullif(query, ''), 'tab=people')
WHERE report = 'userAccess' AND char_length(query) <= 3990;

UPDATE report_views v SET report = m.new_key FROM report_moves m WHERE m.old_key = v.report;
DROP TABLE report_moves;

ALTER TABLE report_views ADD CONSTRAINT report_views_report_check
    CHECK (report IN ('performance', 'budget', 'purchasing', 'approvals', 'planData'));
