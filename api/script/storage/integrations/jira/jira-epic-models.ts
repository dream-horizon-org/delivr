/**
 * Jira Epic Sequelize Models
 * 
 * Re-exports models from jira-integration-models.ts for backward compatibility
 */

import { Sequelize, ModelStatic, Model } from 'sequelize';

// Re-export from the new unified models file
export { 
  createReleaseJiraEpicsModel,
  createJiraIntegrationsModel,
  createJiraConfigurationsModel
} from './jira-integration-models';

/**
 * @deprecated Use createReleaseJiraEpicsModel from jira-integration-models.ts
 * This function is kept for backward compatibility
 */
export function createReleaseJiraEpicsModelLegacy(sequelize: Sequelize): ModelStatic<Model<any, any>> {
  const { createReleaseJiraEpicsModel } = require('./jira-integration-models');
  return createReleaseJiraEpicsModel(sequelize);
}

