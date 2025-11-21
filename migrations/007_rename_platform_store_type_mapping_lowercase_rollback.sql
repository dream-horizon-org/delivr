-- ============================================================================
-- Rollback: Rename platform_store_type_mapping back to Platform_StoreType_Mapping
-- Version: 007 (Rollback)
-- Date: 2025-11-21
-- ============================================================================

USE codepushdb;

-- Rename the table back
RENAME TABLE platform_store_type_mapping TO Platform_StoreType_Mapping;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

