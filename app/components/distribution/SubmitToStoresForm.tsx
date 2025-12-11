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
  Checkbox,
  Divider,
  Group,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useFetcher } from '@remix-run/react';
import { IconAlertCircle, IconBrandAndroid, IconBrandApple, IconRocket } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import {
  ANDROID_TRACKS,
  BUTTON_LABELS,
  IOS_RELEASE_TYPES,
  ROLLOUT_PRESETS,
} from '~/constants/distribution.constants';
import { Platform, type SubmitToStoresActionResponse } from '~/types/distribution.types';
import type { SubmitToStoresFormProps } from './distribution.types';

// ============================================================================
// HELPER HOOKS
// ============================================================================

type FormState = {
  selectedPlatforms: Platform[];
  androidTrack: string;
  androidRollout: number;
  androidPriority: number;  // Per API Spec: 0-5, default 0
  iosReleaseType: string;
  iosPhasedRelease: boolean;
  releaseNotes: string;
};

function useFormState(availablePlatforms: Platform[]) {
  const [formState, setFormState] = useState<FormState>({
    selectedPlatforms: [...availablePlatforms],
    androidTrack: 'PRODUCTION',
    androidRollout: 100,
    androidPriority: 0,  // Per API Spec: default 0
    iosReleaseType: 'AFTER_APPROVAL',
    iosPhasedRelease: true,
    releaseNotes: '',
  });

  const fetcher = useFetcher<SubmitToStoresActionResponse>();
  const isSubmitting = fetcher.state === 'submitting';
  const submitError = fetcher.data?.error?.message ?? null;
  const submitSuccess = fetcher.data?.success === true;

  const updateField = useCallback(<K extends keyof FormState>(
    field: K, 
    value: FormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const togglePlatform = useCallback((platform: Platform) => {
    setFormState(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platform)
        ? prev.selectedPlatforms.filter(p => p !== platform)
        : [...prev.selectedPlatforms, platform],
    }));
  }, []);

  return {
    formState,
    updateField,
    togglePlatform,
    fetcher,
    isSubmitting,
    submitError,
    submitSuccess,
  };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PlatformCheckbox({ 
  platform, 
  checked, 
  disabled,
  onChange 
}: { 
  platform: Platform;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      label={
        <Group gap="xs">
          {isAndroid ? <IconBrandAndroid size={16} /> : <IconBrandApple size={16} />}
          <Text size="sm">{isAndroid ? 'Google Play Store' : 'Apple App Store'}</Text>
        </Group>
      }
    />
  );
}

// Per API Spec: priority 0-5
const ANDROID_PRIORITIES = [
  { value: '0', label: '0 - Default' },
  { value: '1', label: '1 - Low' },
  { value: '2', label: '2 - Medium-Low' },
  { value: '3', label: '3 - Medium' },
  { value: '4', label: '4 - Medium-High' },
  { value: '5', label: '5 - High' },
];

function AndroidOptions({ 
  track, 
  rollout,
  priority,
  onTrackChange,
  onRolloutChange,
  onPriorityChange,
  disabled,
}: { 
  track: string;
  rollout: number;
  priority: number;
  onTrackChange: (value: string) => void;
  onRolloutChange: (value: number) => void;
  onPriorityChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Paper p="md" withBorder radius="md" bg="green.0">
      <Group gap="xs" mb="md">
        <IconBrandAndroid size={18} className="text-green-600" />
        <Text fw={500} size="sm">Android Options</Text>
      </Group>
      
      <Stack gap="md">
        <Select
          label="Release Track"
          description="Which track to release to"
          value={track}
          onChange={(v) => v && onTrackChange(v)}
          data={ANDROID_TRACKS.map(t => ({ value: t.value, label: t.label }))}
          disabled={disabled}
        />

        <Select
          label="Update Priority"
          description="How urgently users should update (0-5)"
          value={String(priority)}
          onChange={(v) => v && onPriorityChange(Number(v))}
          data={ANDROID_PRIORITIES}
          disabled={disabled}
        />

        <div>
          <Text size="sm" fw={500} mb="xs">Initial Rollout Percentage</Text>
          <Text size="xs" c="dimmed" mb="sm">
            Start with a lower percentage for staged rollouts
          </Text>
          <Slider
            value={rollout}
            onChange={onRolloutChange}
            min={1}
            max={100}
            marks={ROLLOUT_PRESETS.map(p => ({ value: p, label: `${p}%` }))}
            disabled={disabled}
          />
          <Text size="sm" ta="center" mt="sm" fw={500}>
            {rollout}%
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}

function IOSOptions({ 
  releaseType, 
  phasedRelease,
  onReleaseTypeChange,
  onPhasedReleaseChange,
  disabled,
}: { 
  releaseType: string;
  phasedRelease: boolean;
  onReleaseTypeChange: (value: string) => void;
  onPhasedReleaseChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Paper p="md" withBorder radius="md" bg="blue.0">
      <Group gap="xs" mb="md">
        <IconBrandApple size={18} className="text-blue-600" />
        <Text fw={500} size="sm">iOS Options</Text>
      </Group>
      
      <Stack gap="md">
        <Select
          label="Release Type"
          description="When should the app be released"
          value={releaseType}
          onChange={(v) => v && onReleaseTypeChange(v)}
          data={IOS_RELEASE_TYPES.map(t => ({ value: t.value, label: t.label }))}
          disabled={disabled}
        />

        <Checkbox
          label="Enable Phased Release"
          description="Gradually release to users over 7 days"
          checked={phasedRelease}
          onChange={(e) => onPhasedReleaseChange(e.currentTarget.checked)}
          disabled={disabled}
        />
      </Stack>
    </Paper>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmitToStoresForm(props: SubmitToStoresFormProps) {
  const { 
    releaseId, 
    availablePlatforms,
    hasAndroidActiveRollout,
    onSubmitComplete, 
    onClose,
    className,
  } = props;

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
            <Text fw={500} size="sm" mb="sm">Select Platforms</Text>
            <Stack gap="sm">
              {hasAndroid && (
                <PlatformCheckbox
                  platform={Platform.ANDROID}
                  checked={androidSelected}
                  onChange={() => togglePlatform(Platform.ANDROID)}
                  disabled={isSubmitting}
                />
              )}
              {hasIOS && (
                <PlatformCheckbox
                  platform={Platform.IOS}
                  checked={iosSelected}
                  onChange={() => togglePlatform(Platform.IOS)}
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
                label="Release Notes"
                description="What's new in this version"
                placeholder="Bug fixes and performance improvements..."
                value={formState.releaseNotes}
                onChange={(e) => updateField('releaseNotes', e.target.value)}
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

