/**
 * Create Release Form Component
 * 
 * Single form for creating a release with review modal.
 * All form sections are displayed at once.
 */

import { useState, useEffect } from 'react';
import { Stack, Button, Box, Group, Alert, Text, List, Divider } from '@mantine/core';
import { IconRocket, IconArrowLeft, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { useMantineTheme } from '@mantine/core';
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
  const theme = useMantineTheme();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewModalOpened, setReviewModalOpened] = useState(false);
  

  // Initialize form state from existing release if in edit mode
  const initialReleaseState: Partial<ReleaseCreationState> = isEditMode && existingRelease
    ? convertReleaseToFormState(existingRelease)
    : {
    type: 'MINOR',
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
      : (userCronConfig.kickOffReminder ?? selectedConfig?.releaseSchedule?.kickoffReminderEnabled ?? false);

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
    // Only run this logic once on mount or when key dependencies change
    if (isEditMode && existingRelease?.releaseConfigId) {
      // In edit mode, use the release's config ID
      setSelectedConfigId(existingRelease.releaseConfigId);
    } else if (isDraftRestored && state.releaseConfigId) {
      // Restore from draft first
      setSelectedConfigId(state.releaseConfigId);
    } else if (defaultReleaseConfig) {
      // Fallback to default config if no draft
      console.log('[CreateReleaseForm] Auto-selecting default config:', defaultReleaseConfig.id, defaultReleaseConfig.name);
      setSelectedConfigId(defaultReleaseConfig.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, existingRelease?.releaseConfigId, isDraftRestored, state.releaseConfigId, defaultReleaseConfig?.id]);

  // Load the full configuration when a config is selected
  useEffect(() => {
    if (selectedConfigId) {
      const config = configurations.find((c) => c.id === selectedConfigId);
      if (config) {
        // Only update if config actually changed (prevent flickering)
        setSelectedConfig((prev) => {
          // Check if config is actually different
          if (prev?.id === config.id) {
            return prev; // Don't trigger re-render if same config
          }
          return config;
        });
        
        // Only update state if releaseConfigId is different
        if (state.releaseConfigId !== config.id) {
          setState((prev) => ({
            ...prev,
            releaseConfigId: config.id,
          }));
        }
      }
    } else {
      setSelectedConfig(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConfigId, configurations.length]); // Use configurations.length instead of full array

  // Handler to create new configuration
  const handleCreateNewConfig = () => {
    navigate(`/dashboard/${org}/releases/configure?returnTo=create`);
  };

  // Handler to clone and edit configuration
  const handleCloneConfig = (configId: string) => {
    navigate(`/dashboard/${org}/releases/configure?clone=${configId}&returnTo=create`);
  };

  // Update state and clear errors for fields that are being updated
  // Validation only happens on submit or blur, not on every state change
  const handleStateChange = (updates: Partial<ReleaseCreationState>) => {
    // Update state
    setState((prev) => ({ ...prev, ...updates }));
    
    // Clear errors for fields that are being updated (user is fixing them)
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
      
      // Clear date/time related errors
      if (field === 'kickOffDate' || field === 'kickOffTime') {
        if (clearedErrors.kickOffDate) delete clearedErrors.kickOffDate;
        if (clearedErrors.kickOffTime) delete clearedErrors.kickOffTime;
        // Also clear targetReleaseDate error if it was about being before kickoff
        if (clearedErrors.targetReleaseDate?.includes('after kickoff')) {
          delete clearedErrors.targetReleaseDate;
        }
      }
      
      if (field === 'targetReleaseDate' || field === 'targetReleaseTime') {
        if (clearedErrors.targetReleaseDate) delete clearedErrors.targetReleaseDate;
        if (clearedErrors.targetReleaseTime) delete clearedErrors.targetReleaseTime;
      }
      
      if (field === 'kickOffReminderDate' || field === 'kickOffReminderTime') {
        if (clearedErrors.kickOffReminderDate) delete clearedErrors.kickOffReminderDate;
        if (clearedErrors.kickOffReminderTime) delete clearedErrors.kickOffReminderTime;
      }
    });
    
    // Update errors (only cleared errors, no new validation)
    setErrors(clearedErrors);
  };

  // Validate a specific field on blur
  const handleFieldBlur = (fieldName: string) => {
    const validation = validateReleaseCreationState(state);
    const updatedErrors = { ...errors };
    
    // Update error for the blurred field
    if (validation.errors[fieldName]) {
      updatedErrors[fieldName] = validation.errors[fieldName];
    } else {
      // Clear error if field is now valid
      delete updatedErrors[fieldName];
    }
    
    // Also validate dependent fields
    if (fieldName === 'kickOffDate' || fieldName === 'kickOffTime') {
      if (validation.errors.targetReleaseDate) {
        updatedErrors.targetReleaseDate = validation.errors.targetReleaseDate;
      } else if (updatedErrors.targetReleaseDate?.includes('after kickoff')) {
        delete updatedErrors.targetReleaseDate;
      }
    }
    
    if (fieldName === 'targetReleaseDate' || fieldName === 'targetReleaseTime') {
      if (validation.errors.kickOffDate) {
        updatedErrors.kickOffDate = validation.errors.kickOffDate;
      }
    }
    
    setErrors(updatedErrors);
  };

  // Handle review and submit
  const handleReviewAndSubmit = () => {
    // In edit mode, submit directly without review modal
    if (isEditMode) {
      handleConfirmSubmit();
      return;
    }

    // Validate before opening modal
    const validation = validateReleaseCreationState(state, isEditMode, activeStatus || undefined);
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
            
            // Include delayReason if provided (required when extending targetReleaseDate)
            if (state.delayReason !== undefined) {
              updateState.delayReason = state.delayReason;
            }
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
          // Regression slots - already in backend format (absolute dates)
          // Always include to ensure backend updates/deletes slots
          // Even if empty array, backend needs to know to clear all slots
          updateState.upcomingRegressions = state.regressionBuildSlots || [];
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
            
            // Include delayReason if provided (required when extending targetReleaseDate)
            if (state.delayReason !== undefined) {
              updateState.delayReason = state.delayReason;
            }
          }
          // Regression slots (can add new ones) - already in backend format
          if (state.regressionBuildSlots) {
            updateState.upcomingRegressions = state.regressionBuildSlots;
          }
        }

        const updateRequest = convertUpdateStateToBackendRequest(updateState);
        console.log('[UpdateRelease] Update Request:', JSON.stringify(updateRequest, null, 2));
        await onUpdate(updateRequest);
      } else {
        // Create mode: convert to create request
        // Pass the release type from the selected config (MAJOR/MINOR/HOTFIX)
        const configReleaseType = selectedConfig?.releaseType;
        const backendRequest = convertStateToBackendRequest(
          state as ReleaseCreationState,
          configReleaseType
        );

        console.log('[CreateRelease] Backend Request:', JSON.stringify(backendRequest, null, 2));
        console.log('[CreateRelease] Using release type from config:', configReleaseType);

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
    <Box>
      <Stack gap="xl">
        {/* Info Banner */}
        {!isEditMode && (
          <Alert
            icon={<IconInfoCircle size={18} />}
            color="blue"
            variant="light"
            radius="md"
          >
            <Text size="sm" fw={500} mb={4}>
              Creating a New Release
            </Text>
            <Text size="xs" c={theme.colors.slate[6]}>
              This form will create a new release branch, configure platform targets and versions, and schedule the release timeline. 
              All required fields are marked with an asterisk (*). Fill in the form below to get started.
            </Text>
          </Alert>
        )}

        {/* Validation Errors Summary */}
        {hasValidationErrors && (
          <Alert
            icon={<IconAlertCircle size={20} />}
            title="Validation Errors"
            color="red"
            variant="light"
            radius="md"
          >
            <Text size="sm" fw={500} mb="xs">
              Please fix the following errors before submitting:
            </Text>
            <List size="sm" spacing="xs">
              {Object.entries(errors).map(([field, message]) => {
                // Format field names for better readability
                const fieldLabel = field
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .replace(/platform targets/i, 'Platform Targets')
                  .replace(/kick off/i, 'Kickoff')
                  .replace(/target release/i, 'Target Release')
                  .replace(/release config/i, 'Configuration');
                
                return (
                  <List.Item key={field}>
                    <Text size="sm">
                      <Text component="span" fw={600}>{fieldLabel}:</Text> {message}
                    </Text>
                  </List.Item>
                );
              })}
            </List>
          </Alert>
        )}

        {/* Edit Mode Info */}
        {isEditMode && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light" radius="md">
            <Text size="sm" fw={500} mb={4}>
              Editing Release
            </Text>
            <Text size="xs">
              {isUpcoming 
                ? "You can edit branch, base branch, and scheduling info. Configuration and platform targets cannot be changed."
                : isAfterKickoff
                ? "You can only edit target release date and modify regression slots."
                : "This release cannot be edited."}
            </Text>
          </Alert>
        )}

        {/* Configuration Selection - Hidden in edit mode */}
        {!isEditMode && (
          <Box>
            <Stack gap="md">
              <Box>
                <Text fw={600} size="lg" mb={4}>
                  Configuration
                </Text>
                <Text size="sm" c={theme.colors.slate[5]}>
                  Choose a configuration template that defines your release settings, platform targets, and build pipelines.
                </Text>
              </Box>
              <ConfigurationSelector
                configurations={configurations}
                selectedMode={'WITH_CONFIG'}
                selectedConfigId={selectedConfigId}
                onModeChange={() => {}} // No-op since mode is fixed
                onConfigSelect={setSelectedConfigId}
                onCreateNew={handleCreateNewConfig}
                onClone={handleCloneConfig}
                errors={errors}
              />
            </Stack>
          </Box>
        )}

        {/* Release Details - Hidden after kickoff, shown for upcoming */}
        {(!isEditMode || isUpcoming) && (
          <Box>
            {!isEditMode && <Divider mb="xl" />}
            <ReleaseDetailsForm
              state={state}
              onChange={handleStateChange}
              config={selectedConfig}
              latestVersion="v1.0.0" // TODO: Fetch from API
              tenantId={org}
              errors={errors}
              disablePlatformTargets={isEditMode && isUpcoming}
            />
          </Box>
        )}

        {/* Scheduling - Show different fields based on status */}
        {(!isEditMode || isUpcoming || isAfterKickoff) && (
          <Box>
            <Divider mb="xl" />
            {!isEditMode || isUpcoming ? (
              <ReleaseSchedulingPanel
                state={state}
                onChange={handleStateChange}
                config={selectedConfig}
                errors={errors}
                isEditMode={isEditMode}
                existingRelease={existingRelease}
              />
            ) : isAfterKickoff ? (
              <ReleaseSchedulingPanel
                state={state}
                onChange={handleStateChange}
                config={selectedConfig}
                errors={errors}
                showOnlyTargetDateAndSlots={true}
                isEditMode={isEditMode}
                existingRelease={existingRelease}
              />
            ) : null}
          </Box>
        )}

        {/* Submit Button */}
        <Box
          pt="xl"
          style={{
            borderTop: `1px solid ${theme.colors.slate[2]}`,
          }}
        >
          <Group justify="flex-end">
            {onCancel && (
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={18} />}
                onClick={onCancel}
                disabled={isSubmitting}
                size="md"
              >
                Cancel
              </Button>
            )}
            {!onCancel && (
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={18} />}
                onClick={() => navigate(`/dashboard/${org}/releases`)}
                size="md"
              >
                Cancel
              </Button>
            )}
            <Button
              color="brand"
              leftSection={<IconRocket size={18} />}
              onClick={handleReviewAndSubmit}
              size="md"
              loading={isSubmitting}
              disabled={hasValidationErrors}
            >
              {isEditMode ? 'Update Release' : 'Review & Create Release'}
            </Button>
          </Group>
        </Box>
      </Stack>

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
    </Box>
  );
}

