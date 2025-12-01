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
import { convertStateToBackendRequest } from '~/utils/release-creation-converter';
import { DEFAULT_KICKOFF_TIME, DEFAULT_RELEASE_TIME } from '~/constants/release-creation';

interface CreateReleaseFormProps {
  org: string;
  userId: string;
  onSubmit: (request: ReturnType<typeof convertStateToBackendRequest>) => Promise<void>;
}

export function CreateReleaseForm({ org, userId, onSubmit }: CreateReleaseFormProps) {
  const { activeReleaseConfigs, defaultReleaseConfig } = useConfig();
  const configurations = activeReleaseConfigs;
  const hasConfigurations = activeReleaseConfigs.length > 0;
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewModalOpened, setReviewModalOpened] = useState(false);
  

  // Draft storage for release creation form
  const initialReleaseState: Partial<ReleaseCreationState> = {
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
      storageKey: `release-creation-draft-${org}`,
      sensitiveFields: [], // No sensitive fields in release creation
      shouldSaveDraft: (data) => {
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
  console.log('state in create release form', state);

  // Release creation state
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
  const [selectedConfig, setSelectedConfig] = useState<ReleaseConfiguration | undefined>();

  // Ensure platformTargets only contain targets from selected config
  useEffect(() => {
    if (selectedConfig && state.platformTargets && state.platformTargets.length > 0) {
      const configTargets = selectedConfig.targets || [];
      const validTargets = state.platformTargets.filter((pt) => 
        configTargets.includes(pt.target)
      );
      
      // If any targets were filtered out, update state
      if (validTargets.length !== state.platformTargets.length) {
        // If all were filtered out, we'll let the pre-fill logic handle it
        // Otherwise, keep only valid targets
        if (validTargets.length > 0) {
          setState({
            ...state,
            platformTargets: validTargets,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConfig?.targets]);
  // Cron config is automatically derived from config, no user input needed
  const getCronConfig = (): Partial<CronConfig> => {
    if (!selectedConfig) {
      return {
        preRegressionBuilds: true,
        automationRuns: true,
      };
    }

    // Auto-generate cron config from selected config
    const hasPreRegression = (selectedConfig.ciConfig?.workflows || []).some(
      (w: any) => w.environment === 'PRE_REGRESSION'
    );
    const hasAutomation = selectedConfig.testManagementConfig?.enabled === true;

    return {
      preRegressionBuilds: hasPreRegression,
      automationRuns: hasAutomation,
      automationBuilds: hasAutomation,
      kickOffReminder: selectedConfig.scheduling?.kickoffReminderEnabled || false,
    };
  };

  // Restore selectedConfigId from draft or use default
  useEffect(() => {
    // Restore from draft first
    if (isDraftRestored && state.releaseConfigId) {
      setSelectedConfigId(state.releaseConfigId);
    } else if (defaultReleaseConfig && !selectedConfigId) {
      // Fallback to default config if no draft
      setSelectedConfigId(defaultReleaseConfig.id);
    }
  }, [isDraftRestored, state.releaseConfigId, defaultReleaseConfig]);

  // Load the full configuration when a config is selected
  useEffect(() => {
    if (selectedConfigId) {
      const config = configurations.find((c) => c.id === selectedConfigId);
      if (config) {
        setSelectedConfig(config);
        setState((prev) => ({
          ...prev,
          releaseConfigId: config.id,
        }));
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
      // Convert state to backend request format
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create release';
      console.error('[CreateRelease] Failed to create release:', errorMessage);
      showErrorToast(getErrorMessage(errorMessage, RELEASE_MESSAGES.CREATE_ERROR.title));
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

        {/* Configuration Selection */}
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

        {/* Release Details */}
        <Paper shadow="sm" p="xl" radius="md">
          <ReleaseDetailsForm
            state={state}
            onChange={handleStateChange}
            config={selectedConfig}
            latestVersion="v1.0.0" // TODO: Fetch from API
            tenantId={org}
            errors={errors}
          />
        </Paper>

        {/* Scheduling */}
        <Paper shadow="sm" p="xl" radius="md">
          <ReleaseSchedulingPanel
            state={state}
            onChange={handleStateChange}
            config={selectedConfig}
            errors={errors}
          />
        </Paper>

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
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate(`/dashboard/${org}/releases`)}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            leftSection={<IconRocket size={18} />}
            onClick={handleReviewAndSubmit}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            Review & Create Release
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

