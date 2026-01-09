/**
 * Communication Helpers
 * Utility functions for checking communication integration status
 */

import type { CommunicationConfig } from '~/types/release-config';
import type { ConnectedIntegration } from '~/types/system-metadata';

/**
 * Check if kickoff reminder can be enabled
 * Requires: (1) Communication integrations connected AND (2) Communication enabled in config
 */
export function canEnableKickoffReminder(
  communicationConfig: CommunicationConfig | undefined,
  connectedCommunicationIntegrations: ConnectedIntegration[]
): boolean {
  // Check if any communication integrations are connected
  const hasIntegrations = connectedCommunicationIntegrations.length > 0;
  
  // Check if communication is enabled in config (flat structure)
  const isEnabled = communicationConfig?.enabled === true;
  
  return hasIntegrations && isEnabled;
}

