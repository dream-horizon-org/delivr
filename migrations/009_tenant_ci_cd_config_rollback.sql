-- ============================================================================
-- Rollback: Tenant CI/CD Config
-- ============================================================================
ALTER TABLE tenant_ci_cd_config
  DROP FOREIGN KEY fk_ci_cd_config_tenant,
  DROP FOREIGN KEY fk_ci_cd_config_created_by;

DROP TABLE IF EXISTS tenant_ci_cd_config;


