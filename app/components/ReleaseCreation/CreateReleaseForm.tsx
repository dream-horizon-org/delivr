/**
 * Create Release Form Component
 * 
 * Single form for creating a release with review modal.
 * All form sections are displayed at once.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Stack, Button, Box, Group, Alert, Text, List, Divider } from '@mantine/core';
import { IconRocket, IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { useMantineTheme } from '@mantine/core';
import { useNavigate } from '@remix-run/react';
import { showErrorToast, showWarningToast, showSuccessToast } from '~/utils/toast';
import { RELEASE_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import { useConfig } from '~/contexts/ConfigContext';
import { useReleases } from '~/hooks/useReleases';
import { useVersionSuggestions } from '~/hooks/useVersionSuggestions';
import { ConfigurationSelector } from './ConfigurationSelector';
import { ReleaseDetailsForm } from './ReleaseDetailsForm';
import { ReleaseSchedulingPanel } from './ReleaseSchedulingPanel';
import { ReleaseReviewModal } from './ReleaseReviewModal';
import type { ReleaseCreationState, CronConfig, PlatformTargetWithVersion } from '~/types/release-creation-backend';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { StageStatus } from '~/types/release-process-enums';
import { validateReleaseCreationState } from '~/utils/release-creation-validation';
import { 
  convertStateToBackendRequest, 
  convertUpdateStateToBackendRequest,
  convertReleaseToFormState,
} from '~/utils/release-creation-converter';
import { DEFAULT_KICKOFF_TIME, DEFAULT_RELEASE_TIME, DEFAULT_VERSIONS, getDefaultKickoffTime } from '~/constants/release-creation';
import { getReleaseActiveStatus } from '~/utils/release-utils';
import { RELEASE_ACTIVE_STATUS } from '~/constants/release-ui';
import { applyVersionSuggestions } from '~/utils/release-version-suggestions';
import { clearErrorsForFields, formatFieldLabel } from '~/utils/form-error-utils';

/**
 * Format slot error message by splitting on delimiter and bolding the label part
 * Message format: "Slot X:|error message" where | is the delimiter
 */
function formatSlotErrorMessage(message: string) {
  const [boldPart, ...restParts] = message.split('|');
  if (restParts.length > 0) {
    return (
      <>
        <Text component="span" fw={600}>{boldPart}{" "}</Text>
        {restParts.join('|')}
      </>
    );
  }
  return message;
}

interface CreateReleaseFormProps {
  org: string;
  userId: string;
  onSubmit: (request: ReturnType<typeof convertStateToBackendRequest>) => Promise<void>;
  // Edit mode props
  existingRelease?: BackendReleaseResponse;
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
  
