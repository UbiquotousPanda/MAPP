-- +goose Up
-- A workflow with rounds is in use and never deleted; the round keeps the workflow's name for its history.
ALTER TABLE approval_rounds ADD CONSTRAINT approval_rounds_workflow_fk
    FOREIGN KEY (workflow_id) REFERENCES approval_workflows (id) DEFERRABLE INITIALLY DEFERRED;
