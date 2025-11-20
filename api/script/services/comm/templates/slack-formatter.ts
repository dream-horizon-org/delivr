// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Slack Message Formatter
 * Converts generic message data to Slack-specific format
 */

import { GenericMessageData, GenericField } from './generic-templates';

/**
 * Slack message format
 */
export interface SlackMessage {
  text: string;
  attachments?: any[];
  blocks?: any[];
  unfurl_links?: boolean;
  unfurl_media?: boolean;
}

/**
 * Formatter for Slack platform
 */
export class SlackFormatter {
  /**
   * Convert generic message data to Slack format
   */
  format(data: GenericMessageData): SlackMessage {
    // Always send as plain text message without attachment sidebar
    // Build the message text with title and fields
    let messageText = `<!channel>\n`;
    
    // Add title if not explicitly hidden
    if (data.metadata?.showTitle !== false) {
      messageText += `${data.emoji} *${data.title}*\n`;
    }

    // Add description if present
    if (data.description) {
      messageText += `\n${data.description}\n`;
    }

    // Add fields as plain text (no attachment format)
    if (data.fields && data.fields.length > 0) {
      messageText += '\n';
      for (const field of data.fields) {
        let value = field.value;
        
        // Format URLs as Slack links
        if (field.type === 'url' && this.isValidUrl(value)) {
          value = `<${value}|${field.label}>`;
          messageText += `${value}\n`;
        } else {
          messageText += `*${field.label}*\n${value}\n`;
        }
        messageText += '\n';
      }
    }

    return {
      text: messageText.trim(),
      unfurl_links: false,
      unfurl_media: false
    };
  }

  /**
   * Format a single field for Slack
   */
  private formatField(field: GenericField): any {
    let value = field.value;

    // Format URLs as Slack links
    if (field.type === 'url' && this.isValidUrl(value)) {
      value = `<${value}|Open Link>`;
    }

    return {
      title: field.label,
      value: value,
      short: field.inline !== false
    };
  }

  /**
   * Convert hex color to Slack color
   */
  private convertColor(color?: string): string {
    if (!color) return '#808080';
    
    // Slack accepts: good, warning, danger, or hex
    if (['good', 'warning', 'danger'].includes(color)) {
      return color;
    }

    // Remove # if present
    return color.startsWith('#') ? color : `#${color}`;
  }

  /**
   * Check if string is valid URL
   */
  private isValidUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }
}

