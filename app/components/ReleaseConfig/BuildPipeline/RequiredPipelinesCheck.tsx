/**
 * Required Pipelines Check Component
 * Validates and displays status of required pipelines
 */

import { Alert, Text, List, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import type { RequiredPipelinesCheckProps } from '~/types/release-config-props';
import { PLATFORMS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { ICON_SIZES, PIPELINE_REQUIREMENTS } from '~/constants/release-config-ui';

interface RequirementStatus {
  name: string;
  met: boolean;
  description: string;
}

export function RequiredPipelinesCheck({ pipelines, selectedPlatforms }: RequiredPipelinesCheckProps) {
  // Check which platforms are actually being used
  const hasAnyAndroid = pipelines.some(p => p.platform === PLATFORMS.ANDROID);
  const hasAnyIOS = pipelines.some(p => p.platform === PLATFORMS.IOS);
  
  // Check Android requirements (only Regression is required, Pre-Regression is optional)
  const hasAndroidRegression = pipelines.some(
    p => p.platform === PLATFORMS.ANDROID && p.environment === BUILD_ENVIRONMENTS.REGRESSION && p.enabled
  );
  
  // Check iOS requirements (Regression + TestFlight required, Pre-Regression is optional)
  const hasIOSRegression = pipelines.some(
    p => p.platform === PLATFORMS.IOS && p.environment === BUILD_ENVIRONMENTS.REGRESSION && p.enabled
  );
  
  const hasIOSTestFlight = pipelines.some(
    p => p.platform === PLATFORMS.IOS && p.environment === BUILD_ENVIRONMENTS.TESTFLIGHT && p.enabled
  );
  
  const requirements: RequirementStatus[] = [];
  
  // Add Android requirements
  if (hasAnyAndroid) {
    requirements.push({
      name: PIPELINE_REQUIREMENTS.ANDROID_REGRESSION,
      met: hasAndroidRegression,
      description: PIPELINE_REQUIREMENTS.ANDROID_REGRESSION_DESC,
    });
  }
  
  // Add iOS requirements
  if (hasAnyIOS) {
    requirements.push(
      {
        name: PIPELINE_REQUIREMENTS.IOS_REGRESSION,
        met: hasIOSRegression,
        description: PIPELINE_REQUIREMENTS.IOS_REGRESSION_DESC,
      },
      {
        name: PIPELINE_REQUIREMENTS.IOS_TESTFLIGHT,
        met: hasIOSTestFlight,
        description: PIPELINE_REQUIREMENTS.IOS_TESTFLIGHT_DESC,
      }
    );
  }
  
  const allRequirementsMet = requirements.every(r => r.met);
  const someRequirementsMet = requirements.some(r => r.met);
  
  return (
    <Alert
      icon={
        allRequirementsMet ? (
          <IconCheck size={ICON_SIZES.MEDIUM} />
        ) : someRequirementsMet ? (
          <IconAlertCircle size={ICON_SIZES.MEDIUM} />
        ) : (
          <IconX size={ICON_SIZES.MEDIUM} />
        )
      }
      color={allRequirementsMet ? 'green' : someRequirementsMet ? 'yellow' : 'red'}
      variant="light"
      className="mb-4"
    >
      <Text fw={600} size="sm" className="mb-2">
        {allRequirementsMet
          ? PIPELINE_REQUIREMENTS.ALL_CONFIGURED
          : PIPELINE_REQUIREMENTS.MISSING_PIPELINES}
      </Text>
      
      <List
        spacing="xs"
        size="sm"
        center
        icon={
          <ThemeIcon color="gray" size={ICON_SIZES.SMALL} radius="xl">
            <span className="text-xs">•</span>
          </ThemeIcon>
        }
      >
        {requirements.map((req) => (
          <List.Item
            key={req.name}
            icon={
              req.met ? (
                <ThemeIcon color="green" size={ICON_SIZES.SMALL} radius="xl">
                  <IconCheck size={ICON_SIZES.EXTRA_SMALL} />
                </ThemeIcon>
              ) : (
                <ThemeIcon color="red" size={ICON_SIZES.SMALL} radius="xl">
                  <IconX size={ICON_SIZES.EXTRA_SMALL} />
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
          {PIPELINE_REQUIREMENTS.ADD_MISSING_HINT}
        </Text>
      )}
    </Alert>
  );
}