  // Get all releases for version suggestions (only for create mode)
  const { releases } = useReleases(org);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewModalOpened, setReviewModalOpened] = useState(false);
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ slot: any; index: number } | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Initialize form state from existing release if in edit mode
  const initialReleaseState: Partial<ReleaseCreationState> = isEditMode && existingRelease
    ? convertReleaseToFormState(existingRelease)
    : {
    // type is not set here - let ReleaseDetailsForm set it from config
    platformTargets: [],
    baseBranch: '',
    branch: '', // Start with empty branch - will be populated by version suggestions
    kickOffDate: '',
    kickOffTime: getDefaultKickoffTime(),
    targetReleaseDate: '',
    targetReleaseTime: DEFAULT_RELEASE_TIME,
  };

  // Direct state management
  const [state, setState] = useState<Partial<ReleaseCreationState>>(initialReleaseState);
  const isDraftRestored = false; // Always false since draft is disabled
  const markSaveSuccessful = () => {}; // No-op since draft is disabled

  // Get active status to determine what can be edited
  const activeStatus = existingRelease ? getReleaseActiveStatus(existingRelease) : null;
  const isUpcoming = activeStatus === RELEASE_ACTIVE_STATUS.UPCOMING;
  const isAfterKickoff = activeStatus === RELEASE_ACTIVE_STATUS.RUNNING || activeStatus === RELEASE_ACTIVE_STATUS.PAUSED;
  
  // Check if pre-release stage or later stages have started (to determine if slots can be added)
  const isPreReleaseInProgress = useMemo(() => {
    if (!isEditMode || !existingRelease || !existingRelease.cronJob) return false;
    const cronJob = existingRelease.cronJob as any;
    const stage3Status = cronJob.stage3Status;
    const stage4Status = cronJob.stage4Status;
    
    // Disallow if pre-release has started or completed
    if (stage3Status === StageStatus.IN_PROGRESS || stage3Status === StageStatus.COMPLETED) {
      return true;
    }
    
    // Disallow if any later stage has started or completed
    if (stage4Status === StageStatus.IN_PROGRESS || stage4Status === StageStatus.COMPLETED) {
      return true;
    }
    
    return false;
  }, [isEditMode, existingRelease]);

  // Release creation state
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
  const [selectedConfig, setSelectedConfig] = useState<ReleaseConfiguration | undefined>();

  // Ensure platformTargets only contain targets from selected config
  useEffect(() => {
    if (!selectedConfig?.platformTargets || selectedConfig.platformTargets.length === 0) return;
    
    // Extract unique targets from config's platformTargets
    const configTargets = Array.from(new Set(selectedConfig.platformTargets.map(pt => pt.target)));
    
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
  }, [selectedConfig?.platformTargets]);
  // Cron config: use user-provided values if available, otherwise auto-derive from config
  const getCronConfig = (): Partial<CronConfig> => {
    // Start with user-provided cronConfig if it exists
    const userCronConfig = state.cronConfig || {};
    
    // Determine kickoff reminder: only set to true if both date and time are actually set
    // This prevents setting kickOffReminder: true when there's no reminder date (data inconsistency)
    const hasKickOffReminderDate = !!(state.kickOffReminderDate && state.kickOffReminderTime);
    const kickOffReminder = hasKickOffReminderDate;

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
    if (selectedConfigId && !isDraftRestored && !isEditMode) {
      return; 
    }
    
    if (isEditMode && existingRelease?.releaseConfigId) {
      // In edit mode, use the release's config ID
      setSelectedConfigId(existingRelease.releaseConfigId);
    } else if (isDraftRestored && state.releaseConfigId) {
      // Restore from draft first
      setSelectedConfigId(state.releaseConfigId);
    } else if (defaultReleaseConfig && !selectedConfigId) {
      // Fallback to default config if no draft AND no manual selection yet
      if (process.env.NODE_ENV === 'development') {
        console.log('[CreateReleaseForm] Auto-selecting default config:', defaultReleaseConfig.id, defaultReleaseConfig.name);
      }
      setSelectedConfigId(defaultReleaseConfig.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, existingRelease?.releaseConfigId, isDraftRestored, defaultReleaseConfig?.id]);
  // Removed state.releaseConfigId from dependencies - it causes the reset issue

  // Load the full configuration when a config is selected
  useEffect(() => {
    if (selectedConfigId) {
      const config = configurations.find((c) => c.id === selectedConfigId);
      if (config) {
        const prevConfig = selectedConfig;
        const configChanged = prevConfig?.id !== config.id;
        const releaseConfigIdChanged = state.releaseConfigId !== config.id;
        
        // Only update if config actually changed (prevent flickering)
        setSelectedConfig((prev) => {
          // Check if config is actually different
          if (prev?.id === config.id) {
            return prev; // Don't trigger re-render if same config
          }
          return config;
        });
        
        // Update state when config changes
        if (releaseConfigIdChanged || configChanged) {
          setState((prev) => ({
            ...prev,
            releaseConfigId: config.id,
            type: config.releaseType,
            platformTargets: (configChanged && !isEditMode) ? [] : prev.platformTargets,
            branch: (configChanged && !isEditMode) ? '' : prev.branch,
          }));
        }
      }
    } else {
      setSelectedConfig(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConfigId, configurations.length]); // Use configurations.length instead of full array

  // Track which platform-targets have had suggestions applied (one-time per selection)
  const suggestionsApplied = useRef<Set<string>>(new Set());
  // Track previous platformTargets to detect new additions
  const previousPlatformTargets = useRef<PlatformTargetWithVersion[] | undefined>(state.platformTargets);

  // Use version suggestions hook
  const { suggestions, needsVersionSuggestions } = useVersionSuggestions({
    releases,
    releaseType: state.type,
    platformTargets: state.platformTargets,
    currentBranch: state.branch,
    isEditMode,
  });

  // Detect newly added platforms and mark them for suggestions
  useEffect(() => {
    if (isEditMode || !state.platformTargets || state.platformTargets.length === 0) {
      previousPlatformTargets.current = state.platformTargets;
      return;
    }

    const prev = previousPlatformTargets.current || [];
    const current = state.platformTargets;

    // Find newly added platform-targets
    const newPlatformTargets = current.filter((currentPt) => {
      const key = `${currentPt.platform}:${currentPt.target}`;
      const wasInPrevious = prev.some(
        (prevPt) => prevPt.platform === currentPt.platform && prevPt.target === currentPt.target
      );
      
      // If it's new, check if it needs suggestions
      if (!wasInPrevious) {
        // Check if version is empty, undefined, or matches default versions
        const needsSuggestion = !currentPt.version || 
                                currentPt.version === '' ||
                                DEFAULT_VERSIONS.includes(currentPt.version as any);
        
        if (needsSuggestion) {
          // Remove from applied set (allows re-application if re-selected)
          suggestionsApplied.current.delete(key);
        } else {
          // Has a real version, mark as applied so we don't overwrite it
          suggestionsApplied.current.add(key);
        }
      }
      
      return !wasInPrevious;
    });

    previousPlatformTargets.current = current;
  }, [state.platformTargets, isEditMode]);

  // Apply version suggestions when available (one-time per platform selection)
  useEffect(() => {
    if (isEditMode || !suggestions || !state.platformTargets || state.platformTargets.length === 0) {
      return;
    }

    // Only apply suggestions for platforms that haven't had suggestions applied yet
    const updatedPlatformTargets = state.platformTargets.map((pt) => {
      const key = `${pt.platform}:${pt.target}`;
      
      // Skip if suggestions already applied for this platform
      if (suggestionsApplied.current.has(key)) {
        return pt;
      }

      // Check if version needs suggestion (empty, undefined, or default)
      const needsSuggestion = !pt.version || 
                              pt.version === '' ||
                              DEFAULT_VERSIONS.includes(pt.version as any);
      
      if (!needsSuggestion) {
        // Has a real version, mark as applied
        suggestionsApplied.current.add(key);
        return pt;
      }

      // Find suggestion for this platform-target
      const suggestion = suggestions.suggestions.find(
        (s) => s.platform === pt.platform && s.target === pt.target
      );

      if (suggestion) {
        // Mark as applied and update version
        suggestionsApplied.current.add(key);
        return {
          ...pt,
          version: suggestion.suggestedVersion,
        };
      }

      return pt;
    });

    // Check if any versions changed
    const versionsChanged = JSON.stringify(state.platformTargets) !== JSON.stringify(updatedPlatformTargets);

    // Only update platformTargets - branch suggestion should be placeholder only
    if (versionsChanged) {
      setState((prev) => ({
        ...prev,
        platformTargets: updatedPlatformTargets,
        // Don't set branch here - keep it as placeholder only
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, isEditMode]);

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
    const clearedErrors = clearErrorsForFields(errors, updatedFields);
    
    // Update errors (only cleared errors, no new validation)
    setErrors(clearedErrors);
  };

  // Validate a specific field on blur
  const handleFieldBlur = (fieldName: string) => {
    // Mark that validation has been attempted when user interacts with fields
    setHasAttemptedValidation(true);
    
    // Track this field as touched
    setTouchedFields(prev => new Set(prev).add(fieldName));
    
    const validation = validateReleaseCreationState(state, isEditMode, activeStatus || undefined);
    const updatedErrors = { ...errors };
    
    // Update error for the blurred field
    if (validation.errors[fieldName]) {
      updatedErrors[fieldName] = validation.errors[fieldName];
    } else {
      // Clear error if field is now valid
      delete updatedErrors[fieldName];
    }
    
    // For datetime fields, also mark the paired field as touched and update errors
    if (fieldName === 'kickOffDate' || fieldName === 'kickOffTime') {
      setTouchedFields(prev => new Set(prev).add('kickOffDate').add('kickOffTime'));
      // Update combined datetime error for kickoff
      if (validation.errors.kickOffDateTime) {
        updatedErrors.kickOffDateTime = validation.errors.kickOffDateTime;
      } else {
        delete updatedErrors.kickOffDateTime;
      }
      // Also handle individual field errors (for required, format errors, etc.)
      if (validation.errors.kickOffDate) {
        updatedErrors.kickOffDate = validation.errors.kickOffDate;
      } else {
        delete updatedErrors.kickOffDate;
      }
      if (validation.errors.kickOffTime) {
        updatedErrors.kickOffTime = validation.errors.kickOffTime;
      } else {
        delete updatedErrors.kickOffTime;
      }
      
      // Also validate dependent fields (only if they've been touched)
      if (touchedFields.has('targetReleaseDate') || touchedFields.has('targetReleaseTime')) {
        if (validation.errors.targetReleaseDateTime) {
          updatedErrors.targetReleaseDateTime = validation.errors.targetReleaseDateTime;
        } else if (updatedErrors.targetReleaseDateTime) {
          delete updatedErrors.targetReleaseDateTime;
        }
        if (validation.errors.targetReleaseDate) {
          updatedErrors.targetReleaseDate = validation.errors.targetReleaseDate;
        } else if (updatedErrors.targetReleaseDate?.includes('after kickoff')) {
          delete updatedErrors.targetReleaseDate;
        }
        if (validation.errors.targetReleaseTime) {
          updatedErrors.targetReleaseTime = validation.errors.targetReleaseTime;
        } else if (updatedErrors.targetReleaseTime?.includes('after kickoff')) {
          delete updatedErrors.targetReleaseTime;
        }
      }
    }
    
    if (fieldName === 'targetReleaseDate' || fieldName === 'targetReleaseTime') {
      setTouchedFields(prev => new Set(prev).add('targetReleaseDate').add('targetReleaseTime'));
      // Update combined datetime error for target release
      if (validation.errors.targetReleaseDateTime) {
        updatedErrors.targetReleaseDateTime = validation.errors.targetReleaseDateTime;
      } else {
        delete updatedErrors.targetReleaseDateTime;
      }
      // Also handle individual field errors (for required, format errors, etc.)
      if (validation.errors.targetReleaseDate) {
        updatedErrors.targetReleaseDate = validation.errors.targetReleaseDate;
      } else {
        delete updatedErrors.targetReleaseDate;
      }
      if (validation.errors.targetReleaseTime) {
        updatedErrors.targetReleaseTime = validation.errors.targetReleaseTime;
      } else {
        delete updatedErrors.targetReleaseTime;
      }
      
      // Also validate dependent fields (only if they've been touched)
      if (touchedFields.has('kickOffDate') || touchedFields.has('kickOffTime')) {
        if (validation.errors.kickOffDateTime) {
          updatedErrors.kickOffDateTime = validation.errors.kickOffDateTime;
        } else {
          delete updatedErrors.kickOffDateTime;
        }
        if (validation.errors.kickOffDate) {
          updatedErrors.kickOffDate = validation.errors.kickOffDate;
        } else {
          delete updatedErrors.kickOffDate;
        }
        if (validation.errors.kickOffTime) {
          updatedErrors.kickOffTime = validation.errors.kickOffTime;
        } else {
          delete updatedErrors.kickOffTime;
        }
      }
    }
    
    setErrors(updatedErrors);
  };

  // Handle editing slot change
  const handleEditingSlotChange = (slot: any | null, index: number) => {
    if (slot) {
      setEditingSlot({ slot, index });
    } else {
      setEditingSlot(null);
    }
  };

  // Continuous validation - always check validity for button state
  // Only show errors after first validation attempt (user interaction)
  useEffect(() => {
    // Include editing slot in validation if one exists
    const slotsForValidation = editingSlot 
      ? (() => {
          const slots = [...(state.regressionBuildSlots || [])];
          if (editingSlot.index >= 0 && editingSlot.index < slots.length) {
            // Replace the slot at the editing index with the editing slot
            slots[editingSlot.index] = editingSlot.slot;
          } else if (editingSlot.index === -1) {
            // Pending slot (new slot being added)
            slots.push(editingSlot.slot);
          }
          return slots;
        })()
      : state.regressionBuildSlots;
    
    const stateWithEditingSlot = editingSlot 
      ? { ...state, regressionBuildSlots: slotsForValidation }
      : state;
    
    const validation = validateReleaseCreationState(stateWithEditingSlot, isEditMode, activeStatus || undefined);
    
    // Console log validation errors for debugging
    console.log('Validation Errors:', validation.errors);
    
    // Always update form validity (for button disable state)
    setIsFormValid(validation.isValid);
    
    // Only update errors for touched fields (to avoid showing errors on untouched fields)
    if (hasAttemptedValidation) {
      setErrors(prevErrors => {
        const updatedErrors = { ...prevErrors };
        
        // Only update errors for fields that have been touched
        Object.keys(validation.errors).forEach(fieldName => {
          // Check if field has been touched, or if it's a slot error (always show slot errors when editing or after validation attempt)
          const isSlotError = fieldName.startsWith('slot-');
          const isEditingSlotError = editingSlot && isSlotError && fieldName === `slot-${editingSlot.index + 1}`;
          // Always show slot errors once validation has been attempted (similar to edit release mode)
          const shouldShowSlotError = isSlotError && hasAttemptedValidation;
          
          // For combined datetime errors, check if either date or time field has been touched
          const isKickoffDateTimeError = fieldName === 'kickOffDateTime';
          const isTargetReleaseDateTimeError = fieldName === 'targetReleaseDateTime';
          const shouldShowCombinedError = 
            (isKickoffDateTimeError && (touchedFields.has('kickOffDate') || touchedFields.has('kickOffTime'))) ||
            (isTargetReleaseDateTimeError && (touchedFields.has('targetReleaseDate') || touchedFields.has('targetReleaseTime')));
          
          if (touchedFields.has(fieldName) || isEditingSlotError || shouldShowCombinedError || shouldShowSlotError) {
            updatedErrors[fieldName] = validation.errors[fieldName];
          }
        });
        
        // Clear errors for touched fields that are now valid
        touchedFields.forEach(fieldName => {
          if (!validation.errors[fieldName] && prevErrors[fieldName]) {
            delete updatedErrors[fieldName];
          }
        });
        
        // Also clear slot errors that are no longer in validation (even if not in touchedFields)
        // This ensures slot errors are cleared when slots are fixed or when dependent fields change
        Object.keys(prevErrors).forEach(fieldName => {
          if (fieldName.startsWith('slot-') && !validation.errors[fieldName]) {
            delete updatedErrors[fieldName];
          }
        });
        
        return updatedErrors;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isEditMode, activeStatus, hasAttemptedValidation, editingSlot, touchedFields]);

  // Handle review and submit
  const handleReviewAndSubmit = () => {
    // Mark that validation has been attempted
    setHasAttemptedValidation(true);
    
    // Mark all fields as touched when attempting to submit (so all errors are shown)
    const validation = validateReleaseCreationState(state, isEditMode, activeStatus || undefined);
    const allFieldNames = Object.keys(validation.errors);
    setTouchedFields(new Set(allFieldNames));
    
    // In edit mode, submit directly without review modal
    if (isEditMode) {
      handleConfirmSubmit();
      return;
    }

    // Validate before opening modal
    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[CreateRelease] Validation Errors:', validation.errors);
        console.error('[CreateRelease] Current State:', state);
      }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('[UpdateRelease] Update Request:', JSON.stringify(updateRequest, null, 2));
        }
        await onUpdate(updateRequest);
      } else {
        // Create mode: convert to create request
        // Pass the release type from the selected config (MAJOR/MINOR/HOTFIX)
        const configReleaseType = selectedConfig?.releaseType;
        const backendRequest = convertStateToBackendRequest(
          state as ReleaseCreationState,
          configReleaseType
        );

        if (process.env.NODE_ENV === 'development') {
          console.log('[CreateRelease] Backend Request:', JSON.stringify(backendRequest, null, 2));
          console.log('[CreateRelease] Using release type from config:', configReleaseType);
        }

        // Add cron config (auto-generated from config)
        const cronConfig = getCronConfig();
        if (Object.keys(cronConfig).length > 0) {
          backendRequest.cronConfig = cronConfig as CronConfig;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[CreateRelease] Submitting to backend:', JSON.stringify(backendRequest, null, 2));
        }

        await onSubmit(backendRequest);

        // Mark draft as successfully saved (prevents auto-save on unmount)
        // markSaveSuccessful(); // Commented out - draft functionality disabled
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

  return (
    <Box>
      <Stack gap="xl">
        {/* Edit Mode Info */}
        {isEditMode && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light" radius="md">
            <Text size="xs">
              {isUpcoming 
                ? "You can edit branch, base branch, and scheduling info. Configuration and platform targets cannot be changed."
                : isAfterKickoff
                ? isPreReleaseInProgress
                  ? "You can only edit target release date. Regression slots cannot be modified as pre-release stage has started."
                  : "You can only edit target release date and modify regression slots."
                : "This release cannot be edited."}
            </Text>
          </Alert>
        )}

        {/* Configuration Selection - Hidden in edit mode */}
        {!isEditMode && (
          <Box>
            <Stack gap="md">

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
              releases={releases}
              isEditMode={isEditMode}
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
                onFieldBlur={handleFieldBlur}
                onEditingSlotChange={handleEditingSlotChange}
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
                onFieldBlur={handleFieldBlur}
                onEditingSlotChange={handleEditingSlotChange}
              />
            ) : null}
          </Box>
        )}

        {/* Validation Errors Summary - Displayed at bottom above submit button */}
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
                const fieldLabel = formatFieldLabel(field);
                
                return (
                  <List.Item key={field}>
                    <Text size="sm">
                      {fieldLabel ? (
                        <>
                          <Text component="span" fw={600}>{fieldLabel}:</Text> {message}
                        </>
                      ) : (
                        formatSlotErrorMessage(message)
                      )}
                    </Text>
                  </List.Item>
                );
              })}
            </List>
          </Alert>
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
              disabled={!isFormValid || isSubmitting}
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

