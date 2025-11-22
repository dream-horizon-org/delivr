import { Badge, Card, Button } from '@mantine/core';
import type { Integration } from '~/types/integrations';
import { IntegrationStatus } from '~/types/integrations';
import { IntegrationIcon } from '~/components/Integrations/IntegrationIcon';
import { INTEGRATION_STATUS_COLORS, INTEGRATION_STATUS_TEXT } from './integrations-constants';

interface IntegrationCardProps {
  integration: Integration;
  onClick: (integration: Integration) => void;
  onConnect?: (integration: Integration) => void;
}

export function IntegrationCard({ integration, onClick, onConnect }: IntegrationCardProps) {
  const getStatusColor = () => {
    return INTEGRATION_STATUS_COLORS[integration.status] || INTEGRATION_STATUS_COLORS[IntegrationStatus.NOT_CONNECTED];
  };

  const getStatusText = () => {
    return INTEGRATION_STATUS_TEXT[integration.status] || INTEGRATION_STATUS_TEXT[IntegrationStatus.NOT_CONNECTED];
  };

  const isDisabled = !integration.isAvailable;

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
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <IntegrationIcon 
              name={integration.icon} 
              size={48} 
              className={isDisabled ? 'text-gray-400' : ''} 
            />
          </div>
          <div>
            <h3 className={`font-semibold text-base flex items-center gap-2 mb-1 ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
              {integration.name}
              {integration.isPremium && (
                <Badge size="xs" color="yellow" variant="filled">
                  Premium
                </Badge>
              )}
            </h3>
            <Badge
              size="sm"
              color={getStatusColor()}
              variant={integration.status === IntegrationStatus.CONNECTED ? 'filled' : 'light'}
            >
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Only show description if it exists and is not empty */}
      {integration.description && integration.description.trim() !== '' && (
        <p className={`text-sm mb-3 ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
          {integration.description}
        </p>
      )}

      {!integration.isAvailable && (
        <Badge size="sm" color="gray" variant="outline" className="w-full">
          Coming Soon
        </Badge>
      )}

      {integration.isAvailable && integration.status !== IntegrationStatus.CONNECTED && (
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
          Connect
        </Button>
      )}

      {integration.status === IntegrationStatus.CONNECTED && integration.config && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1.5">
            {/* GitHub/SCM */}
            {integration.config.owner && integration.config.repo && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">Repository:</span>
                <span className="text-gray-900">{integration.config.owner}/{integration.config.repo}</span>
              </div>
            )}
            
            {/* Slack */}
            {integration.config.workspace && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">Workspace:</span>
                <span className="text-gray-900">{integration.config.workspace}</span>
              </div>
            )}
            
            {/* Jenkins */}
            {integration.config.accountName && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">Account:</span>
                <span className="text-gray-900">{integration.config.accountName}</span>
              </div>
            )}
            
            {/* General */}
            {integration.config.displayName && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">Name:</span>
                <span className="text-gray-900">{integration.config.displayName}</span>
              </div>
            )}
            
            {/* Checkmate/Others - Host URL */}
            {integration.config.hostUrl && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">Host:</span>
                <span className="text-gray-900 truncate max-w-[200px]" title={integration.config.hostUrl}>
                  {integration.config.hostUrl}
                </span>
              </div>
            )}
            
            {/* App Distribution - App Identifier */}
            {integration.config.appIdentifier && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">App ID:</span>
                <span className="text-gray-900 truncate max-w-[200px]" title={integration.config.appIdentifier}>
                  {integration.config.appIdentifier}
                </span>
              </div>
            )}
            
            {/* App Distribution - Platforms */}
            {integration.config.platforms && Array.isArray(integration.config.platforms) && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">Platforms:</span>
                <span className="inline-flex gap-1 flex-wrap">
                  {integration.config.platforms.map((p: string) => (
                    <Badge key={p} size="xs" variant="light">
                      {p}
                    </Badge>
                  ))}
                </span>
              </div>
            )}
            
            {/* App Distribution - Store Type */}
            {integration.config.storeType && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 min-w-[80px]">Store:</span>
                <span className="text-gray-900">
                  {integration.config.storeType === 'play_store' ? 'Play Store' : 'App Store'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

