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
}

/**
 * Formatter for Slack platform
 */
export class SlackFormatter {
  /**
   * Convert generic message data to Slack format
   */
  format(data: GenericMessageData): SlackMessage {
    const attachment: any = {
      color: this.convertColor(data.color),
      title: `${data.emoji} ${data.title}`,
      fields: data.fields.map(field => this.formatField(field)),
      footer: data.footer,
      ts: data.timestamp ? Math.floor(data.timestamp.getTime() / 1000) : undefined
    };

    // Add description as text if present
    if (data.description) {
      attachment.text = data.description;
    }

    // Add URL as title link if present
    if (data.url) {
      attachment.title_link = data.url;
    }

    return {
      text: `${data.emoji} ${data.title}`,
      attachments: [attachment]
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

