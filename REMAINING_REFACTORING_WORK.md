# Remaining Refactoring Work

## Status
- ✅ Phase 1 Complete (2/37 files)
- 🚧 Phase 2 In Progress (35 files remaining)

## Files Completed
1. ✅ FixedPipelineCategories.tsx
2. ✅ BuildUploadSelector.tsx

## Files Remaining (35 files)

### High Priority - Large Files with Many Constants
1. ⏳ PipelineEditModal.tsx (481 lines) - Has ~15 hardcoded constants
2. ⏳ ConfigurationWizard.tsx (462 lines) - Has ~10 hardcoded constants  
3. ⏳ CheckmateConfigFormEnhanced.tsx (539 lines) - Has ~8 hardcoded constants

### Pipeline Components (6 files)
4. ⏳ PipelineProviderSelect.tsx
5. ⏳ PipelineList.tsx
6. ⏳ RequiredPipelinesCheck.tsx
7. ⏳ PipelineCard.tsx
8. ⏳ JenkinsConfigForm.tsx
9. ⏳ GitHubActionsConfigForm.tsx
10. ⏳ ManualUploadConfigForm.tsx

### Wizard Components (5 files)
11. ⏳ ConfigSummary.tsx
12. ⏳ WizardNavigation.tsx
13. ⏳ WizardStepIndicator.tsx
14. ⏳ BasicInfoForm.tsx
15. ⏳ wizard-steps.constants.tsx

### Scheduling Components (6 files)
16. ⏳ SchedulingConfig.tsx
17. ⏳ SchedulingStepWrapper.tsx
18. ⏳ ReleaseFrequencySelector.tsx
19. ⏳ WorkingDaysSelector.tsx
20. ⏳ TimezonePicker.tsx
21. ⏳ RegressionSlotEditor.tsx
22. ⏳ RegressionSlotTimeline.tsx

### Test Management Components (2 files)
23. ⏳ TestManagementSelector.tsx
24. ⏳ checkmate-dummy-data.ts

### Communication Components (3 files)
25. ⏳ CommunicationConfig.tsx
26. ⏳ SlackChannelConfigEnhanced.tsx
27. ⏳ SlackChannelMapper.tsx

### Project Management Components (2 files)
28. ⏳ JiraProjectStep.tsx
29. ⏳ JiraPlatformConfigCard.tsx

### Platform/Target Components (2 files)
30. ⏳ PlatformSelector.tsx
31. ⏳ PlatformCard.tsx

### Settings Components (2 files)
32. ⏳ ConfigurationList.tsx
33. ⏳ ConfigurationListItem.tsx

### Other Components (4 files)
34. ⏳ DraftReleaseDialog.tsx
35. ⏳ ManualUploadStep.tsx
36. ⏳ release-config-constants.tsx (needs more cleanup)
37. ⏳ scheduling-validation.ts

## Issues to Fix Per File

### Common Issues Across All Files:
- [ ] Remove inline `interface` definitions → Move to `~/types/release-config-props.ts`
- [ ] Replace `'ANDROID'` → `PLATFORMS.ANDROID`
- [ ] Replace `'IOS'` → `PLATFORMS.IOS`
- [ ] Replace `'JENKINS'` → `BUILD_PROVIDERS.JENKINS`
- [ ] Replace `'GITHUB_ACTIONS'` → `BUILD_PROVIDERS.GITHUB_ACTIONS`
- [ ] Replace `'PRE_REGRESSION'` → `BUILD_ENVIRONMENTS.PRE_REGRESSION`
- [ ] Replace `'REGRESSION'` → `BUILD_ENVIRONMENTS.REGRESSION`
- [ ] Replace `'TESTFLIGHT'` → `BUILD_ENVIRONMENTS.TESTFLIGHT`
- [ ] Replace hardcoded strings → Use constants from `~/constants/release-config-ui.ts`

## Execution Plan

### Batch 1: Critical Large Files (3 files) - NOW
- PipelineEditModal.tsx
- ConfigurationWizard.tsx
- CheckmateConfigFormEnhanced.tsx

### Batch 2: Pipeline Components (7 files)
- All pipeline-related files

### Batch 3: Wizard Components (5 files)
- All wizard-related files

### Batch 4: Scheduling Components (7 files)
- All scheduling-related files

### Batch 5: Everything Else (13 files)
- All remaining components

## Progress Tracking
- Total Files: 37
- Completed: 2 (5%)
- Remaining: 35 (95%)

**Estimated Time**: 2-3 hours for complete refactoring
**Target**: Zero hardcoded constants, zero inline interfaces

