/**
 * Required Pipelines Check Component
 * Validates and displays status of required pipelines
 */

import { Alert, Text, List, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import type { BuildPipelineJob } from '~/types/release-config';

interface RequiredPipelinesCheckProps {
  pipelines: BuildPipelineJob[];
}

interface RequirementStatus {
  name: string;
  met: boolean;
  description: string;
}

export function RequiredPipelinesCheck({ pipelines }: RequiredPipelinesCheckProps) {
  // Check Android requirements
  const hasAndroidPreRegression = pipelines.some(
    p => p.platform === 'ANDROID' && p.environment === 'PRE_REGRESSION' && p.enabled
  );
  
  const hasAndroidRegression = pipelines.some(
    p => p.platform === 'ANDROID' && p.environment === 'REGRESSION' && p.enabled
  );
  
  // Check iOS requirements (only if iOS pipelines exist)
  const hasAnyIOS = pipelines.some(p => p.platform === 'IOS');
  
  const hasIOSPreRegression = pipelines.some(
    p => p.platform === 'IOS' && p.environment === 'PRE_REGRESSION' && p.enabled
  );
  
  const hasIOSRegression = pipelines.some(
    p => p.platform === 'IOS' && p.environment === 'REGRESSION' && p.enabled
  );
  
  const hasIOSTestFlight = pipelines.some(
    p => p.platform === 'IOS' && p.environment === 'TESTFLIGHT' && p.enabled
  );
  
  const requirements: RequirementStatus[] = [
    {
      name: 'Android Pre-Regression',
      met: hasAndroidPreRegression,
      description: 'Required for initial Android builds',
    },
    {
      name: 'Android Regression',
      met: hasAndroidRegression,
      description: 'Required for regression testing builds',
    },
  ];
  
  if (hasAnyIOS) {
    requirements.push(
      {
        name: 'iOS Pre-Regression',
        met: hasIOSPreRegression,
        description: 'Required for initial iOS builds',
      },
      {
        name: 'iOS Regression',
        met: hasIOSRegression,
        description: 'Required for iOS regression testing builds',
      },
      {
        name: 'iOS TestFlight',
        met: hasIOSTestFlight,
        description: 'Required for TestFlight distribution',
      }
    );
  }
  
  const allRequirementsMet = requirements.every(r => r.met);
  const someRequirementsMet = requirements.some(r => r.met);
  
  return (
    <Alert
      icon={
        allRequirementsMet ? (
          <IconCheck size={20} />
        ) : someRequirementsMet ? (
          <IconAlertCircle size={20} />
        ) : (
          <IconX size={20} />
        )
      }
      color={allRequirementsMet ? 'green' : someRequirementsMet ? 'yellow' : 'red'}
      variant="light"
      className="mb-4"
    >
      <Text fw={600} size="sm" className="mb-2">
        {allRequirementsMet
          ? 'All required pipelines configured ✓'
          : 'Required pipelines missing'}
      </Text>
      
      <List
        spacing="xs"
        size="sm"
        center
        icon={
          <ThemeIcon color="gray" size={16} radius="xl">
            <span className="text-xs">•</span>
          </ThemeIcon>
        }
      >
        {requirements.map((req) => (
          <List.Item
            key={req.name}
            icon={
              req.met ? (
                <ThemeIcon color="green" size={16} radius="xl">
                  <IconCheck size={12} />
                </ThemeIcon>
              ) : (
                <ThemeIcon color="red" size={16} radius="xl">
                  <IconX size={12} />
                </ThemeIcon>
              )
            }
          >
            <span className={req.met ? 'text-gray-700' : 'text-red-600 font-medium'}>
              {req.name}
            </span>
            <Text size="xs" c="dimmed" className="ml-1 inline">
              - {req.description}
            </Text>
          </List.Item>
        ))}
      </List>
      
      {!allRequirementsMet && (
        <Text size="xs" c="dimmed" className="mt-2">
          Add the missing pipelines above to continue with the configuration.
        </Text>
      )}
    </Alert>
  );
}

