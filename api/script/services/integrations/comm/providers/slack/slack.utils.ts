import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import type { MessageFile } from '../../comm-types';
import {
  Task,
  Platform,
  type TemplatesCollection,
  type SimpleTemplate,
  type PlatformTemplate,
  isPlatformTemplate
} from '../../messaging/messaging.interface';

let templatesCache: TemplatesCollection | null = null;

/**
 * Load templates from templates.json file
 * Uses caching to avoid repeated file reads
 */
const loadTemplates = (): TemplatesCollection => {
  if (templatesCache) {
    return templatesCache;
  }

  const templatesPath = path.join(__dirname, '..', '..', 'messaging', 'templates', 'templates.json');
  const templatesContent = fs.readFileSync(templatesPath, 'utf8');
  templatesCache = JSON.parse(templatesContent) as TemplatesCollection;

  return templatesCache;
};

/**
 * Get a specific template by task and optional platform
 * 
 * @param task - The message task type
 * @param platform - Optional platform for platform-specific templates
 * @returns The template or null if not found
 */
const getTemplate = (task: Task, platform?: Platform): SimpleTemplate | null => {
  const templates = loadTemplates();
  const template = templates.templates[task];

  if (!template) {
    console.error(`[Template] Template not found for task: ${task}`);
    return null;
  }

  // Check if template is platform-specific
  if (isPlatformTemplate(template)) {
    if (!platform) {
      console.error(`[Template] Platform required for task: ${task}`);
      return null;
    }

    const platformTemplate = template.platforms[platform];
    if (!platformTemplate) {
      console.error(`[Template] Platform ${platform} not found for task: ${task}`);
      return null;
    }

    return platformTemplate;
  }

  // Return simple template
  return template;
};

/**
 * Format message by replacing placeholders {0}, {1}, {2}... with parameters
 * 
 * @param description - Template description with placeholders
 * @param parameters - Array of values to replace placeholders
 * @returns Formatted message
 */
const formatMessage = (description: string, parameters: string[]): string => {
  let formattedMessage = description;

  parameters.forEach((param, index) => {
    const placeholder = `{${index}}`;
    formattedMessage = formattedMessage.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), param);
  });

  return formattedMessage;
};

/**
 * Message result containing formatted message and metadata
 */
export type MessageResult = {
  message: string;
  metadata: {
    name: string;
    emoji: string;
    color: string;
    category: string;
    showTitle?: boolean;
  };
};

/**
 * Build a formatted message from a template
 * 
 * @param task - The message task type (e.g., Task.REGRESSION_BUILDS)
 * @param parameters - Array of values to replace placeholders {0}, {1}, {2}...
 * @param platform - Optional platform for platform-specific templates (e.g., Platform.IOS)
 * @returns Formatted message with metadata, or null if template not found
 * 
 * @example
 * // Simple template (no platform)
 * const result = buildMessage(
 *   Task.PRE_KICKOFF_REMINDER,
 *   ['planned', 'v6.5.0', 'March 15, 2025', 'https://delivr.example.com/releases/v6.5.0']
 * );
 * 
 * @example
 * // Platform-specific template
 * const result = buildMessage(
 *   Task.REGRESSION_BUILDS,
 *   ['v6.4.1(19016)', 'https://firebase.dev/build', 'ios indiabuildios', ...],
 *   Platform.IOS
 * );
 */
export const buildMessage = (
  task: Task,
  parameters: string[],
  platform?: Platform
): MessageResult | null => {
  const template = getTemplate(task, platform);

  if (!template) {
    return null;
  }

  const message = formatMessage(template.description, parameters);

  return {
    message,
    metadata: {
      name: template.metadata.name,
      emoji: template.metadata.emoji,
      color: template.metadata.color,
      category: template.metadata.category,
      showTitle: template.metadata.showTitle
    }
  };
};

/**
 * Build a formatted Slack message with emoji and title
 * 
 * @param task - The message task type
 * @param parameters - Array of values to replace placeholders
 * @param platform - Optional platform for platform-specific templates
 * @returns Full formatted Slack message with emoji and title
 * 
 * @example
 * const slackMessage = buildSlackMessage(
 *   Task.PRE_KICKOFF_REMINDER,
 *   ['v6.3.1', 'Sep 25, 2025, 7:01 PM']
 * );
 * // Returns: "📅 Pre-Kickoff Reminder\n\nReminder: Release kickoff for *v6.3.1* is scheduled at *Sep 25, 2025, 7:01 PM*"
 */
export const buildSlackMessage = (
  task: Task,
  parameters: string[],
  platform?: Platform
): string | null => {
  const result = buildMessage(task, parameters, platform);

  if (!result) {
    return null;
  }

  const showTitle = result.metadata.showTitle ?? true;

  if (showTitle) {
    return `${result.metadata.emoji} ${result.metadata.name}\n\n${result.message}`;
  }

  return result.message;
};

/**
 * Download file from URL and convert to MessageFile format for Slack upload
 * 
 * @param url - File URL to download (e.g., Firebase build URL)
 * @returns MessageFile array ready for Slack API upload
 * 
 * @example
 * const files = await downloadFileFromUrl('https://firebase.dev/builds/app-v6.4.1.apk');
 * // Returns: [{ buffer: Buffer, filename: 'app-v6.4.1.apk', contentType: '...', ... }]
 */
export const downloadFileFromUrl = async (url: string): Promise<MessageFile[]> => {
  try {
    console.log(`[FileDownload] Downloading file from: ${url}`);
    
    // Fetch file from URL
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorMessage = `Failed to download file: ${response.status} ${response.statusText}`;
      console.error(`[FileDownload] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Get file buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename from URL path
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1] || 'attachment';

    // Detect content type from response headers or file extension
    const contentType = response.headers.get('content-type') ?? 
      (filename.endsWith('.apk') ? 'application/vnd.android.package-archive' :
       filename.endsWith('.ipa') ? 'application/octet-stream' :
       filename.endsWith('.zip') ? 'application/zip' :
       filename.endsWith('.pdf') ? 'application/pdf' :
       filename.endsWith('.aab') ? 'application/x-authorware-bin' :
       'application/octet-stream');

    console.log(`[FileDownload] Downloaded ${filename} (${buffer.length} bytes, ${contentType})`);

    return [{
      buffer,
      filename,
      contentType,
      title: filename,
      initialComment: `Build file: ${filename}`
    }];
  } catch (error: any) {
    const errorMessage = `Failed to download file from URL: ${error.message}`;
    console.error(`[FileDownload] ${errorMessage}`, error);
    throw new Error(errorMessage);
  }
};

