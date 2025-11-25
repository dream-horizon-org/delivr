CREATE TABLE IF NOT EXISTS build (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  artifact_version_code VARCHAR(255) NOT NULL,
  artifact_version_name VARCHAR(255) NOT NULL,
  artifact_path VARCHAR(255) NULL,
  release_id VARCHAR(255) NOT NULL,
  platform ENUM('ANDROID', 'IOS') NOT NULL COMMENT 'Platform type',
  storeType ENUM('APP_STORE', 'PLAY_STORE', 'TESTFLIGHT', 'MICROSOFT_STORE', 'FIREBASE') NOT NULL COMMENT 'Store provider type',
  regression_id VARCHAR(255) NULL,
  ci_run_id VARCHAR(255) NULL,
  build_upload_status ENUM('PENDING', 'UPLOADED', 'FAILED') NOT NULL COMMENT 'Build upload status',
  build_type ENUM('MANUAL', 'CI_CD') NOT NULL COMMENT 'Build type',
  queue_location VARCHAR(255) NULL COMMENT 'Queue location',
  queue_status ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NULL COMMENT 'Queue status',
  ci_run_type ENUM('JENKINS', 'GITHUB_ACTIONS', 'CIRCLE_CI', 'GITLAB_CI') NULL COMMENT 'CI/CD provider type'
)