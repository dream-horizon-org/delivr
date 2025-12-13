/**
 * Wizard Navigation Component
 * Previous/Next navigation for wizard steps with brand styling
 */

import { Group, Button, Text, useMantineTheme } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconCheck, IconX } from '@tabler/icons-react';
import type { WizardNavigationProps } from '~/types/release-config-props';

export function WizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onFinish,
  onCancel,
  canProceed,
  isLoading = false,
  isEditMode = false,
}: WizardNavigationProps) {
  const theme = useMantineTheme();
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  
  return (
    <Group justify="space-between" w="100%">
      {/* Left: Cancel or Previous */}
      <Group gap="sm">
        {onCancel && (
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={16} />}
            onClick={onCancel}
            disabled={isLoading}
            size="sm"
          >
            Cancel
          </Button>
        )}
        {!isFirstStep && (
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onPrevious}
            disabled={isLoading}
            size="sm"
          >
            Previous
          </Button>
        )}
      </Group>
      
      {/* Center: Step indicator */}
      <Text size="sm" c={theme.colors.slate[5]}>
        Step {currentStep + 1} of {totalSteps}
      </Text>
      
      {/* Right: Next or Finish */}
      {!isLastStep ? (
        <Button
          color="brand"
          rightSection={<IconArrowRight size={16} />}
          onClick={onNext}
          disabled={!canProceed || isLoading}
          size="sm"
        >
          Continue
        </Button>
      ) : (
        <Button
          color="green"
          leftSection={<IconCheck size={16} />}
          onClick={onFinish}
          loading={isLoading}
          disabled={!canProceed}
          size="sm"
        >
          {isEditMode ? 'Update Configuration' : 'Save Configuration'}
        </Button>
      )}
    </Group>
  );
}
