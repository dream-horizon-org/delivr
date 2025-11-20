// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Generic Message Templates
 * Platform-agnostic template definitions that can be formatted for any communication channel
 * (Slack, Teams, Email, SMS, etc.)
 * 
 * Templates are now loaded from JSON file for easier maintenance and updates.
 */

const templatesData = require('./templates.json');

export enum MessageTemplate {
  // Pre-release notifications
  PLANNED_RELEASE = 'planned-release',
  PRE_KICKOFF_REMINDER = 'pre-kickoff-reminder',
  KICKOFF_DETAILS = 'kickoff-details',
  
  // Regression & testing
  PRE_REGRESSION_BUILDS = 'pre-regression-builds',
  REGRESSION_KICKOFF_REMINDER = 'regression-kickoff-reminder',
  ANDROID_PLAYSTORE_REGRESSION_BUILDS = 'android-playstore-regression-builds',
  ANDROID_WEB_REGRESSION_BUILDS = 'android-web-regression-builds',
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
  metadata?: any;
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
 * Generated from JSON templates file
 */
export const TEMPLATE_METADATA: Record<MessageTemplate, TemplateMetadata> = 
  Object.entries(templatesData.templates).reduce((acc, [key, template]: [string, any]) => {
    acc[key as MessageTemplate] = template.metadata;
    return acc;
  }, {} as Record<MessageTemplate, TemplateMetadata>);

/**
 * Get parameter value from parameters array based on field definition
 */
function getParameterValue(
  fieldDef: any,
  parameters: string[]
): string {
  const paramIndex = fieldDef.parameterIndex;
  
  if (typeof paramIndex === 'string' && paramIndex.startsWith('slice(')) {
    // Handle slice operations like "slice(1)" or "slice(2)"
    const match = paramIndex.match(/slice\((\d+)\)/);
    if (match) {
      const startIndex = parseInt(match[1], 10);
      const sliced = parameters.slice(startIndex);
      const joinChar = fieldDef.join || '\n';
      return sliced.length > 0 ? sliced.join(joinChar) : fieldDef.defaultValue || 'N/A';
    }
  }
  
  if (typeof paramIndex === 'number') {
    return parameters[paramIndex] || fieldDef.defaultValue || 'N/A';
  }
  
  return fieldDef.defaultValue || 'N/A';
}

/**
 * Build generic message data from template and parameters
 * This is platform-agnostic and can be formatted for any channel
 * Templates are now loaded from JSON file
 */
export function buildGenericMessage(
  template: MessageTemplate,
  parameters: string[]
): GenericMessageData {
  const templateDef = templatesData.templates[template];
  
  if (!templateDef) {
    // Fallback for unknown templates
    const metadata = TEMPLATE_METADATA[template] || {
      name: 'Unknown Template',
      emoji: '📄',
      color: '#808080',
      category: 'notification' as const
    };
    
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

  const metadata = templateDef.metadata;
  
  // Build fields from JSON definition
  const fields: GenericField[] = templateDef.fields.map((fieldDef: any) => ({
    label: fieldDef.label,
    value: getParameterValue(fieldDef, parameters),
    type: fieldDef.type || 'text',
    inline: fieldDef.inline !== false
  }));

  // Handle description (can be static, from parameter, or template with placeholders)
  let description: string | undefined;
  if (templateDef.description) {
    if (typeof templateDef.description === 'string') {
      // Replace {0}, {1}, {2}, etc. with actual parameter values
      description = templateDef.description.replace(/\{(\d+)\}/g, (match, index) => {
        const paramIndex = parseInt(index, 10);
        return parameters[paramIndex] || 'N/A';
      });
    } else if (templateDef.description.parameterIndex !== undefined) {
      description = parameters[templateDef.description.parameterIndex] || templateDef.description.defaultValue || undefined;
    }
  }

  return {
    title: metadata.name,
    emoji: metadata.emoji,
    color: metadata.color,
    fields,
    description,
    footer: templateDef.footer || 'Delivr Release Management',
    timestamp: new Date(),
    metadata: metadata
  };
}

