/**
 * JIRA Platform Configuration Card
 * Displays configuration fields for a single platform (Web/iOS/Android)
 */

import { useState, useEffect, useRef } from 'react';
import { Card, TextInput, Select, Stack, Text, Badge, Loader } from '@mantine/core';
import type { JiraPlatformConfig } from '~/types/release-config';
import type { JiraPlatformConfigCardProps } from '~/types/release-config-props';
import {
  JIRA_PLATFORM_CONFIG,
  JIRA_PRIORITIES,
} from '~/constants/release-config';
import { JIRA_LABELS, JIRA_FIELD_NAMES, VALIDATION_MESSAGES } from '~/constants/release-config-ui';
import { apiGet, getApiErrorMessage } from '~/utils/api-client';

interface JiraStatus {
  id: string;
  name: string;
  category: string;
}

interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
  description?: string;
}

interface StatusOption {
  value: string;
  label: string;
}

interface IssueTypeOption {
  value: string;
  label: string;
}

export function JiraPlatformConfigCard({
  platform,
  config,
  onChange,
  integrationId,
  tenantId,
  projects = [],
}: JiraPlatformConfigCardProps) {
  const platformConfig = JIRA_PLATFORM_CONFIG[platform];
  
  // Track previous project key to detect changes
  const previousProjectKeyRef = useRef<string>('');
  
  // State for completion statuses
  const [completionStatuses, setCompletionStatuses] = useState<StatusOption[]>([
    { value: 'Done', label: 'Done' } // Default fallback
  ]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);

  // State for issue types
  const [issueTypes, setIssueTypes] = useState<IssueTypeOption[]>([
    { value: 'Task', label: 'Task' } // Default fallback
  ]);
  const [loadingIssueTypes, setLoadingIssueTypes] = useState(false);
  const [issueTypesError, setIssueTypesError] = useState<string | null>(null);

  const handleChange = (field: keyof JiraPlatformConfig['parameters'], value: unknown) => {
    onChange({
      ...config,
      parameters: {
        ...config.parameters,
        [field]: value,
      },
    });
  };

  // Prepare project options for dropdown
  const projectOptions = projects.map(project => ({
    value: project.key,
    label: `${project.key} - ${project.name}`,
  }));

  // Get current project key
  const projectKey = (config.parameters?.projectKey as string) || '';

  // Fetch Jira metadata (statuses and issue types) when project key changes
  useEffect(() => {
    const fetchMetadata = async () => {
      // Don't fetch if no project key or no integration
      if (!projectKey || !integrationId) {
        setCompletionStatuses([{ value: 'Done', label: 'Done' }]);
        setIssueTypes([{ value: 'Task', label: 'Task' }]);
        previousProjectKeyRef.current = '';
        return;
      }

      // Clear previously selected issue type and completion status when project key changes
      // (but not on initial load when previousProjectKeyRef is empty)
      if (previousProjectKeyRef.current && previousProjectKeyRef.current !== projectKey) {
        if (config.parameters?.issueType || config.parameters?.completedStatus) {
          onChange({
            ...config,
            parameters: {
              ...config.parameters,
              issueType: '',
              completedStatus: '',
            },
          });
        }
      }

      // Update the previous project key ref
      previousProjectKeyRef.current = projectKey;

      // Fetch project metadata (statuses and issue types)
      setLoadingStatuses(true);
      setLoadingIssueTypes(true);
      setStatusesError(null);
      setIssueTypesError(null);

      try {
        const metadataResult = await apiGet<{ statuses: JiraStatus[]; issueTypes: JiraIssueType[] }>(
          `/api/v1/tenants/${tenantId}/integrations/project-management/${integrationId}/jira/metadata/project-metadata?projectKey=${projectKey}`
        );

        if (!metadataResult.success || !metadataResult.data) {
          throw new Error('Invalid metadata response format');
        }

        const { statuses, issueTypes: issueTypesData } = metadataResult.data;

        // Process statuses
        if (statuses && Array.isArray(statuses)) {
          const allStatuses = statuses.map((status) => ({
            value: status.name,
            label: status.name,
          }));
          setCompletionStatuses(allStatuses.length > 0 ? allStatuses : [{ value: 'Done', label: 'Done' }]);
        } else {
          throw new Error('Invalid statuses response format');
        }

        // Process issue types (filter out subtasks)
        if (issueTypesData && Array.isArray(issueTypesData)) {
          const mainIssueTypes = issueTypesData
            .filter((type) => !type.subtask)
            .map((type) => ({
              value: type.name,
              label: type.name,
            }));
          setIssueTypes(mainIssueTypes.length > 0 ? mainIssueTypes : [{ value: 'Task', label: 'Task' }]);
        } else {
          throw new Error('Invalid issue types response format');
        }
      } catch (error) {
        console.error('Failed to fetch Jira metadata:', error);
        const errorMessage = getApiErrorMessage(error, 'Failed to load Jira metadata');
        
        // Check which one failed and set appropriate error
        if (error instanceof Error && error.message.includes('statuses')) {
          setStatusesError(errorMessage);
          setCompletionStatuses([{ value: 'Done', label: 'Done' }]);
        }
        if (error instanceof Error && error.message.includes('issue types')) {
          setIssueTypesError(errorMessage);
          setIssueTypes([{ value: 'Task', label: 'Task' }]);
        }
        
        // If generic error, set both
        if (!error || !(error instanceof Error) || (!error.message.includes('statuses') && !error.message.includes('issue types'))) {
          setStatusesError(errorMessage);
          setIssueTypesError(errorMessage);
          setCompletionStatuses([{ value: 'Done', label: 'Done' }]);
          setIssueTypes([{ value: 'Task', label: 'Task' }]);
        }
      } finally {
        setLoadingStatuses(false);
        setLoadingIssueTypes(false);
      }
    };

    fetchMetadata();
  }, [projectKey, integrationId, tenantId]);

  return (
    <Card withBorder p="md" radius="md">
      {/* Platform Header */}
      <div className="flex items-center gap-2 mb-4">
        <Badge color={platformConfig.color} variant="light" size="sm">
          {platform}
        </Badge>
      </div>

      <Stack gap="md">
        {/* Project Key - Required - Now a dropdown if projects are available */}
        {projects.length > 0 ? (
          <Select
            label={JIRA_LABELS.PROJECT_KEY}
            placeholder={JIRA_LABELS.PROJECT_KEY_PLACEHOLDER}
            description={JIRA_LABELS.PROJECT_KEY_DESCRIPTION}
            data={projectOptions}
            value={(config.parameters?.projectKey as string) || null}
            onChange={(value) => handleChange(JIRA_FIELD_NAMES.PROJECT_KEY, value || '')}
            required
            searchable
            error={
              config.parameters?.projectKey && typeof config.parameters.projectKey === 'string' && !/^[A-Z][A-Z0-9]*$/.test(config.parameters.projectKey)
                ? VALIDATION_MESSAGES.JIRA_PROJECT_KEY_INVALID
                : undefined
            }
          />
        ) : (
          <TextInput
            label={JIRA_LABELS.PROJECT_KEY}
            placeholder={JIRA_LABELS.PROJECT_KEY_PLACEHOLDER}
            description={JIRA_LABELS.PROJECT_KEY_DESCRIPTION}
            value={(config.parameters?.projectKey as string) || ''}
            onChange={(e) => handleChange(JIRA_FIELD_NAMES.PROJECT_KEY, e.target.value.toUpperCase())}
            required
            error={
              config.parameters?.projectKey && typeof config.parameters.projectKey === 'string' && !/^[A-Z][A-Z0-9]*$/.test(config.parameters.projectKey)
                ? VALIDATION_MESSAGES.JIRA_PROJECT_KEY_INVALID
                : undefined
            }
          />
        )}

        {/* Issue Type - Required */}
        <Select
          label={JIRA_LABELS.ISSUE_TYPE}
          placeholder={
            !projectKey 
              ? 'Select project first'
              : loadingIssueTypes
                ? 'Loading issue types...'
                : JIRA_LABELS.ISSUE_TYPE_PLACEHOLDER
          }
          description={
            issueTypesError 
              ? `${JIRA_LABELS.ISSUE_TYPE_DESCRIPTION} (${issueTypesError})` 
              : JIRA_LABELS.ISSUE_TYPE_DESCRIPTION
          }
          data={issueTypes}
          value={(config.parameters?.issueType as string) || null}
          onChange={(value) => handleChange(JIRA_FIELD_NAMES.ISSUE_TYPE, value || '')}
          required
          searchable
          disabled={!projectKey || loadingIssueTypes}
          rightSection={loadingIssueTypes ? <Loader size="xs" /> : undefined}
          error={issueTypesError ? 'Using default issue types due to fetch error' : undefined}
        />

        {/* Completion Status - Required */}
        <Select
          label={JIRA_LABELS.COMPLETION_STATUS}
          placeholder={
            !projectKey 
              ? 'Select project first'
              : loadingStatuses
                ? 'Loading statuses...'
                : JIRA_LABELS.COMPLETION_STATUS_PLACEHOLDER
          }
          description={
            statusesError 
              ? `${JIRA_LABELS.COMPLETION_STATUS_DESCRIPTION} (${statusesError})` 
              : JIRA_LABELS.COMPLETION_STATUS_DESCRIPTION
          }
          data={completionStatuses}
          value={(config.parameters?.completedStatus as string) || null}
          onChange={(value) => handleChange(JIRA_FIELD_NAMES.COMPLETED_STATUS, value || '')}
          required
          searchable
          disabled={!projectKey || loadingStatuses}
          rightSection={loadingStatuses ? <Loader size="xs" /> : undefined}
          error={statusesError ? 'Using default statuses due to fetch error' : undefined}
        />

        {/* Priority - Optional */}
        <Select
          label={JIRA_LABELS.PRIORITY}
          placeholder={JIRA_LABELS.PRIORITY_PLACEHOLDER}
          description={JIRA_LABELS.PRIORITY_DESCRIPTION}
          data={JIRA_PRIORITIES}
          value={(config.parameters?.priority as string) || null}
          onChange={(value) => handleChange(JIRA_FIELD_NAMES.PRIORITY, value || undefined)}
          clearable
        />
      </Stack>
    </Card>
  );
}

