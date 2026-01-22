/**
 * No Configuration Alert Component
 * Displays alert when no release configurations exist
 */

import { memo } from 'react';
import { Paper, Button, Container } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { FormPageHeader } from '~/components/Common/FormPageHeader';

interface NoConfigurationAlertProps {
  org: string;
  onCreateConfig: () => void;
}

export const NoConfigurationAlert = memo(function NoConfigurationAlert({
  org,
  onCreateConfig,
}: NoConfigurationAlertProps) {

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container size="lg">
        <Paper shadow="sm" p="xl" radius="md">
          <FormPageHeader
            title="Create Release"
            backUrl={`/dashboard/${org}/releases`}
          />

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <IconSettings className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-base font-medium text-yellow-800">
                  No Release Configuration Found
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You need to create a release configuration before you can create releases.
                    Release configurations define the platforms, pipelines, testing phases, and
                    approval workflows for your releases.
                  </p>
                </div>
                <div className="mt-4">
                  <Button
                    leftSection={<IconSettings size={18} />}
                    onClick={onCreateConfig}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Create Release Configuration
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Paper>
      </Container>
    </div>
  );
});

