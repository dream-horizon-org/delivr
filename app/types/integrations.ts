/**
 * Integration Types
 * Defines all integration-related types and interfaces
 */

export enum IntegrationCategory {
  SOURCE_CONTROL = 'SOURCE_CONTROL',
  COMMUNICATION = 'COMMUNICATION',
  CI_CD = 'CI_CD',
  TEST_MANAGEMENT = 'TEST_MANAGEMENT',
  PROJECT_MANAGEMENT = 'PROJECT_MANAGEMENT',
  APP_DISTRIBUTION = 'APP_DISTRIBUTION'
}

export enum IntegrationStatus {
  CONNECTED = 'connected',
  NOT_CONNECTED = 'not_connected',
  ERROR = 'error'
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string; // Emoji or icon identifier
  status: IntegrationStatus;
  isAvailable: boolean; // Whether integration is available for connection
  isPremium?: boolean; // Whether it requires premium plan
  
  // Connection details (only if connected)
  connectedAt?: Date;
  connectedBy?: string;
  config?: IntegrationConfig;
}

export interface IntegrationConfig {
  // GitHub
  owner?: string;
  repo?: string;
  repositoryUrl?: string;
  defaultBranch?: string;
  
  // Slack
  workspace?: string;
  channelName?: string;
  
  // Generic
  accountName?: string;
  email?: string;
  [key: string]: any;
}

export interface IntegrationDetails extends Integration {
  // Extended details shown in modal
  features?: string[];
  permissions?: string[];
  lastSyncedAt?: Date;
  webhookUrl?: string;
  webhookStatus?: 'active' | 'inactive';
}

