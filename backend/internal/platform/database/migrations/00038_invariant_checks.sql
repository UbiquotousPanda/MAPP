-- +goose Up
UPDATE activities SET end_date = NULL WHERE ongoing AND end_date IS NOT NULL;
ALTER TABLE activities
    ADD CONSTRAINT activities_dates_check CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
    ADD CONSTRAINT activities_ongoing_check CHECK (NOT ongoing OR end_date IS NULL);

ALTER TABLE plans
    ADD CONSTRAINT plans_budget_minor_check CHECK (budget_minor >= 0),
    ADD CONSTRAINT plans_year_check CHECK (year BETWEEN 2000 AND 2100),
    ADD CONSTRAINT plans_goal_amount_check CHECK (goal_amount ~ '^([0-9]+(\.[0-9]{1,2})?)?$');
ALTER TABLE plan_phasing_months ADD CONSTRAINT plan_phasing_months_amount_check CHECK (amount_minor >= 0);
ALTER TABLE campaign_phasing_months ADD CONSTRAINT campaign_phasing_months_amount_check CHECK (amount_minor >= 0);
ALTER TABLE initiative_phasing_months
    ADD CONSTRAINT initiative_phasing_months_amount_check CHECK (amount_minor >= 0);

ALTER TABLE global_budgets ADD CONSTRAINT global_budgets_year_check CHECK (year BETWEEN 2000 AND 2100);
ALTER TABLE finance_budgets ADD CONSTRAINT finance_budgets_year_check CHECK (year BETWEEN 2000 AND 2100);
ALTER TABLE line_items
    ADD CONSTRAINT line_items_finance_budget_year_check CHECK (finance_budget_year BETWEEN 2000 AND 2100),
    ADD CONSTRAINT line_items_contracted_amount_minor_check CHECK (contracted_amount_minor >= 0);

-- An allocation whose global budget is gone is left out by the plan's restore, so deleting one never needs a cascade.
ALTER TABLE budget_allocations ADD CONSTRAINT budget_allocations_global_budget_id_fkey
    FOREIGN KEY (global_budget_id) REFERENCES global_budgets (id) DEFERRABLE INITIALLY DEFERRED;

-- A purchase request and its modification share one numbering on purpose, so the kind is tied to the id instead.
ALTER TABLE approval_rounds ADD CONSTRAINT approval_rounds_subject_kind_check
    CHECK ((subject_kind = 'activity') = (subject_id ~ '^A-[0-9]+$'));
