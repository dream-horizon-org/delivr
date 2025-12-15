/**
 * Update Release Form Component
 * 
 * Form for updating an existing release with business rule validations
 */

import { useState, useEffect } from 'react';
import { Modal, Stack, Button, Group, Text, Alert, Select, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useQueryClient } from 'react-query';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { RELEASE_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import { apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { invalidateReleases } from '~/utils/cache-invalidation';
import type { UpdateReleaseState, UpdateReleaseBackendRequest } from '~/types/release-creation-backend';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { convertUpdateStateToBackendRequest, extractDateAndTime } from '~/utils/release-creation-converter';
import { RELEASE_TYPES } from '~/types/release-config-constants';
import { DateTimeInput } from '~/components/ReleaseCreation/DateTimeInput';

interface UpdateReleaseFormProps {
  opened: boolean;
  onClose: () => void;
  release: BackendReleaseResponse;
  tenantId: string;
  onSuccess: () => void;
}

export function UpdateReleaseForm({
  opened,
  onClose,
  release,
  tenantId,
  onSuccess,
}: UpdateReleaseFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<UpdateReleaseState>({});

  // Initialize state from release data
  useEffect(() => {
    if (opened && release) {
      const kickOffDate = release.kickOffDate ? extractDateAndTime(release.kickOffDate) : undefined;
      const targetReleaseDate = release.targetReleaseDate ? extractDateAndTime(release.targetReleaseDate) : undefined;
      const kickOffReminderDate = release.kickOffReminderDate ? extractDateAndTime(release.kickOffReminderDate) : undefined;

      setState({
        type: release.type,
        branch: release.branch || undefined,
        baseBranch: release.baseBranch || undefined,
        baseReleaseId: release.baseReleaseId || undefined,
        kickOffDate: kickOffDate?.date,
        kickOffTime: kickOffDate?.time,
        targetReleaseDate: targetReleaseDate?.date,
        targetReleaseTime: targetReleaseDate?.time,
        kickOffReminderDate: kickOffReminderDate?.date,
        kickOffReminderTime: kickOffReminderDate?.time,
        hasManualBuildUpload: release.hasManualBuildUpload,
        platformTargetMappings: release.platformTargetMappings?.map(mapping => ({
          id: mapping.id,
          platform: mapping.platform as 'ANDROID' | 'IOS' | 'WEB',
          target: mapping.target as 'PLAY_STORE' | 'APP_STORE' | 'WEB',
          version: mapping.version,
          projectManagementRunId: mapping.projectManagementRunId || null,
          testManagementRunId: mapping.testManagementRunId || null,
        })),
        cronConfig: release.cronJob?.cronConfig as any,
        upcomingRegressions: release.cronJob?.upcomingRegressions?.map((reg: { date: string; config: Record<string, unknown> }) => ({
          date: reg.date,
          config: reg.config,
        })),
      });
      setErrors({});
    }
  }, [opened, release]);

  const handleChange = (updates: Partial<UpdateReleaseState>) => {
    setState(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const updatedFields = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => {
        delete newErrors[field];
      });
      return newErrors;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      // Convert state to backend request
      const updateRequest = convertUpdateStateToBackendRequest(state);

      // Only send fields that have been changed (not undefined)
      const request: UpdateReleaseBackendRequest = {};
      if (updateRequest.type !== undefined) request.type = updateRequest.type;
      if (updateRequest.branch !== undefined) request.branch = updateRequest.branch;
      if (updateRequest.baseBranch !== undefined) request.baseBranch = updateRequest.baseBranch;
      if (updateRequest.baseReleaseId !== undefined) request.baseReleaseId = updateRequest.baseReleaseId;
      if (updateRequest.kickOffDate !== undefined) request.kickOffDate = updateRequest.kickOffDate;
      if (updateRequest.kickOffReminderDate !== undefined) request.kickOffReminderDate = updateRequest.kickOffReminderDate;
      if (updateRequest.targetReleaseDate !== undefined) request.targetReleaseDate = updateRequest.targetReleaseDate;
      if (updateRequest.platformTargetMappings !== undefined) request.platformTargetMappings = updateRequest.platformTargetMappings;
      if (updateRequest.cronJob !== undefined) request.cronJob = updateRequest.cronJob;
      if (updateRequest.hasManualBuildUpload !== undefined) request.hasManualBuildUpload = updateRequest.hasManualBuildUpload;
      if (updateRequest.releasePilotAccountId !== undefined) request.releasePilotAccountId = updateRequest.releasePilotAccountId;

      // Validate at least one field is being updated
      if (Object.keys(request).length === 0) {
        setErrors({ _general: 'Please make at least one change before saving' });
        setIsSubmitting(false);
        return;
      }

      console.log('[UpdateRelease] Submitting update:', JSON.stringify(request, null, 2));

      const result = await apiPatch<{ success: boolean; release?: BackendReleaseResponse; error?: string }>(
        `/api/v1/tenants/${tenantId}/releases/${release.id}`,
        request
      );

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to update release');
      }

      // Invalidate releases query to refetch all releases
      await invalidateReleases(queryClient, tenantId);

      showSuccessToast(RELEASE_MESSAGES.UPDATE_SUCCESS);
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to update release');
      console.error('[UpdateRelease] Failed to update release:', errorMessage);
      showErrorToast(getErrorMessage(errorMessage, RELEASE_MESSAGES.UPDATE_ERROR.title));
      
      // Set general error if it's a validation error
      if (errorMessage.includes('must be') || errorMessage.includes('cannot')) {
        setErrors({ _general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if release can be edited (business rules)
  const canEditBeforeKickoff = !release.kickOffDate || new Date() < new Date(release.kickOffDate);
  const isInProgress = release.status === 'IN_PROGRESS';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Update Release"
      size="xl"
      closeOnClickOutside={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <Stack gap="md">
        {/* Business Rules Info */}
        {!isInProgress && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Cannot Edit">
            Only IN_PROGRESS releases can be updated. Current status: {release.status}
          </Alert>
        )}

        {isInProgress && !canEditBeforeKickoff && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="Limited Editing">
            Kickoff has passed. Only target release date can be updated.
          </Alert>
        )}

        {/* General Error */}
        {errors._general && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {errors._general}
          </Alert>
        )}

        {/* Release Type - Only editable before kickoff */}
        {canEditBeforeKickoff && (
          <Select
            label="Release Type"
            data={[
              { value: RELEASE_TYPES.MINOR, label: 'Minor Release' },
              { value: RELEASE_TYPES.HOTFIX, label: 'Hotfix' },
              { value: 'UNPLANNED', label: 'Unplanned' },
            ]}
            value={state.type || release.type}
            onChange={(value) => handleChange({ type: value as any })}
            error={errors.type}
          />
        )}

        {/* Branch - Only editable before kickoff */}
        {canEditBeforeKickoff && (
          <TextInput
            label="Branch"
            placeholder="e.g., release/v1.0.0"
            value={state.branch || ''}
            onChange={(e) => handleChange({ branch: e.target.value || undefined })}
            error={errors.branch}
            description="Release branch name"
          />
        )}

        {/* Base Branch - Only editable before kickoff */}
        {canEditBeforeKickoff && (
          <TextInput
            label="Base Branch"
            placeholder="e.g., main"
            value={state.baseBranch || ''}
            onChange={(e) => handleChange({ baseBranch: e.target.value || undefined })}
            error={errors.baseBranch}
            description="Base branch to fork from"
          />
        )}

        {/* Kickoff Date - Only editable before kickoff */}
        {canEditBeforeKickoff && (
          <DateTimeInput
            dateLabel="Kickoff Date"
            timeLabel="Kickoff Time"
            dateValue={state.kickOffDate || ''}
            timeValue={state.kickOffTime || ''}
            onDateChange={(date) => handleChange({ kickOffDate: date })}
            onTimeChange={(time) => handleChange({ kickOffTime: time })}
            dateError={errors.kickOffDate}
            dateDescription="When the release kickoff will occur"
          />
        )}

        {/* Kickoff Reminder Date - Only editable before kickoff */}
        {canEditBeforeKickoff && (
          <DateTimeInput
            dateLabel="Kickoff Reminder Date"
            timeLabel="Kickoff Reminder Time"
            dateValue={state.kickOffReminderDate || ''}
            timeValue={state.kickOffReminderTime || ''}
            onDateChange={(date) => handleChange({ kickOffReminderDate: date })}
            onTimeChange={(time) => handleChange({ kickOffReminderTime: time })}
            dateError={errors.kickOffReminderDate}
            dateDescription="Reminder before kickoff"
            required={false}
          />
        )}

        {/* Target Release Date - Always editable */}
        <DateTimeInput
          dateLabel="Target Release Date"
          timeLabel="Target Release Time"
          dateValue={state.targetReleaseDate || ''}
          timeValue={state.targetReleaseTime || ''}
          onDateChange={(date) => handleChange({ targetReleaseDate: date })}
          onTimeChange={(time) => handleChange({ targetReleaseTime: time })}
          dateError={errors.targetReleaseDate}
          dateDescription="When the release should be completed"
        />

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            leftSection={!isSubmitting && <IconCheck size={16} />}
            disabled={!isInProgress}
          >
            Update Release
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

