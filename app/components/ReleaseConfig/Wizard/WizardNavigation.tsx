/**
 * Wizard Navigation Component
 * Previous/Next navigation for wizard steps with brand styling
 */

import { useState } from 'react';
import { Group, Button, Text, useMantineTheme, Modal } from '@mantine/core';
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
  const theme = useMantineTheme();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    onCancel?.();
  };

  const handleKeepEditing = () => {
    setShowCancelModal(false);
  };
  
  return (
    <Group justify="space-between" w="100%">
      {/* Left: Previous */}
      <Group gap="sm">
        {!isFirstStep && (
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onPrevious}
            disabled={isLoading}
            size="sm"
          >
            {WIZARD_NAV_LABELS.PREVIOUS}
          </Button>
        )}
      </Group>
      
      {/* Center: Step indicator */}
      <Text size="xs" fw={600} c={theme.colors.brand[6]} tt="uppercase">
        {WIZARD_NAV_LABELS.STEP_INDICATOR(currentStep + 1, totalSteps)}
      </Text>
      
      {/* Right: Cancel and Next/Finish */}
      <Group gap="sm">
        {onCancel && (
          <Button
            variant="default"
            color="red"
            leftSection={<IconX size={16} />}
            onClick={handleCancelClick}
            disabled={isLoading}
            size="sm"
          >
            {WIZARD_NAV_LABELS.CANCEL}
          </Button>
        )}
        {!isLastStep ? (
          <Button
            color="brand"
            rightSection={<IconArrowRight size={16} />}
            onClick={onNext}
            disabled={!canProceed || isLoading}
            size="sm"
          >
            {WIZARD_NAV_LABELS.NEXT_STEP}
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
            {isEditMode ? WIZARD_NAV_LABELS.UPDATE_CONFIGURATION : WIZARD_NAV_LABELS.SAVE_CONFIGURATION}
          </Button>
        )}
      </Group>

      {/* Cancel Confirmation Modal */}
      <Modal
        opened={showCancelModal}
        onClose={handleKeepEditing}
        title={WIZARD_NAV_LABELS.CANCEL_CONFIRM_TITLE}
        centered
      >
        <Text size="sm" mb="lg">
          {WIZARD_NAV_LABELS.CANCEL_CONFIRM_MESSAGE}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={handleKeepEditing}
            size="sm"
          >
            {WIZARD_NAV_LABELS.CANCEL_CONFIRM_KEEP}
          </Button>
          <Button
            color="red"
            onClick={handleConfirmCancel}
            size="sm"
            leftSection={<IconX size={16} />}
          >
            {WIZARD_NAV_LABELS.CANCEL_CONFIRM_BUTTON}
          </Button>
        </Group>
      </Modal>
    </Group>
  );
}
