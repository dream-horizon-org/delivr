/**
 * Migration-related type definitions
 * Separated for type safety and reusability
 */

export interface MigrationConfig {
  database: string;
  username: string;
  password: string;
  host: string;
  port?: number;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  error?: Error;
}

export interface MigrationStep {
  up: string; // SQL for migration
  down: string; // SQL for rollback
  description: string;
}
