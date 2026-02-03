/**
 * Configurations Page
 * Manage release configurations
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Stack,
  Text,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import {
  IconAlertCircle,
  IconRefresh,
  IconSettings,
  IconPlus,
} from '@tabler/icons-react';
import { sanitizeUser } from '~/.server/services/Auth/sanitize-user';
import { Breadcrumb } from '~/components/Common';
import { PageHeader } from '~/components/Common/PageHeader';
import { PageSkeleton } from '~/components/Common/PageSkeleton';
import { BackToReleasesButton } from '~/components/Common/BackToReleasesButton';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { CONFIGURATIONS_SETTINGS_HEADER } from '~/constants/page-headers';
import { ConfigurationsFilter, type ConfigStatusFilter, type ConfigTypeFilter } from '~/components/ReleaseSettings/ConfigurationsFilter';
import { ConfigurationsList } from '~/components/ReleaseSettings/ConfigurationsList';
import { ConfigurationsModals } from '~/components/ReleaseSettings/ConfigurationsModals';
import { useConfig } from '~/contexts/ConfigContext';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { PermissionService } from '~/utils/permissions.server';
import { CONFIG_LIST_LABELS } from '~/constants/release-config-ui';
import { useConfigurationsData } from '~/hooks/useConfigurationsData';
import { useConfigurationsActions } from '~/hooks/useConfigurationsActions';

export const loader = authenticateLoaderRequest(async ({ params, user, request }: LoaderFunctionArgs & { user: any }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }

  // Check if user is owner - only owners can access config settings
  try {
    const isEditor = await PermissionService.isAppEditor(org, user.user.id);
    if (!isEditor) {
      throw redirect(`/dashboard/${org}/releases`);
    }
  } catch (error) {
    console.error('[ReleaseSettings] Permission check failed:', error);
    throw redirect(`/dashboard/${org}/releases`);
  }
  
  // SECURITY: Sanitize user before sending to client (removes tokens)
  return json({ org, user: sanitizeUser(user) });
});

export default function ConfigurationsPage() {
  const theme = useMantineTheme();
  const data = useLoaderData<typeof loader>();
  const { org } = data as any;
  
  const { 
    releaseConfigs, 
    invalidateReleaseConfigs, 
    isLoadingMetadata, 
    isLoadingTenantConfig,
    isLoadingReleaseConfigs,
    releaseConfigsError,
    metadataError,
    tenantConfigError,
    updateReleaseConfigInCache,
  } = useConfig();
  
  const configError = releaseConfigsError || metadataError || tenantConfigError;
  const isLoading = isLoadingMetadata || isLoadingTenantConfig || isLoadingReleaseConfigs;

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConfigStatusFilter>(null);
  const [typeFilter, setTypeFilter] = useState<ConfigTypeFilter>(null);

  // Data processing hook
  const { configurations, filteredConfigs, configCount } = useConfigurationsData({
    releaseConfigs,
    org,
    searchQuery,
    statusFilter,
    typeFilter,
  });

  // Actions hook
  const {
    handleCreate,
    handleEdit,
    handleDuplicate,
    handleArchive,
    confirmArchive,
    archiveModal,
    closeArchiveModal,
    handleUnarchive,
    confirmUnarchive,
    unarchiveModal,
    closeUnarchiveModal,
    handleDelete,
    confirmDelete,
    deleteModal,
    closeDeleteModal,
    handleSetDefault,
    handleExport,
    isProcessing,
  } = useConfigurationsActions({
    org,
    configurations,
    invalidateReleaseConfigs,
    updateReleaseConfigInCache,
  });

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter(null);
    setTypeFilter(null);
  }, []);

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.configurations', { org });

  // Loading state
  if (isLoading) {
    return (
      <PageSkeleton
        showHeader={true}
        showFilterBar={true}
        contentItems={3}
        gridCols={{ base: 1, md: 2, xl: 3 }}
        contentHeight={200}
      />
    );
  }

  // Error state
  if (configError) {
    return (
      <Container size="xl" py={16}>
        <Breadcrumb items={breadcrumbItems} mb={16} />
        <PageHeader
          title={CONFIGURATIONS_SETTINGS_HEADER.TITLE}
          description={CONFIGURATIONS_SETTINGS_HEADER.DESCRIPTION}
          icon={IconSettings}
        />

        <Center py={80}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Text size="lg" fw={500} c={theme.colors.slate[7]}>
              Failed to load configuration
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} maw={400} ta="center">
              {typeof configError === 'string' ? configError : 'An error occurred while loading the configuration. Please try again.'}
            </Text>
            <Button
              variant="light"
              color="brand"
              leftSection={<IconRefresh size={16} />}
              onClick={() => invalidateReleaseConfigs()}
            >
              Try Again
            </Button>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py={16}>
      {/* Header Section */}
      <Breadcrumb items={breadcrumbItems} mb={16} />
      <PageHeader
        title={CONFIGURATIONS_SETTINGS_HEADER.TITLE}
        description={CONFIGURATIONS_SETTINGS_HEADER.DESCRIPTION}
        icon={IconSettings}
        descriptionMaxWidth={600}
        rightSection={
          <Group gap="md">
            <Button
              color="brand"
              leftSection={<IconPlus size={16} />}
              onClick={handleCreate}
              disabled={isProcessing}
            >
              {CONFIG_LIST_LABELS.NEW_CONFIGURATION}
            </Button>
            <BackToReleasesButton />
          </Group>
        }
      />

      {/* Filters */}
      <ConfigurationsFilter
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onClearFilters={handleClearFilters}
        configCount={configCount}
      />

      {/* Configuration List */}
      <ConfigurationsList
        configurations={configurations}
        filteredConfigs={filteredConfigs}
        isLoading={isLoadingReleaseConfigs}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
        onExport={handleExport}
        onSetDefault={handleSetDefault}
        onCreate={handleCreate}
        onClearFilters={handleClearFilters}
      />

      {/* Modals */}
      <ConfigurationsModals
        archiveModal={archiveModal}
        unarchiveModal={unarchiveModal}
        deleteModal={deleteModal}
        configurations={configurations}
        isProcessing={isProcessing}
        onArchiveConfirm={confirmArchive}
        onUnarchiveConfirm={confirmUnarchive}
        onDeleteConfirm={confirmDelete}
        onArchiveClose={closeArchiveModal}
        onUnarchiveClose={closeUnarchiveModal}
        onDeleteClose={closeDeleteModal}
      />
    </Container>
  );
}
