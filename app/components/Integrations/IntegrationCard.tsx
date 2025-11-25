import { Badge, Card, Button } from '@mantine/core';
import type { Integration } from '~/types/integrations';
import { IntegrationStatus } from '~/types/integrations';
import { IntegrationIcon } from '~/components/Integrations/IntegrationIcon';
import { INTEGRATION_STATUS_COLORS, INTEGRATION_STATUS_TEXT, INTEGRATION_STATUS_VALUES } from '~/constants/integrations';
import { INTEGRATION_CARD_LABELS } from '~/constants/integration-ui';
import { TARGET_PLATFORMS } from '~/types/release-config-constants';

interface IntegrationCardProps {
  integration: Integration;
  onClick: (integration: Integration) => void;
  onConnect?: (integration: Integration) => void;
}

export function IntegrationCard({ integration, onClick, onConnect }: IntegrationCardProps) {
  const getStatusColor = () => {
    return INTEGRATION_STATUS_COLORS[integration.status as keyof typeof INTEGRATION_STATUS_COLORS] || INTEGRATION_STATUS_COLORS[INTEGRATION_STATUS_VALUES.NOT_CONNECTED];
  };

  const getStatusText = () => {
    return INTEGRATION_STATUS_TEXT[integration.status as keyof typeof INTEGRATION_STATUS_TEXT] || INTEGRATION_STATUS_TEXT[INTEGRATION_STATUS_VALUES.NOT_CONNECTED];
  };

  const isDisabled = !integration.isAvailable;

  // Check if there's any config data to display
  const hasConfigToDisplay = integration.status === INTEGRATION_STATUS_VALUES.CONNECTED && integration.config && (
    integration.config.owner ||
    integration.config.repo ||
    integration.config.workspace ||
    integration.config.workspaceName ||
    integration.config.workspaceId ||
    integration.config.accountName ||
    integration.config.displayName ||
    integration.config.hostUrl ||
    integration.config.appIdentifier ||
    integration.config.storeType ||
    integration.config.baseUrl ||
    integration.config.teamName ||
    (integration.config.platforms && Array.isArray(integration.config.platforms)) ||
    (integration.config.channels && Array.isArray(integration.config.channels))
  );

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      className={`transition-all ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed grayscale'
          : 'cursor-pointer hover:shadow-md'
      }`}
      onClick={() => !isDisabled && onClick(integration)}
    >
      <div className="flex flex-col h-full min-h-[180px]">
        {/* Header with Icon, Name, and Status */}
        <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0">
          <IntegrationIcon 
            name={integration.icon} 
            size={40} 
            className={isDisabled ? 'text-gray-400' : ''} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-semibold text-base leading-none ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
              {integration.name}
            </h3>
            <Badge
              size="sm"
              color={getStatusColor()}
              variant={integration.status === INTEGRATION_STATUS_VALUES.CONNECTED ? 'filled' : 'light'}
              className="flex-shrink-0"
            >
              {getStatusText()}
            </Badge>
          </div>
          {integration.isPremium && (
            <Badge size="xs" color="yellow" variant="filled" className="mt-1.5">
              {INTEGRATION_CARD_LABELS.PREMIUM}
            </Badge>
          )}
          </div>
        </div>

        {/* Only show description if it exists and is not empty */}
        {integration.description && integration.description.trim() !== '' && (
          <p className={`text-sm mb-3 ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
            {integration.description}
          </p>
        )}

        {!integration.isAvailable && (
          <div className="mt-auto p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">{INTEGRATION_CARD_LABELS.COMING_SOON}</span>
            </div>
          </div>
        )}

        {integration.isAvailable && integration.status !== INTEGRATION_STATUS_VALUES.CONNECTED && (
          <div className="mt-auto">
            <Button
              fullWidth
              size="sm"
              variant="light"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                if (!isDisabled) {
                  const handler = onConnect || onClick;
                  handler(integration);
                }
              }}
            >
              {INTEGRATION_CARD_LABELS.CONNECT}
            </Button>
          </div>
        )}

      {hasConfigToDisplay && integration.config && (
        <div className="mt-3 p-3 bg-blue-50/50 rounded-md space-y-2">
          {/* GitHub/SCM */}
          {integration.config.owner && integration.config.repo && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.REPOSITORY}</div>
              <div className="text-sm text-gray-900 font-mono">
                {integration.config.owner}/{integration.config.repo}
              </div>
            </div>
          )}
          
          {/* Slack - Workspace Name */}
          {integration.config.workspaceName && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.WORKSPACE}</div>
              <div className="text-sm text-gray-900">{integration.config.workspaceName}</div>
            </div>
          )}
          
          {/* Slack - Channels Count */}
          {integration.config.channels && Array.isArray(integration.config.channels) && integration.config.channels.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.CONNECTED_CHANNELS}</div>
              <div className="text-sm text-gray-900">
                {integration.config.channels.length} {integration.config.channels.length !== 1 ? INTEGRATION_CARD_LABELS.CHANNELS : INTEGRATION_CARD_LABELS.CHANNEL}
              </div>
            </div>
          )}
          
          {/* JIRA/Checkmate - Base URL */}
          {integration.config.baseUrl && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.URL}</div>
              <div className="text-sm text-gray-900 truncate font-mono" title={integration.config.baseUrl}>
                {integration.config.baseUrl}
              </div>
            </div>
          )}
          
          {/* Jenkins */}
          {integration.config.accountName && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.ACCOUNT}</div>
              <div className="text-sm text-gray-900">{integration.config.accountName}</div>
            </div>
          )}
          
          {/* General */}
          {integration.config.displayName && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.CONFIGURATION}</div>
              <div className="text-sm text-gray-900">{integration.config.displayName}</div>
            </div>
          )}
          
          {/* Checkmate/Others - Host URL */}
          {integration.config.hostUrl && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.HOST}</div>
              <div className="text-sm text-gray-900 truncate font-mono" title={integration.config.hostUrl}>
                {integration.config.hostUrl}
              </div>
            </div>
          )}
          
          {/* App Distribution - App Identifier */}
          {integration.config.appIdentifier && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.APP_ID}</div>
              <div className="text-sm text-gray-900 truncate font-mono" title={integration.config.appIdentifier}>
                {integration.config.appIdentifier}
              </div>
            </div>
          )}
          
          {/* App Distribution - Team Name (App Store) */}
          {integration.config.teamName && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.TEAM_NAME}</div>
              <div className="text-sm text-gray-900">{integration.config.teamName}</div>
            </div>
          )}
          
          {/* App Distribution - Default Locale (App Store) */}
          {integration.config.defaultLocale && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.DEFAULT_LOCALE}</div>
              <div className="text-sm text-gray-900">{integration.config.defaultLocale}</div>
            </div>
          )}
          
          {/* App Distribution - Platforms */}
          {integration.config.platforms && Array.isArray(integration.config.platforms) && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.PLATFORMS}</div>
              <div className="flex gap-1 flex-wrap">
                {integration.config.platforms.map((p: string) => (
                  <Badge key={p} size="xs" variant="light">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* App Distribution - Store Type */}
          {integration.config.storeType && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-0.5">{INTEGRATION_CARD_LABELS.STORE}</div>
              <div className="text-sm text-gray-900">
                {integration.config.storeType === TARGET_PLATFORMS.PLAY_STORE.toLowerCase() 
                  ? INTEGRATION_CARD_LABELS.PLAY_STORE 
                  : INTEGRATION_CARD_LABELS.APP_STORE}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </Card>
  );
}
