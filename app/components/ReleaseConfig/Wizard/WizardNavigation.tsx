/**
 * Wizard Navigation Component
 * Previous/Next navigation for wizard steps
 */

import { Group, Button } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconCheck, IconX } from '@tabler/icons-react';
import type { WizardNavigationProps } from '~/types/release-config-props';
import { WIZARD_NAV_LABELS } from '~/constants/release-config-ui';

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
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  console.log('isFirstStep', isFirstStep, 'isLastStep', isLastStep, 'currentStep', currentStep, 'totalSteps', totalSteps, canProceed);
  
  return (
    <Group justify="apart" className="w-full pt-6 border-t border-gray-200">
      {/* Left: Cancel or Previous */}
      <Group gap="sm">
        {onCancel && (
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={18} />}
            onClick={onCancel}
            disabled={isLoading}
          >
            {WIZARD_NAV_LABELS.CANCEL}
          </Button>
        )}
        {!isFirstStep && (
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={onPrevious}
            disabled={isLoading}
          >
            {WIZARD_NAV_LABELS.PREVIOUS}
          </Button>
        )}
      </Group>
      
      {/* Center: Step indicator */}
      <div className="text-sm text-gray-500">
        {WIZARD_NAV_LABELS.STEP_INDICATOR(currentStep + 1, totalSteps)}
      </div>
      
      {/* Right: Next or Finish */}
      {!isLastStep ? (
        <Button
          variant="filled"
          rightSection={<IconArrowRight size={18} />}
          onClick={onNext}
          disabled={!canProceed || isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {WIZARD_NAV_LABELS.NEXT_STEP}
        </Button>
      ) : (
        <Button
          variant="filled"
          leftSection={<IconCheck size={18} />}
          onClick={onFinish}
          loading={isLoading}
          disabled={!canProceed}
          className="bg-green-600 hover:bg-green-700"
        >
          {isEditMode ? WIZARD_NAV_LABELS.UPDATE_CONFIGURATION : WIZARD_NAV_LABELS.SAVE_CONFIGURATION}
        </Button>
      )}
    </Group>
  );
}

