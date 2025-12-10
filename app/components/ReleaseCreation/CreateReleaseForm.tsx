/**
 * Create Release Form Component
 * 
 * Single form for creating a release with review modal.
 * All form sections are displayed at once.
 */

import { useState, useEffect } from 'react';
import { Stack, Button, Paper, Group, ScrollArea, Alert, Text, List } from '@mantine/core';
import { IconRocket, IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { useNavigate } from '@remix-run/react';
import { showErrorToast, showWarningToast, showSuccessToast } from '~/utils/toast';
import { RELEASE_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import { useConfig } from '~/contexts/ConfigContext';
import { useDraftStorage } from '~/hooks/useDraftStorage';
import { ConfigurationSelector } from './ConfigurationSelector';
import { ReleaseDetailsForm } from './ReleaseDetailsForm';
import { ReleaseSchedulingPanel } from './ReleaseSchedulingPanel';
import { ReleaseReviewModal } from './ReleaseReviewModal';
import type { ReleaseCreationState, CronConfig } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';
import { validateReleaseCreationState } from '~/utils/release-creation-validation';
import { 
  convertStateToBackendRequest, 
  convertUpdateStateToBackendRequest,
  convertReleaseToFormState,
} from '~/utils/release-creation-converter';
import { DEFAULT_KICKOFF_TIME, DEFAULT_RELEASE_TIME } from '~/constants/release-creation';
import { getReleaseActiveStatus } from '~/utils/release-utils';
import { RELEASE_ACTIVE_STATUS } from '~/constants/release-ui';

interface CreateReleaseFormProps {
  org: string;
  userId: string;
  onSubmit: (request: ReturnType<typeof convertStateToBackendRequest>) => Promise<void>;
  // Edit mode props
  existingRelease?: any; // BackendReleaseResponse
  isEditMode?: boolean;
  onUpdate?: (request: ReturnType<typeof convertUpdateStateToBackendRequest>) => Promise<void>;
  onCancel?: () => void;
}

export function CreateReleaseForm({ 
  org, 
  userId, 
  onSubmit,
  existingRelease,
  isEditMode = false,
  onUpdate,
  onCancel,
}: CreateReleaseFormProps) {
  const { activeReleaseConfigs, defaultReleaseConfig } = useConfig();
  const configurations = activeReleaseConfigs;
  const hasConfigurations = activeReleaseConfigs.length > 0;
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewModalOpened, setReviewModalOpened] = useState(false);
  

  // Initialize form state from existing release if in edit mode
  const initialReleaseState: Partial<ReleaseCreationState> = isEditMode && existingRelease
    ? convertReleaseToFormState(existingRelease)
    : {
        type: 'PLANNED',
        platformTargets: [],
        baseBranch: '',
        kickOffDate: '',
        kickOffTime: DEFAULT_KICKOFF_TIME,
        targetReleaseDate: '',
        targetReleaseTime: DEFAULT_RELEASE_TIME,
      };

  const {
    formData: state,
    setFormData: setState,
    isDraftRestored,
    markSaveSuccessful,
  } = useDraftStorage<Partial<ReleaseCreationState>>(
    {
      storageKey: isEditMode ? `release-edit-draft-${org}-${existingRelease?.id}` : `release-creation-draft-${org}`,
      sensitiveFields: [], // No sensitive fields in release creation
      shouldSaveDraft: (data) => {
        // Don't save draft in edit mode
        if (isEditMode) return false;
        // Save draft if user has filled in meaningful data
        return !!(
          data.baseBranch ||
          data.platformTargets?.length ||
          data.kickOffDate ||
          data.targetReleaseDate ||
          data.releaseConfigId
        );
      },
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableMetadata: false,
    },
    initialReleaseState
  );

  // Get active status to determine what can be edited
  const activeStatus = existingRelease ? getReleaseActiveStatus(existingRelease) : null;
  const isUpcoming = activeStatus === RELEASE_ACTIVE_STATUS.UPCOMING;
  const isAfterKickoff = activeStatus === RELEASE_ACTIVE_STATUS.RUNNING || activeStatus === RELEASE_ACTIVE_STATUS.PAUSED;
  console.log('state in create release form', state);

  // Release creation state
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
  const [selectedConfig, setSelectedConfig] = useState<ReleaseConfiguration | undefined>();

  // Ensure platformTargets only contain targets from selected config
  useEffect(() => {
    if (!selectedConfig?.targets) return;
    
    const configTargets = selectedConfig.targets;
    
    setState((prev) => {
      if (!prev.platformTargets || prev.platformTargets.length === 0) {
        return prev; // Let pre-fill logic handle empty state
      }
      
      const validTargets = prev.platformTargets.filter((pt) => 
        configTargets.includes(pt.target)
      );
      
      // If no targets were filtered out, no change needed
      if (validTargets.length === prev.platformTargets.length) {
        return prev;
      }
      
      // If all were filtered out, let pre-fill logic handle it
      if (validTargets.length === 0) {
        return prev;
      }
      
      // Keep only valid targets
      return {
        ...prev,
        platformTargets: validTargets,
      };
    });
  }, [selectedConfig?.targets]);
  // Cron config: use user-provided values if available, otherwise auto-derive from config
  const getCronConfig = (): Partial<CronConfig> => {
    // Start with user-provided cronConfig if it exists
    const userCronConfig = state.cronConfig || {};
    
    // Determine kickoff reminder: use user-provided value if kickOffReminderDate is set,
    // otherwise derive from config
    const hasKickOffReminderDate = !!(state.kickOffReminderDate && state.kickOffReminderTime);
    const kickOffReminder = hasKickOffReminderDate 
      ? true 
      : (userCronConfig.kickOffReminder ?? selectedConfig?.scheduling?.kickoffReminderEnabled ?? false);

    if (!selectedConfig) {
      return {
        preRegressionBuilds: userCronConfig.preRegressionBuilds ?? true,
        automationRuns: userCronConfig.automationRuns ?? true,
        kickOffReminder,
      };
    }

    // Auto-generate cron config from selected config, but use user overrides when available
    const hasPreRegression = (selectedConfig.ciConfig?.workflows || []).some(
      (w: any) => w.environment === 'PRE_REGRESSION'
    );
    const hasAutomation = selectedConfig.testManagementConfig?.enabled === true;

    return {
      // Use user-provided value if set, otherwise use auto-derived value
      preRegressionBuilds: userCronConfig.preRegressionBuilds ?? hasPreRegression,
      automationRuns: userCronConfig.automationRuns ?? hasAutomation,
      automationBuilds: userCronConfig.automationBuilds ?? hasAutomation,
      kickOffReminder,
    };
  };

  // Restore selectedConfigId from draft, existing release, or use default (runs only once on mount)
  useEffect(() => {
    // Skip if already have a selectedConfigId
    if (selectedConfigId) return;
    
    if (isEditMode && existingRelease?.releaseConfigId) {
      // In edit mode, use the release's config ID
      setSelectedConfigId(existingRelease.releaseConfigId);
    } else if (isDraftRestored && state.releaseConfigId) {
      // Restore from draft first
      setSelectedConfigId(state.releaseConfigId);
    } else if (defaultReleaseConfig) {
      // Fallback to default config if no draft
      setSelectedConfigId(defaultReleaseConfig.id);
    }
    // Note: Intentionally not including state.releaseConfigId to avoid loops
    // This effect is only for initial setup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, existingRelease?.releaseConfigId, isDraftRestored, defaultReleaseConfig?.id]);

  // Load the full configuration when a config is selected
  useEffect(() => {
    if (selectedConfigId) {
      const config = configurations.find((c) => c.id === selectedConfigId);
      if (config) {
        setSelectedConfig(config);
        // Only update state if releaseConfigId is different to avoid loops
        setState((prev) => {
          if (prev.releaseConfigId === config.id) {
            return prev; // No change needed
          }
          return {
            ...prev,
            releaseConfigId: config.id,
          };
        });
      }
    } else {
      setSelectedConfig(undefined);
    }
  }, [selectedConfigId, configurations]);

  // Handler to create new configuration
  const handleCreateNewConfig = () => {
    navigate(`/dashboard/${org}/releases/configure?returnTo=create`);
  };

  // Handler to clone and edit configuration
  const handleCloneConfig = (configId: string) => {
    navigate(`/dashboard/${org}/releases/configure?clone=${configId}&returnTo=create`);
  };

  // Clear error for a specific field when it's updated
  const handleStateChange = (updates: Partial<ReleaseCreationState>) => {
    // Clear errors for fields that are being updated
    const updatedFields = Object.keys(updates);
    const clearedErrors = { ...errors };
    
    updatedFields.forEach((field) => {
      // Clear direct field errors
      if (clearedErrors[field]) {
        delete clearedErrors[field];
      }
      
      // Clear nested errors for regressionBuildSlots when slots are updated
      if (field === 'regressionBuildSlots') {
        Object.keys(clearedErrors).forEach((errorKey) => {
          if (errorKey.startsWith('regressionBuildSlots[')) {
            delete clearedErrors[errorKey];
          }
        });
      }
      
      // Clear nested errors for platformTargets when targets are updated
      if (field === 'platformTargets') {
        Object.keys(clearedErrors).forEach((errorKey) => {
          if (errorKey.startsWith('platformTargets') || errorKey.startsWith('version-')) {
            delete clearedErrors[errorKey];
          }
        });
      }
    });
    
    // Only update errors if something changed
    if (Object.keys(clearedErrors).length !== Object.keys(errors).length) {
      setErrors(clearedErrors);
    }
    
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Handle review and submit
  const handleReviewAndSubmit = () => {
    // In edit mode, submit directly without review modal
    if (isEditMode) {
      handleConfirmSubmit();
      return;
    }

    // Validate before opening modal
    const validation = validateReleaseCreationState(state);
    if (!validation.isValid) {
      console.error('[CreateRelease] Validation Errors:', validation.errors);
      console.error('[CreateRelease] Current State:', state);
      setErrors(validation.errors);
      showWarningToast(RELEASE_MESSAGES.VALIDATION_ERRORS);
      return;
    }

    setReviewModalOpened(true);
  };

  // Handle final submission from modal
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (isEditMode && onUpdate) {
        // Edit mode: convert to update request (only changed fields)
        const updateState: any = {};
        
        // Only include fields that can be edited based on active status
        if (isUpcoming) {
          // UPCOMING: Can edit branch, baseBranch, scheduling, versions
          if (state.branch !== existingRelease?.branch) updateState.branch = state.branch;
          if (state.baseBranch !== existingRelease?.baseBranch) updateState.baseBranch = state.baseBranch;
          if (state.kickOffDate) {
            updateState.kickOffDate = state.kickOffDate;
            updateState.kickOffTime = state.kickOffTime;
          }
          if (state.kickOffReminderDate) {
            updateState.kickOffReminderDate = state.kickOffReminderDate;
            updateState.kickOffReminderTime = state.kickOffReminderTime;
          }
          if (state.targetReleaseDate) {
            updateState.targetReleaseDate = state.targetReleaseDate;
            updateState.targetReleaseTime = state.targetReleaseTime;
          }
          // Platform target mappings (versions)
          if (state.platformTargets) {
            updateState.platformTargetMappings = state.platformTargets.map(pt => ({
              id: existingRelease?.platformTargetMappings?.find((m: any) => 
                m.platform === pt.platform && m.target === pt.target
              )?.id || '',
              platform: pt.platform,
              target: pt.target,
              version: pt.version,
            }));
          }
          // Regression slots - always include to ensure backend updates/deletes slots
          // Even if empty array, backend needs to know to clear all slots
          updateState.upcomingRegressions = (state.regressionBuildSlots || []).map(slot => ({
            date: slot.date,
            config: slot.config,
          }));
          // Cron config
          const cronConfig = getCronConfig();
          if (Object.keys(cronConfig).length > 0) {
            updateState.cronConfig = cronConfig;
          }
        } else if (isAfterKickoff) {
          // After kickoff: Can only edit targetReleaseDate and add regression slots
          if (state.targetReleaseDate) {
            updateState.targetReleaseDate = state.targetReleaseDate;
            updateState.targetReleaseTime = state.targetReleaseTime;
          }
          // Regression slots (can add new ones)
          if (state.regressionBuildSlots) {
            updateState.upcomingRegressions = state.regressionBuildSlots.map(slot => ({
              date: slot.date,
              config: slot.config,
            }));
          }
        }

        const updateRequest = convertUpdateStateToBackendRequest(updateState);
        console.log('[UpdateRelease] Update Request:', JSON.stringify(updateRequest, null, 2));
        await onUpdate(updateRequest);
      } else {
        // Create mode: convert to create request
        const backendRequest = convertStateToBackendRequest(state as ReleaseCreationState);

        console.log('[CreateRelease] Backend Request:', JSON.stringify(backendRequest, null, 2));

        // Add cron config (auto-generated from config)
        const cronConfig = getCronConfig();
        if (Object.keys(cronConfig).length > 0) {
          backendRequest.cronConfig = cronConfig as CronConfig;
        }

        console.log('[CreateRelease] Submitting to backend:', JSON.stringify(backendRequest, null, 2));

        await onSubmit(backendRequest);
        
        // Mark draft as successfully saved (prevents auto-save on unmount)
        markSaveSuccessful();
        showSuccessToast(RELEASE_MESSAGES.CREATE_SUCCESS);
        setReviewModalOpened(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (isEditMode ? 'Failed to update release' : 'Failed to create release');
      console.error(`[${isEditMode ? 'Update' : 'Create'}Release] Failed:`, errorMessage);
      showErrorToast(getErrorMessage(errorMessage, isEditMode ? RELEASE_MESSAGES.UPDATE_ERROR.title : RELEASE_MESSAGES.CREATE_ERROR.title));
      setIsSubmitting(false);
    }
  };

  if (!hasConfigurations) {
    return null; // Parent will handle this case
  }

  // Get all validation errors for display
  const hasValidationErrors = Object.keys(errors).length > 0;
  console.log('[CreateRelease] Errors:', errors);

  return (
    <div className="flex flex-col min-h-0">
      <Stack gap="xl" className="flex-1 pb-32">
        {/* Validation Errors Summary */}
        {hasValidationErrors && (
          <Alert
            icon={<IconAlertCircle size={20} />}
            title="Validation Errors"
            color="red"
            variant="light"
          >
            <Text size="sm" fw={500} className="mb-2">
              Please fix the following errors before submitting:
            </Text>
            <List size="sm" spacing="xs">
              {Object.entries(errors).map(([field, message]) => (
                <List.Item key={field}>
                  <Text size="sm">
                    <strong>{field}:</strong> {message}
                  </Text>
                </List.Item>
              ))}
            </List>
          </Alert>
        )}

        {/* Edit Mode Info */}
        {isEditMode && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text size="sm" fw={500} className="mb-1">
              Editing Release
            </Text>
            <Text size="xs">
              {isUpcoming 
                ? "You can edit branch, base branch, and scheduling info. Configuration and platform targets cannot be changed."
                : isAfterKickoff
                ? "You can only edit target release date and add regression slots."
                : "This release cannot be edited."}
            </Text>
          </Alert>
        )}

        {/* Configuration Selection - Hidden in edit mode */}
        {!isEditMode && (
          <Paper shadow="sm" p="xl" radius="md">
            <ConfigurationSelector
              configurations={configurations}
              selectedMode={'WITH_CONFIG'}
              selectedConfigId={selectedConfigId}
              onModeChange={() => {}} // No-op since mode is fixed
              onConfigSelect={setSelectedConfigId}
              onCreateNew={handleCreateNewConfig}
              onClone={handleCloneConfig}
            />
          </Paper>
        )}

        {/* Release Details - Hidden after kickoff, shown for upcoming */}
        {(!isEditMode || isUpcoming) && (
          <Paper shadow="sm" p="xl" radius="md">
            <ReleaseDetailsForm
              state={state}
              onChange={handleStateChange}
              config={selectedConfig}
              latestVersion="v1.0.0" // TODO: Fetch from API
              tenantId={org}
              errors={errors}
              disablePlatformTargets={isEditMode && isUpcoming}
            />
          </Paper>
        )}

        {/* Scheduling - Show different fields based on status */}
        {!isEditMode || isUpcoming ? (
          <Paper shadow="sm" p="xl" radius="md">
            <ReleaseSchedulingPanel
              state={state}
              onChange={handleStateChange}
              config={selectedConfig}
              errors={errors}
              isEditMode={isEditMode}
              existingRelease={existingRelease}
            />
          </Paper>
        ) : isAfterKickoff ? (
          <Paper shadow="sm" p="xl" radius="md">
            <ReleaseSchedulingPanel
              state={state}
              onChange={handleStateChange}
              config={selectedConfig}
              errors={errors}
              showOnlyTargetDateAndSlots={true}
              isEditMode={isEditMode}
              existingRelease={existingRelease}
            />
          </Paper>
        ) : null}

      </Stack>

      {/* Submit Button - Sticky footer */}
      <Paper
        shadow="lg"
        p="md"
        radius="md"
        className="sticky bottom-0 z-10 bg-white border-t-2 border-gray-300 mt-6"
        style={{ 
          marginTop: 'auto',
        }}
      >
        <Group justify="flex-end">
          {onCancel && (
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={18} />}
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          {!onCancel && (
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => navigate(`/dashboard/${org}/releases`)}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="filled"
            leftSection={<IconRocket size={18} />}
            onClick={handleReviewAndSubmit}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
            loading={isSubmitting}
            disabled={hasValidationErrors}
          >
            {isEditMode ? 'Update Release' : 'Review & Create Release'}
          </Button>
        </Group>
      </Paper>

      {/* Review Modal */}
      <ReleaseReviewModal
        opened={reviewModalOpened}
        onClose={() => setReviewModalOpened(false)}
        onConfirm={handleConfirmSubmit}
        config={selectedConfig}
        state={state}
        cronConfig={getCronConfig()}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

