-- +goose Up
-- ADR-0022: the read-only views a module publishes so that another module's queries never read its tables.
-- people publishes the teams and who belongs to them, for the dashboard and dataset shares (051).
CREATE VIEW teams_view AS
SELECT id FROM teams;

CREATE VIEW team_members_view AS
SELECT team_id, person_id FROM team_memberships;

-- lineitem publishes the plan each line item sits in, for financials' scoped reads of transactions (015).
CREATE VIEW line_item_plans_view AS
SELECT li.id AS line_item_id, c.plan_id
FROM line_items li
JOIN activities a ON a.id = li.activity_id
JOIN initiatives i ON i.id = a.initiative_id
JOIN campaigns c ON c.id = i.campaign_id;

-- +goose Down
DROP VIEW line_item_plans_view;
DROP VIEW team_members_view;
DROP VIEW teams_view;
