// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Generic Message Templates
 * Platform-agnostic template definitions that can be formatted for any communication channel
 * (Slack, Teams, Email, SMS, etc.)
 */

export enum MessageTemplate {
  // Pre-release notifications
  PRE_KICKOFF_REMINDER = 'pre-kickoff-reminder',
  KICKOFF_DETAILS = 'kickoff-details',
  BRANCH_FORKOUT = 'branch-forkout',
  JIRA_EPICS = 'jira-epics',
  CHECKMATE_LINKS = 'checkmate-links',
  
  // Regression & testing
  PRE_REGRESSION_BUILDS = 'pre-regression-builds',
  REGRESSION_KICKOFF_REMINDER = 'regression-kickoff-reminder',
  ANDROID_REGRESSION_BUILDS = 'android-regression-builds',
  IOS_REGRESSION_BUILDS = 'ios-regression-builds',
  
  // Release notes & documentation
  RELEASE_NOTES = 'release-notes',
  WHATS_NEW = 'whats-new',
  
  // Slot management
  NEW_SLOT_ADDED = 'new-slot-added',
  
  // Build notifications
  IOS_TEST_FLIGHT_BUILD = 'ios-test-flight-build',
  
  // Future scope
  AUTOMATION_RESULT = 'automation-result',
  
  // Adhoc messages (triggered by user)
  CHECKMATE_STATUS = 'checkmate-status',
  PENDING_GO_AHEADS = 'pending-go-aheads',
  BUILD_SUBMITTED = 'build-submitted',
  RELEASE_LIVE = 'release-live'
}

/**
 * Generic field definition - works for all platforms
 */
export interface GenericField {
  label: string;
  value: string;
  type?: 'text' | 'url' | 'date' | 'list';
  inline?: boolean;
}

/**
 * Generic message data - platform-agnostic
 */
export interface GenericMessageData {
  title: string;
  emoji: string;
  fields: GenericField[];
  description?: string;
  color?: string;
  url?: string;
  timestamp?: Date;
  footer?: string;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  name: string;
  emoji: string;
  color: string;
  category: 'release' | 'build' | 'deployment' | 'testing' | 'notification';
}

/**
 * Registry of template metadata
 */
export const TEMPLATE_METADATA: Record<MessageTemplate, TemplateMetadata> = {
  [MessageTemplate.PRE_KICKOFF_REMINDER]: {
    name: 'Release Kickoff Reminder',
    emoji: '⏰',
    color: '#FFA500',
    category: 'release'
  },
  [MessageTemplate.KICKOFF_DETAILS]: {
    name: 'Release Kickoff Details',
    emoji: '🚀',
    color: '#0066CC',
    category: 'release'
  },
  [MessageTemplate.BRANCH_FORKOUT]: {
    name: 'Branch Forked Out',
    emoji: '🌿',
    color: '#28a745',
    category: 'release'
  },
  [MessageTemplate.JIRA_EPICS]: {
    name: 'Jira Epics',
    emoji: '📋',
    color: '#0052CC',
    category: 'release'
  },
  [MessageTemplate.CHECKMATE_LINKS]: {
    name: 'Checkmate Links',
    emoji: '🔗',
    color: '#808080',
    category: 'notification'
  },
  [MessageTemplate.PRE_REGRESSION_BUILDS]: {
    name: 'Pre-Regression Builds',
    emoji: '🔨',
    color: '#FFA500',
    category: 'build'
  },
  [MessageTemplate.REGRESSION_KICKOFF_REMINDER]: {
    name: 'Regression Kickoff Reminder',
    emoji: '⚡',
    color: '#FF6600',
    category: 'testing'
  },
  [MessageTemplate.ANDROID_REGRESSION_BUILDS]: {
    name: 'Android Regression Builds',
    emoji: '🤖',
    color: '#3DDC84',
    category: 'build'
  },
  [MessageTemplate.IOS_REGRESSION_BUILDS]: {
    name: 'iOS Regression Builds',
    emoji: '🍎',
    color: '#000000',
    category: 'build'
  },
  [MessageTemplate.RELEASE_NOTES]: {
    name: 'Release Notes',
    emoji: '📝',
    color: '#0066CC',
    category: 'release'
  },
  [MessageTemplate.WHATS_NEW]: {
    name: "What's New",
    emoji: '✨',
    color: '#28a745',
    category: 'release'
  },
  [MessageTemplate.NEW_SLOT_ADDED]: {
    name: 'New Slot Added',
    emoji: '➕',
    color: '#28a745',
    category: 'notification'
  },
  [MessageTemplate.IOS_TEST_FLIGHT_BUILD]: {
    name: 'iOS TestFlight Build',
    emoji: '✈️',
    color: '#0066CC',
    category: 'build'
  },
  [MessageTemplate.AUTOMATION_RESULT]: {
    name: 'Automation Result',
    emoji: '🤖',
    color: '#808080',
    category: 'testing'
  },
  [MessageTemplate.CHECKMATE_STATUS]: {
    name: 'Checkmate Status',
    emoji: '✅',
    color: '#28a745',
    category: 'notification'
  },
  [MessageTemplate.PENDING_GO_AHEADS]: {
    name: 'Pending Approvals',
    emoji: '⏳',
    color: '#FFA500',
    category: 'notification'
  },
  [MessageTemplate.BUILD_SUBMITTED]: {
    name: 'Build Submitted',
    emoji: '📦',
    color: '#0066CC',
    category: 'build'
  },
  [MessageTemplate.RELEASE_LIVE]: {
    name: 'Release Live',
    emoji: '🎉',
    color: '#28a745',
    category: 'deployment'
  }
};

