-- Migration: Add project_id to test_management_configs table (MySQL 5.7)
-- Description: Add projectId field to store Checkmate project ID for metadata fetching and UI display
-- Date: 2025-11-25

ALTER TABLE test_management_configs 
ADD COLUMN project_id INT NULL 
COMMENT 'Checkmate project ID for metadata fetching and UI display'
AFTER name;

