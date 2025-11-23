-- ============================================================================
-- Rollback: Rename Platform_StoreType_Mapping back to platform_store_mapping
-- Version: 006 (Rollback)
-- Date: 2025-11-21
-- ============================================================================

USE codepushdb;

-- Rename the table back
RENAME TABLE platform_store_type_mapping TO platform_store_mapping;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================

