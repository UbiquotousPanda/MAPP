-- +goose Up
-- Binning deletes rows: a superseded fact stays superseded and an import stays with its binned plan.
ALTER TABLE performance_facts DROP CONSTRAINT performance_facts_replaced_by_id_fkey;
ALTER TABLE plan_imports DROP CONSTRAINT plan_imports_plan_id_fkey;
