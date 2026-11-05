-- +goose Up
-- Demo feedback #6: release in GSAP right after approval in SP&A One; on for rows that already exist, and a
-- missing row reads as the defaults (on).
ALTER TABLE purchase_request_configuration
    ADD COLUMN release_in_gsap boolean NOT NULL DEFAULT true;
