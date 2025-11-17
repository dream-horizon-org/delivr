import { Badge, Card, Button } from '@mantine/core';
import type { Integration } from '~/types/integrations';
import { IntegrationStatus } from '~/types/integrations';

interface IntegrationCardProps {
  integration: Integration;
  onClick: (integration: Integration) => void;
  onConnect?: (integration: Integration) => void;
}

export function IntegrationCard({ integration, onClick, onConnect }: IntegrationCardProps) {
  const getStatusColor = () => {
    switch (integration.status) {
      case IntegrationStatus.CONNECTED:
        return 'green';
      case IntegrationStatus.ERROR:
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = () => {
    switch (integration.status) {
      case IntegrationStatus.CONNECTED:
        return 'Connected';
      case IntegrationStatus.ERROR:
        return 'Error';
      default:
        return 'Not Connected';
    }
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(integration)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{integration.icon}</div>
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
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

      <p className="text-sm text-gray-600 mb-3">
        {integration.description}
      </p>

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
            const handler = onConnect || onClick;
            handler(integration);
          }}
        >
          Connect
        </Button>
      )}

      {integration.status === IntegrationStatus.CONNECTED && integration.config && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            {integration.config.owner && integration.config.repo && (
              <div>
                <span className="font-medium">Repository:</span>{' '}
                {integration.config.owner}/{integration.config.repo}
              </div>
            )}
            {integration.config.workspace && (
              <div>
                <span className="font-medium">Workspace:</span>{' '}
                {integration.config.workspace}
              </div>
            )}
            {integration.config.accountName && (
              <div>
                <span className="font-medium">Account:</span>{' '}
                {integration.config.accountName}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

