/**
 * Wizard Navigation Component
 * Previous/Next navigation for wizard steps
 */

import { Group, Button } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  canProceed: boolean;
  isLoading?: boolean;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onFinish,
  canProceed,
  isLoading = false,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  
  return (
    <Group justify="apart" className="w-full pt-6 border-t border-gray-200 flex items-center justify-between">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={18} />}
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
      >
        Previous
      </Button>
      
      <div className="text-sm text-gray-500">
        Step {currentStep + 1} of {totalSteps}
      </div>
      
      {!isLastStep ? (
        <Button
          variant="filled"
          rightSection={<IconArrowRight size={18} />}
          onClick={onNext}
          disabled={!canProceed || isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Next Step
        </Button>
      ) : (
        <Button
          variant="filled"
          leftSection={<IconCheck size={18} />}
          onClick={onFinish}
          disabled={!canProceed || isLoading}
          loading={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          Save Configuration
        </Button>
      )}
    </Group>
  );
}

