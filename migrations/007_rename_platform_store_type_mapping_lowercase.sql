-- ============================================================================
-- Migration: Rename Platform_StoreType_Mapping to platform_store_type_mapping
-- Version: 007
-- Date: 2025-11-21
-- Description: Renames Platform_StoreType_Mapping table to lowercase platform_store_type_mapping
-- ============================================================================

USE codepushdb;

-- Rename the table to lowercase
RENAME TABLE Platform_StoreType_Mapping TO platform_store_type_mapping;

-- Verify the rename
SELECT 
  'platform_store_type_mapping' as table_name,
  COUNT(*) as row_count
FROM platform_store_type_mapping;

DESCRIBE platform_store_type_mapping;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

