-- Rollback Migration: Unified Architecture
-- Date: 2025-11-08
-- WARNING: This will remove data! Only use for development rollback.

-- Revert to legacy permission enum (if rolling back)
ALTER TABLE collaborators
  MODIFY COLUMN permission ENUM('Collaborator', 'Owner') DEFAULT NULL;

ALTER TABLE collaborators
  DROP COLUMN IF EXISTS isCreator;

-- Make appId non-nullable again (if needed)
-- ALTER TABLE collaborators MODIFY COLUMN appId VARCHAR(255) NOT NULL;

-- Remove tenantId from collaborators
ALTER TABLE collaborators
  DROP FOREIGN KEY IF EXISTS collaborators_ibfk_3;

ALTER TABLE collaborators
  DROP COLUMN IF EXISTS tenantId;

-- Remove OAuth and profile fields from accounts
ALTER TABLE accounts DROP COLUMN IF EXISTS picture;
ALTER TABLE accounts DROP COLUMN IF EXISTS microsoftId;
ALTER TABLE accounts DROP COLUMN IF EXISTS gitHubId;
ALTER TABLE accounts DROP COLUMN IF EXISTS azureAdId;
ALTER TABLE accounts DROP COLUMN IF EXISTS ssoId;

SELECT 'Rollback completed: Unified architecture removed' AS status;

