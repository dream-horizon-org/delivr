-- ============================================================================
-- Migration: Add platform column to store_integrations table
-- Version: 008
-- Date: 2025-11-21
-- Description: Adds platform column (ANDROID/IOS) to store_integrations table
-- ============================================================================

USE codepushdb;

-- Add platform column
ALTER TABLE store_integrations
ADD COLUMN platform ENUM('ANDROID', 'IOS') NOT NULL COMMENT 'Platform type (Android or iOS)' 
AFTER storeType;

-- Add index for platform for better query performance
CREATE INDEX idx_store_integrations_platform ON store_integrations(platform);

-- Verify the change
DESCRIBE store_integrations;

SELECT 
  'store_integrations' as table_name,
  COUNT(*) as row_count
FROM store_integrations;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