/**
 * Build generic message data from template and parameters
 * This is platform-agnostic and can be formatted for any channel
 */
export function buildGenericMessage(
  template: MessageTemplate,
  parameters: string[]
): GenericMessageData {
  const metadata = TEMPLATE_METADATA[template];

  switch (template) {
    case MessageTemplate.PRE_KICKOFF_REMINDER:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Version', value: parameters[0] || 'N/A', inline: true },
          { label: 'Planned Date', value: parameters[1] || 'N/A', type: 'date', inline: true },
          { label: 'Release Type', value: parameters[2] || 'N/A', inline: true }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.BRANCH_FORKOUT:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'New Branch', value: parameters[0] || 'N/A', inline: true },
          { label: 'From', value: parameters[1] || 'N/A', inline: true },
          { label: 'Author', value: parameters[2] || 'N/A', inline: true }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.RELEASE_NOTES:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Version', value: parameters[0] || 'N/A', inline: true },
          { label: 'Environment', value: parameters[1] || 'N/A', inline: true },
          { label: 'Release URL', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.BUILD_SUBMITTED:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Build ID', value: parameters[0] || 'N/A', inline: true },
          { label: 'Platform', value: parameters[1] || 'N/A', inline: true },
          { label: 'Version', value: parameters[2] || 'N/A', inline: true }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.RELEASE_LIVE:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        description: 'The release is now live and available to users!',
        fields: [
          { label: 'Release Name', value: parameters[0] || 'N/A', inline: false },
          { label: 'Version', value: parameters[1] || 'N/A', inline: true },
          { label: 'Release URL', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.IOS_TEST_FLIGHT_BUILD:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Build Number', value: parameters[0] || 'N/A', inline: true },
          { label: 'Version', value: parameters[1] || 'N/A', inline: true },
          { label: 'TestFlight Link', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.CHECKMATE_STATUS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Status', value: parameters[0] || 'N/A', inline: true },
          { label: 'Details', value: parameters[1] || 'N/A', inline: false },
          { label: 'Checkmate URL', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.PENDING_GO_AHEADS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        description: 'The following approvals are pending',
        fields: [
          { label: 'Release', value: parameters[0] || 'N/A', inline: false },
          { label: 'Approvers', value: parameters[1] || 'N/A', inline: false },
          { label: 'Approval URL', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.KICKOFF_DETAILS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Release', value: parameters[0] || 'N/A', inline: false },
          { label: 'Time', value: parameters[1] || 'N/A', inline: true, type: 'date' },
          { label: 'Meeting Link', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.ANDROID_REGRESSION_BUILDS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Release', value: parameters[0] || 'N/A', inline: false },
          { label: 'Build Links', value: parameters.slice(1).join('\n') || 'N/A', type: 'list', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.IOS_REGRESSION_BUILDS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Release', value: parameters[0] || 'N/A', inline: false },
          { label: 'Build Links', value: parameters.slice(1).join('\n') || 'N/A', type: 'list', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.REGRESSION_KICKOFF_REMINDER:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Label', value: parameters[0] || 'N/A', inline: false },
          { label: 'Regression Timestamp', value: parameters[1] || 'N/A', type: 'date', inline: true },
          { label: 'Current Release', value: parameters[2] || 'N/A', inline: true }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.NEW_SLOT_ADDED:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Date', value: parameters[0] || 'N/A', type: 'date', inline: true },
          { label: 'Release ID', value: parameters[1] || 'N/A', inline: true }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.JIRA_EPICS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Version', value: parameters[0] || 'N/A', inline: true },
          { label: 'Epic Count', value: parameters[1] || 'N/A', inline: true },
          { label: 'Jira Link', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.CHECKMATE_LINKS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Release', value: parameters[0] || 'N/A', inline: false },
          { label: 'Checkmate Links', value: parameters.slice(1).join('\n') || 'N/A', type: 'list', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.PRE_REGRESSION_BUILDS:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Version', value: parameters[0] || 'N/A', inline: true },
          { label: 'Environment', value: parameters[1] || 'N/A', inline: true },
          { label: 'Build Links', value: parameters.slice(2).join('\n') || 'N/A', type: 'list', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.WHATS_NEW:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        description: parameters[2] || '',
        fields: [
          { label: 'Version', value: parameters[0] || 'N/A', inline: true },
          { label: 'Release Date', value: parameters[1] || 'N/A', type: 'date', inline: true }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    case MessageTemplate.AUTOMATION_RESULT:
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: [
          { label: 'Test Suite', value: parameters[0] || 'N/A', inline: true },
          { label: 'Status', value: parameters[1] || 'N/A', inline: true },
          { label: 'Results URL', value: parameters[2] || 'N/A', type: 'url', inline: false }
        ],
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };

    default:
      // Generic fallback
      return {
        title: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        fields: parameters.map((param, index) => ({
          label: `Parameter ${index + 1}`,
          value: param,
          inline: true
        })),
        footer: 'Delivr Release Management',
        timestamp: new Date()
      };
  }
}

