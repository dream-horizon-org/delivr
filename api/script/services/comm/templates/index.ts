// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Slack Message Templates
 * 
 * Architecture:
 * - Generic templates: Platform-agnostic data (can be reused for Teams/Email later)
 * - Slack formatter: Converts generic data to Slack-specific format
 * 
 * Usage:
 * ```typescript
 * import { buildSlackMessage, MessageTemplate } from './templates';
 * 
 * const slackMsg = buildSlackMessage(
 *   MessageTemplate.RELEASE_NOTES,
 *   ['v2.0.0', 'Production', 'https://github.com/releases']
 * );
 * ```
 */

// Export generic templates (can be reused for other platforms)
export {
  MessageTemplate,
  GenericMessageData,
  GenericField,
  TemplateMetadata,
  TEMPLATE_METADATA,
  buildGenericMessage
} from './generic-templates';

// Export Slack formatter
export { SlackFormatter, SlackMessage } from './slack-formatter';

// Convenience function
import { MessageTemplate, buildGenericMessage } from './generic-templates';
import { SlackFormatter } from './slack-formatter';

/**
 * Build Slack message from template (one-liner)
 */
export function buildSlackMessage(template: MessageTemplate, parameters: string[]) {
  const genericData = buildGenericMessage(template, parameters);
  return new SlackFormatter().format(genericData);
}

