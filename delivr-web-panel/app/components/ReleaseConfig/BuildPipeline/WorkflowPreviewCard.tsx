/**
 * Workflow Preview Card Component
 * Displays preview information for a selected workflow
 */

import { Card, Stack, Group, Text } from '@mantine/core';
import { IconServer, IconBrandGithub } from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';
import { PlatformBadge, AppBadge } from '~/components/Common/AppBadge';
import { getBuildProviderLabel } from '~/constants/release-config-ui';
import { ENVIRONMENT_LABELS } from '~/constants/release-config-ui';

interface WorkflowPreviewCardProps {
  workflow: CICDWorkflow;
}

export function WorkflowPreviewCard({ workflow }: WorkflowPreviewCardProps) {
  const isJenkins = workflow.providerType === BUILD_PROVIDERS.JENKINS;
  const environment = workflowTypeToEnvironment[workflow.workflowType] || workflow.workflowType;
  // Handle parameters - can be array of WorkflowParameter objects
  const hasParameters = workflow.parameters && (
    Array.isArray(workflow.parameters) 
      ? workflow.parameters.length > 0 
      : Object.keys(workflow.parameters).length > 0
  );

  // Helper to parse JSON string or object and extract key-value pairs
  const parseParameterValue = (value: any): Array<{ key: string; value: string }> => {
    if (value === null || value === undefined) {
      return [];
    }

    let parsedObj: Record<string, any> | null = null;

    // Try to parse if it's a JSON string
    if (typeof value === 'string') {
      try {
        parsedObj = JSON.parse(value);
      } catch {
        // Not JSON, return as single key-value
        return [{ key: 'value', value: value }];
      }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      parsedObj = value;
    } else {
      // Array or other type, return as single value
      return [{ key: 'value', value: String(value) }];
    }

    // If we have a parsed object, extract all key-value pairs
    if (parsedObj && typeof parsedObj === 'object') {
      return Object.entries(parsedObj).map(([key, val]) => ({
        key,
        value: val === null || val === undefined ? 'N/A' : String(val),
      }));
    }

    return [];
  };

  // Helper to format parameter value for display (for non-nested values)
  const formatParameterValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map(String).join(', ');
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  // Get parameters to display - extract name and defaultValue from each parameter object
  const getParametersToDisplay = () => {
    if (!workflow.parameters) return [];
    
    const allParams: Array<{ key: string; value: string }> = [];
    const seenKeys = new Set<string>(); // Track keys to avoid duplicates
    
    // Helper to add parameter if not duplicate and has value
    const addParam = (key: string, value: string) => {
      // Skip if key already seen (avoid duplicates)
      if (seenKeys.has(key)) {
        return;
      }
      
      // Skip if value is empty, null, undefined, or just whitespace
      const trimmedValue = value?.trim();
      if (!trimmedValue || trimmedValue === 'N/A' || trimmedValue === 'null' || trimmedValue === 'undefined' || trimmedValue === '""' || trimmedValue === "''") {
        return;
      }
      
      seenKeys.add(key);
      allParams.push({ key, value: trimmedValue });
    };
    
    // If it's an array of WorkflowParameter objects
    if (Array.isArray(workflow.parameters)) {
      workflow.parameters.forEach((param) => {
        if (param && typeof param === 'object' && 'name' in param) {
          const paramName = param.name;
          const paramValue = param.defaultValue !== undefined 
            ? param.defaultValue
            : param.type || 'N/A';

          // Check if the value is a JSON object/string that should be broken down
          const parsedPairs = parseParameterValue(paramValue);
          
          if (parsedPairs.length > 1 || (parsedPairs.length === 1 && parsedPairs[0].key !== 'value')) {
            // Multiple key-value pairs or nested object - add each as separate entry without prefix
            parsedPairs.forEach((pair) => {
              addParam(pair.key, pair.value);
            });
          } else {
            // Single value - add as is
            const value = parsedPairs.length > 0 ? parsedPairs[0].value : formatParameterValue(paramValue);
            addParam(paramName, value);
          }
        }
      });
    } else {
      // If it's a key-value object (fallback)
      Object.entries(workflow.parameters).forEach(([key, value]) => {
        const parsedPairs = parseParameterValue(value);
        
        if (parsedPairs.length > 1 || (parsedPairs.length === 1 && parsedPairs[0].key !== 'value')) {
          // Multiple key-value pairs - add each as separate entry without prefix
          parsedPairs.forEach((pair) => {
            addParam(pair.key, pair.value);
          });
        } else {
          // Single value
          const finalValue = parsedPairs.length > 0 ? parsedPairs[0].value : formatParameterValue(value);
          addParam(key, finalValue);
        }
      });
    }

    return allParams.slice(0, 10); // Show up to 10 individual key-value pairs
  };

  const parametersToDisplay = getParametersToDisplay();
  const totalParameters = parametersToDisplay.length;

  return (
    <Card withBorder className="bg-gray-50">
      <Stack gap="xs">
        <Group gap="xs">
          {isJenkins ? (
            <IconServer size={18} className="text-red-600" />
          ) : (
            <IconBrandGithub size={18} />
          )}
          <Text size="sm" fw={600}>
            {workflow.displayName}
          </Text>
        </Group>

        <Group gap="xs">
          <AppBadge
            type="build-provider"
            value={workflow.providerType}
            title={getBuildProviderLabel(workflow.providerType)}
            size="sm"
          />
          <PlatformBadge platform={workflow.platform} size="sm" />
          <AppBadge
            type="build-environment"
            value={environment}
            title={ENVIRONMENT_LABELS[environment as keyof typeof ENVIRONMENT_LABELS] || environment}
            size="sm"
          />
        </Group>

        <div className="bg-white rounded p-2 border border-gray-200">
          <a
            href={workflow.workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono break-all text-xs text-gray-500 hover:text-blue-600 hover:underline"
          >
            {workflow.workflowUrl}
          </a>
        </div>

        {hasParameters && parametersToDisplay.length > 0 && (
          <div>
            <Text size="xs" fw={500} c="dimmed" className="mb-1">
              Parameters:
            </Text>
            <div className="bg-white rounded p-2 border border-gray-200 space-y-1">
              {parametersToDisplay.map((param, index) => (
                <Text key={index} size="xs" className="font-mono">
                  <span className="text-gray-600">{param.key}:</span>{' '}
                  <span className="text-blue-600">{param.value}</span>
                </Text>
              ))}
              {totalParameters > 10 && (
                <Text size="xs" c="dimmed">
                  +{totalParameters - 10} more...
                </Text>
              )}
            </div>
          </div>
        )}
      </Stack>
    </Card>
  );
}

