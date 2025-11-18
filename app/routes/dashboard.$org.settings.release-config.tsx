/**
 * Release Configuration Settings Route
 * Manage release configurations in settings
 * Now uses API for all operations
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useFetcher } from '@remix-run/react';
import { Container } from '@mantine/core';
import { ConfigurationList } from '~/components/ReleaseConfig/Settings/ConfigurationList';
import type { ReleaseConfiguration } from '~/types/release-config';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Fetch configurations from API
  let configurations: ReleaseConfiguration[] = [];
  let stats = null;
  
  try {
    const url = new URL(request.url);
    const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}/release-config`;
    
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      configurations = data.configurations || [];
      stats = data.stats || null;
      console.log(`[Settings] Loaded ${configurations.length} configurations`);
    }
  } catch (error) {
    console.error('[Settings] Failed to load configurations:', error);
  }
  
  return json({
    organizationId: org,
    configurations,
    stats,
  });
}

export default function ReleaseConfigSettingsPage() {
  const { organizationId, configurations, stats } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  const handleCreate = () => {
    navigate(`/dashboard/${organizationId}/releases/configure`);
  };
  
  const handleEdit = (config: ReleaseConfiguration) => {
    console.log('[Settings] Edit config:', config.id);
    navigate(`/dashboard/${organizationId}/releases/configure?edit=${config.id}`);
  };
  
  const handleDuplicate = async (config: ReleaseConfiguration) => {
    console.log('[Settings] Duplicate config:', config.id);
    // TODO: Implement duplicate via API
    // For now, just log
    alert('Duplicate feature coming soon - will call API to duplicate configuration');
  };
  
  const handleArchive = async (configId: string) => {
    if (!confirm('Are you sure you want to archive this configuration?')) {
      return;
    }
    
    console.log('[Settings] Archive config:', configId);
    
    try {
      const response = await fetch(`/api/v1/tenants/${organizationId}/release-config`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId, archive: true }),
      });
      
      if (response.ok) {
        // Reload page to refresh list
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to archive: ${error.error}`);
      }
    } catch (error) {
      console.error('[Settings] Archive failed:', error);
      alert('Failed to archive configuration');
    }
  };
  
  const handleSetDefault = async (configId: string) => {
    console.log('[Settings] Set default config:', configId);
    
    try {
      const response = await fetch(`/api/v1/tenants/${organizationId}/release-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: { id: configId, isDefault: true },
        }),
      });
      
      if (response.ok) {
        // Reload page to refresh list
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to set default: ${error.error}`);
      }
    } catch (error) {
      console.error('[Settings] Set default failed:', error);
      alert('Failed to set as default');
    }
  };
  
  return (
    <Container size="xl" className="py-8">
      {stats && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
              <div className="text-sm text-gray-600">Draft</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
              <div className="text-sm text-gray-600">Archived</div>
            </div>
          </div>
        </div>
      )}
      
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

