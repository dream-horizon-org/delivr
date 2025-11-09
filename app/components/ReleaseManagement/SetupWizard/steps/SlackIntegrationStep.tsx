/**
 * SlackIntegrationStep - Step 5: Connect Slack for notifications (optional)
 */

import React, { useState } from 'react';
import { WizardStep, FormField } from '../components';
import { useSlackConnection } from '../hooks';
import type { SlackIntegration } from '../types';

interface SlackIntegrationStepProps {
  initialData?: SlackIntegration;
  onComplete?: (data: SlackIntegration) => void;
}

export function SlackIntegrationStep({ initialData, onComplete }: SlackIntegrationStepProps) {
  const {
    integration,
    isVerifying,
    error,
    availableChannels,
    updateBotToken,
    verifyAndFetchChannels,
    selectChannels,
    isVerified,
  } = useSlackConnection({
    initialData,
    onVerified: onComplete,
  });
  
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(
    new Set(initialData?.channels.map(c => c.id) || [])
  );
  
  const [channelPurposes, setChannelPurposes] = useState<Map<string, SlackIntegration['channels'][0]['purpose']>>(
    new Map(initialData?.channels.map(c => [c.id, c.purpose]) || [])
  );
  
  const handleVerifyToken = async () => {
    const success = await verifyAndFetchChannels();
    if (success) {
      // Token verified, channels fetched
    }
  };
  
  const handleChannelToggle = (channelId: string) => {
    const newSelected = new Set(selectedChannelIds);
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId);
      channelPurposes.delete(channelId);
    } else {
      newSelected.add(channelId);
      channelPurposes.set(channelId, 'GENERAL');
    }
    setSelectedChannelIds(newSelected);
  };
  
  const handlePurposeChange = (channelId: string, purpose: SlackIntegration['channels'][0]['purpose']) => {
    setChannelPurposes(new Map(channelPurposes.set(channelId, purpose)));
  };
  
  const handleSaveChannels = () => {
    const selectedChannels = Array.from(selectedChannelIds).map(id => {
      const channel = availableChannels.find(c => c.id === id)!;
      return {
        id: channel.id,
        name: channel.name,
        purpose: channelPurposes.get(id) || 'GENERAL',
      };
    });
    
    selectChannels(selectedChannels);
  };
  
  return (
    <WizardStep
      title="Slack Integration"
      description="Connect Slack to receive release notifications (optional)"
      isRequired={false}
      error={error}
    >
      <div className="space-y-6">
        {/* Bot Token Input */}
        {!isVerified && (
          <div className="space-y-4">
            <FormField
              label="Slack Bot Token"
              name="slackBotToken"
              type="password"
              value={integration.botToken || ''}
              onChange={updateBotToken}
              placeholder="xoxb-your-bot-token"
              required
              helpText="Create a Slack app and get the bot token from OAuth & Permissions"
            />
            
            <button
              type="button"
              onClick={handleVerifyToken}
              disabled={!integration.botToken || isVerifying || availableChannels.length > 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify & Fetch Channels'}
            </button>
            
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">How to get a Slack Bot Token?</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">api.slack.com/apps</a></li>
                <li>Create a new app or select existing one</li>
                <li>Go to "OAuth & Permissions"</li>
                <li>Add scopes: <code className="bg-blue-100 px-1 rounded">chat:write</code>, <code className="bg-blue-100 px-1 rounded">channels:read</code></li>
                <li>Install app to workspace and copy the "Bot User OAuth Token"</li>
              </ol>
            </div>
          </div>
        )}
        
        {/* Channel Selection */}
        {availableChannels.length > 0 && !isVerified && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Select Channels</h3>
              <p className="text-sm text-gray-500 mb-4">
                Choose which channels will receive notifications and assign them purposes
              </p>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {availableChannels.map((channel) => {
                const isSelected = selectedChannelIds.has(channel.id);
                return (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleChannelToggle(channel.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">#{channel.name}</span>
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <select
                        value={channelPurposes.get(channel.id) || 'GENERAL'}
                        onChange={(e) => handlePurposeChange(channel.id, e.target.value as SlackIntegration['channels'][0]['purpose'])}
                        className="ml-4 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      >
                        <option value="GENERAL">General</option>
                        <option value="BUILDS">Builds</option>
                        <option value="RELEASES">Releases</option>
                        <option value="CRITICAL">Critical Alerts</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button
              type="button"
              onClick={handleSaveChannels}
              disabled={selectedChannelIds.size === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Save Channels ({selectedChannelIds.size} selected)
            </button>
          </div>
        )}
        
        {/* Verified State */}
        {isVerified && integration.channels && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Slack Connected</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p className="font-medium mb-1">Selected Channels:</p>
                  <ul className="space-y-1">
                    {integration.channels.map(channel => (
                      <li key={channel.id}>
                        #{channel.name} <span className="text-green-600">({channel.purpose})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Skip Option */}
        {!isVerified && availableChannels.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-sm text-gray-600">
              <strong>Optional:</strong> You can skip Slack integration and add it later from settings.
              Slack notifications help keep your team informed about release progress.
            </p>
          </div>
        )}
      </div>
    </WizardStep>
  );
}

