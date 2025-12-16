/**
 * SubmitToStoresForm - Form to configure and submit to app stores
 * 
 * Features:
 * - Platform selection (Android/iOS)
 * - Android track selection
 * - iOS release type selection
 * - Initial rollout percentage
 * - Release notes
 */

import {
  Alert,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { IconAlertCircle, IconRocket } from '@tabler/icons-react';
import { useCallback } from 'react';
import {
  BUTTON_LABELS,
  DISTRIBUTION_UI_LABELS,
} from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';
import { AndroidOptions } from './AndroidOptions';
import type { SubmitToStoresFormProps } from './distribution.types';
import { IOSOptions } from './IOSOptions';
import { PlatformCheckbox } from './PlatformCheckbox';
import { useFormState } from './useFormState';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmitToStoresForm({
  releaseId,
  availablePlatforms,
  hasAndroidActiveRollout,
  onSubmitComplete,
  onClose,
  className,
}: SubmitToStoresFormProps) {

  const {
    formState,
    updateField,
    togglePlatform,
    fetcher,
    isSubmitting,
    submitError,
    submitSuccess,
  } = useFormState(availablePlatforms);

  const hasAndroid = availablePlatforms.includes(Platform.ANDROID);
  const hasIOS = availablePlatforms.includes(Platform.IOS);
  const androidSelected = formState.selectedPlatforms.includes(Platform.ANDROID);
  const iosSelected = formState.selectedPlatforms.includes(Platform.IOS);
  const canSubmit = formState.selectedPlatforms.length > 0;

  // Platform toggle handlers
  const handleToggleAndroid = useCallback(() => {
    togglePlatform(Platform.ANDROID);
  }, [togglePlatform]);

  const handleToggleIOS = useCallback(() => {
    togglePlatform(Platform.IOS);
  }, [togglePlatform]);

  // Release notes handler
  const handleReleaseNotesChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateField('releaseNotes', event.currentTarget.value);
  }, [updateField]);

  // Handle submission
  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append('_action', 'submit-to-stores');
    formData.append('platforms', JSON.stringify(formState.selectedPlatforms));

    if (androidSelected) {
      formData.append('android', JSON.stringify({
        track: formState.androidTrack,
        rolloutPercentage: formState.androidRollout,
        priority: formState.androidPriority,  // Per API Spec: 0-5
        releaseNotes: formState.releaseNotes,
      }));
    }

    if (iosSelected) {
      formData.append('ios', JSON.stringify({
        releaseType: formState.iosReleaseType,
        phasedRelease: formState.iosPhasedRelease,
        releaseNotes: formState.releaseNotes,
      }));
    }

    fetcher.submit(formData, { method: 'post' });
  }, [formState, androidSelected, iosSelected, fetcher]);

  // Handle success
  if (submitSuccess && onSubmitComplete) {
    onSubmitComplete();
  }

  return (
    <Stack gap="md" className={className}>
      {/* Active Rollout Warning */}
      {hasAndroidActiveRollout && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="orange" 
          variant="light"
        >
          <Text size="sm">
            A previous release has an active rollout on Play Store. 
            Submitting a new version will replace it.
          </Text>
        </Alert>
      )}

      {/* Error Alert */}
      {submitError && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red" 
          title="Submission Failed"
          variant="light"
        >
          {submitError}
        </Alert>
      )}

      {/* Success Alert */}
      {submitSuccess && (
        <Alert 
          color="green" 
          title="Submission Successful"
          variant="light"
        >
          Your release has been submitted to the selected stores!
        </Alert>
      )}

      {!submitSuccess && (
        <>
          {/* Platform Selection */}
          <div>
            <Text fw={500} size="sm" mb="sm">{DISTRIBUTION_UI_LABELS.SELECT_PLATFORMS}</Text>
            <Stack gap="sm">
              {hasAndroid && (
                <PlatformCheckbox
                  platform={Platform.ANDROID}
                  checked={androidSelected}
                  onChange={handleToggleAndroid}
                  disabled={isSubmitting}
                />
              )}
              {hasIOS && (
                <PlatformCheckbox
                  platform={Platform.IOS}
                  checked={iosSelected}
                  onChange={handleToggleIOS}
                  disabled={isSubmitting}
                />
              )}
            </Stack>
          </div>

          <Divider />

          {/* Platform-specific Options */}
          {androidSelected && (
            <AndroidOptions
              track={formState.androidTrack}
              rollout={formState.androidRollout}
              priority={formState.androidPriority}
              onTrackChange={(v) => updateField('androidTrack', v)}
              onRolloutChange={(v) => updateField('androidRollout', v)}
              onPriorityChange={(v) => updateField('androidPriority', v)}
              disabled={isSubmitting}
            />
          )}

          {iosSelected && (
            <IOSOptions
              releaseType={formState.iosReleaseType}
              phasedRelease={formState.iosPhasedRelease}
              onReleaseTypeChange={(v) => updateField('iosReleaseType', v)}
              onPhasedReleaseChange={(v) => updateField('iosPhasedRelease', v)}
              disabled={isSubmitting}
            />
          )}

          {/* Release Notes */}
          {canSubmit && (
            <>
              <Divider />
              <Textarea
                label={DISTRIBUTION_UI_LABELS.RELEASE_NOTES}
                description={DISTRIBUTION_UI_LABELS.RELEASE_NOTES_DESC}
                placeholder={DISTRIBUTION_UI_LABELS.RELEASE_NOTES_PLACEHOLDER}
                value={formState.releaseNotes}
                onChange={handleReleaseNotesChange}
                minRows={3}
                disabled={isSubmitting}
              />
            </>
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            {onClose && (
              <Button 
                variant="subtle" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                {BUTTON_LABELS.CANCEL}
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={isSubmitting}
              leftSection={<IconRocket size={16} />}
            >
              {BUTTON_LABELS.SUBMIT}
            </Button>
          </Group>
        </>
      )}

      {/* Close button after success */}
      {submitSuccess && onClose && (
        <Group justify="flex-end">
          <Button onClick={onClose}>{BUTTON_LABELS.CLOSE}</Button>
        </Group>
      )}
    </Stack>
  );
}

