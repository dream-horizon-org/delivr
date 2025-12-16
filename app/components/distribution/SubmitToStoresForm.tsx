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
import { useCallback, useMemo } from 'react';
import {
    BUTTON_LABELS,
    DISTRIBUTION_UI_LABELS,
    ERROR_MESSAGES,
    FORM_ICON_SIZES,
    SUCCESS_MESSAGES,
    WARNING_MESSAGES,
} from '~/constants/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import { Platform, SubmissionStatus } from '~/types/distribution.types';
import { AndroidOptions } from './AndroidOptions';
import { ArtifactDisplay } from './ArtifactDisplay';
import type { SubmitToStoresFormProps } from './distribution.types';
import { IOSOptions } from './IOSOptions';
import { PlatformCheckbox } from './PlatformCheckbox';
import { useFormState } from './useFormState';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmitToStoresForm({
  releaseId,
  distributionId,
  submissions,
  hasAndroidActiveRollout,
  onSubmitComplete,
  onClose,
  className,
  isFirstSubmission,
  androidArtifact,
  iosArtifact,
}: SubmitToStoresFormProps) {

  // Extract PENDING submissions and available platforms
  const pendingSubmissions = useMemo(
    () => submissions.filter(s => s.status === SubmissionStatus.PENDING),
    [submissions]
  );
  
  const availablePlatforms = useMemo(
    () => pendingSubmissions.map(s => s.platform),
    [pendingSubmissions]
  );
  
  const androidSubmission = useMemo(
    () => pendingSubmissions.find(s => s.platform === Platform.ANDROID),
    [pendingSubmissions]
  );
  
  const iosSubmission = useMemo(
    () => pendingSubmissions.find(s => s.platform === Platform.IOS),
    [pendingSubmissions]
  );

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

  // Android option handlers - NO INLINE FUNCTIONS
  // Note: Track handler removed - track not used per API spec
  const handleAndroidRolloutChange = useCallback((value: number) => {
    updateField('androidRollout', value);
  }, [updateField]);

  const handleAndroidPriorityChange = useCallback((value: number) => {
    updateField('androidPriority', value);
  }, [updateField]);

  // iOS option handlers - NO INLINE FUNCTIONS
  // Note: iOS release type is always "AFTER_APPROVAL" per API spec (non-editable)
  const handleIOSPhasedReleaseChange = useCallback((value: boolean) => {
    updateField('iosPhasedRelease', value);
  }, [updateField]);

  const handleIOSResetRatingChange = useCallback((value: boolean) => {
    updateField('iosResetRating', value);
  }, [updateField]);

  // Handle submission - Submit per platform separately
  const handleSubmit = useCallback(async () => {
    const errors: string[] = [];
    const succeeded: Platform[] = [];
    
    // Submit Android (if selected)
    if (androidSelected && androidSubmission) {
      try {
        const androidPayload = {
          rolloutPercentage: formState.androidRollout,
          inAppUpdatePriority: formState.androidPriority,
          releaseNotes: formState.releaseNotes,
        };
        
        await fetcher.submit(
          JSON.stringify(androidPayload),
          {
            method: 'PUT',
            action: `/api/v1/submissions/${androidSubmission.id}/submit?platform=ANDROID`,
            encType: 'application/json',
          }
        );
        
        succeeded.push(Platform.ANDROID);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Android: ${errorMessage}`);
      }
    }
    
    // Submit iOS (if selected)
    if (iosSelected && iosSubmission) {
      try {
        const iosPayload = {
          phasedRelease: formState.iosPhasedRelease,
          resetRating: formState.iosResetRating,
          releaseNotes: formState.releaseNotes,
        };
        
        await fetcher.submit(
          JSON.stringify(iosPayload),
          {
            method: 'PUT',
            action: `/api/v1/submissions/${iosSubmission.id}/submit?platform=IOS`,
            encType: 'application/json',
          }
        );
        
        succeeded.push(Platform.IOS);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`iOS: ${errorMessage}`);
      }
    }
    
    // Handle results
    if (succeeded.length > 0 && errors.length === 0) {
      // Full success
      if (onSubmitComplete) {
        onSubmitComplete();
      }
    } else if (succeeded.length > 0 && errors.length > 0) {
      // Partial success - show warning
      console.warn(`Partial submit: ${succeeded.join(', ')} succeeded. Errors: ${errors.join('; ')}`);
    } else if (errors.length > 0) {
      // Complete failure
      console.error(`Submit failed: ${errors.join('; ')}`);
    }
  }, [
    formState,
    androidSelected,
    iosSelected,
    androidSubmission,
    iosSubmission,
    fetcher,
    onSubmitComplete,
  ]);

  // Handle success
  if (submitSuccess && onSubmitComplete) {
    onSubmitComplete();
  }

  return (
    <Stack gap={DS_SPACING.MD} className={className}>
      {/* Active Rollout Warning */}
      {hasAndroidActiveRollout && (
        <Alert 
          icon={<IconAlertCircle size={FORM_ICON_SIZES.ALERT} />} 
          color={DS_COLORS.STATUS.WARNING}
          variant="light"
          radius={DS_SPACING.BORDER_RADIUS}
        >
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>
            {WARNING_MESSAGES.ACTIVE_ANDROID_ROLLOUT}
          </Text>
        </Alert>
      )}

      {/* Error Alert */}
      {submitError && (
        <Alert 
          icon={<IconAlertCircle size={FORM_ICON_SIZES.ALERT} />} 
          color={DS_COLORS.STATUS.ERROR}
          title={ERROR_MESSAGES.SUBMISSION_FAILED_TITLE}
          variant="light"
          radius={DS_SPACING.BORDER_RADIUS}
        >
          {submitError}
        </Alert>
      )}

      {/* Success Alert */}
      {submitSuccess && (
        <Alert 
          color={DS_COLORS.STATUS.SUCCESS}
          title={SUCCESS_MESSAGES.SUBMISSION_SUCCESSFUL_TITLE}
          variant="light"
          radius={DS_SPACING.BORDER_RADIUS}
        >
          {SUCCESS_MESSAGES.SUBMISSION_SUCCESSFUL_MESSAGE}
        </Alert>
      )}

      {!submitSuccess && (
        <>
          {/* Platform Selection */}
          <div>
            <Text fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} size={DS_TYPOGRAPHY.SIZE.SM} mb={DS_SPACING.SM}>{DISTRIBUTION_UI_LABELS.SELECT_PLATFORMS}</Text>
            <Stack gap={DS_SPACING.SM}>
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

          {/* Artifact Display (First Submission) or Build Upload (Resubmission) */}
          {isFirstSubmission && androidSelected && androidArtifact && (
            <ArtifactDisplay
              platform={Platform.ANDROID}
              artifactName={androidArtifact.name}
              artifactSize={androidArtifact.size}
              internalTrackLink={androidArtifact.internalTrackLink}  // Renamed from internalTestingLink
            />
          )}

          {isFirstSubmission && iosSelected && iosArtifact && (
            <ArtifactDisplay
              platform={Platform.IOS}
              buildNumber={iosArtifact.buildNumber}
              testflightLink={iosArtifact.testflightLink}
            />
          )}

          <Divider />

          {/* Platform-specific Options */}
          {androidSelected && (
            <AndroidOptions
              rollout={formState.androidRollout}
              priority={formState.androidPriority}
              onRolloutChange={handleAndroidRolloutChange}
              onPriorityChange={handleAndroidPriorityChange}
              disabled={isSubmitting}
            />
          )}

          {iosSelected && (
            <IOSOptions
              phasedRelease={formState.iosPhasedRelease}
              resetRating={formState.iosResetRating}
              onPhasedReleaseChange={handleIOSPhasedReleaseChange}
              onResetRatingChange={handleIOSResetRatingChange}
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
          <Group justify="flex-end" mt={DS_SPACING.LG}>
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
              leftSection={<IconRocket size={FORM_ICON_SIZES.BUTTON} />}
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

