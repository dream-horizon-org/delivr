// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Comm Services
 * Slack messaging service for release notifications
 * 
 * Architecture:
 * - ICommService: Interface for communication platforms
 * - SlackService: Slack implementation
 * - CommServiceFactory: Factory to create Slack service for tenants
 * 
 * Usage:
 * ```typescript
 * // Auto-load tenant's Slack config
 * const slack = await CommServiceFactory.createForTenant('tenant-id');
 * 
 * // Send template message
 * await slack.sendTemplateMessage(
 *   'tenant-id',
 *   MessageTemplate.RELEASE_NOTES,
 *   ['v2.0.0', 'Production', 'https://...']
 * );
 * ```
 */

// Core interface
export { ICommService } from './comm-service.interface';

// Types and templates
export * from './comm-types';
export * from './templates';

// Service implementation
export { SlackService } from './slack-service';

// Factory
export { CommServiceFactory } from './comm-service-factory';


