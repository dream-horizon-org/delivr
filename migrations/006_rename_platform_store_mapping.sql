-- ============================================================================
-- Migration: Rename platform_store_mapping to Platform_StoreType_Mapping
-- Version: 006
-- Date: 2025-11-21
-- Description: Renames platform_store_mapping table to Platform_StoreType_Mapping
-- ============================================================================

USE codepushdb;

-- Rename the table
RENAME TABLE platform_store_mapping TO platform_store_type_mapping;

-- Verify the rename
SELECT 
  'platform_store_type_mapping' as table_name,
  COUNT(*) as row_count
FROM platform_store_type_mapping;

DESCRIBE platform_store_type_mapping;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

