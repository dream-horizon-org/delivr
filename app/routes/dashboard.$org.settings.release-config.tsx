/**
 * Release Configuration Settings Route
 * Manage release configurations in settings
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { Container } from '@mantine/core';
import { ConfigurationList } from '~/components/ReleaseConfig/Settings/ConfigurationList';
import type { ReleaseConfiguration } from '~/types/release-config';
import { loadConfigList, addConfigToList, updateConfigInList } from '~/utils/release-config-storage';

export async function loader({ params }: LoaderFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // TODO: Fetch configurations from server
  // For now, load from local storage for demo
  const configurations = loadConfigList(org);
  
  return json({
    organizationId: org,
    configurations: configurations as any, // Mock full config data
  });
}

export default function ReleaseConfigSettingsPage() {
  const { organizationId, configurations } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const handleCreate = () => {
    navigate(`/dashboard/${organizationId}/releases/configure`);
  };
  
  const handleEdit = (config: ReleaseConfiguration) => {
    // TODO: Implement edit flow
    // Could navigate to wizard with config ID or open modal
    console.log('Edit config:', config.id);
    navigate(`/dashboard/${organizationId}/releases/configure?edit=${config.id}`);
  };
  
  const handleDuplicate = (config: ReleaseConfiguration) => {
    // TODO: Implement duplicate logic
    console.log('Duplicate config:', config.id);
  };
  
  const handleArchive = (configId: string) => {
    // TODO: Implement archive logic
    console.log('Archive config:', configId);
    updateConfigInList(organizationId, configId, { status: 'ARCHIVED' });
  };
  
  const handleSetDefault = (configId: string) => {
    // TODO: Implement set default logic
    console.log('Set default config:', configId);
  };
  
  return (
    <Container size="xl" className="py-8">
      <ConfigurationList
        configurations={configurations}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onSetDefault={handleSetDefault}
        onCreate={handleCreate}
      />
    </Container>
  );
}

