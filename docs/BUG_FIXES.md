# Bug Fixes Documentation

This document tracks all bug fixes applied to the codebase, organized by status (Previous, Current, Future).

---

## Previous Fixes

### 1. Configurations Empty State Fix
**Issue:** Configurations page showed "No configurations yet" even when configurations existed. Required page refresh to display correctly.

**Solution:** Changed `refetchOnMount: false` to `refetchOnMount: true` in `useReleaseConfigs` hook to ensure fresh data on page navigation.

**Files Modified:**
- `app/hooks/useReleaseConfigs.ts`

---

### 2. Pre-Release Stage Approval Fix
**Issue:** Pre-release stage showed "Approve Pre-release stage" button even after approval was given and stage status was COMPLETED.

**Solution:** Added `isStageCompleted` check using `data?.stageStatus === StageStatus.COMPLETED` to hide approval section when stage is completed.

**Files Modified:**
- `app/components/ReleaseProcess/PreReleaseStage.tsx`

---

### 3. Org Card Redirection Fix
**Issue:** Org card navigation was not working correctly when clicking on organization cards from the projects page.

**Solution:** Fixed navigation by using `route()` helper function with correct path `/dashboard/:org/ota/apps` and ensuring `onNavigate` callback properly handles navigation.

**Files Modified:**
- `app/components/Pages/components/OrgsPage/index.tsx`
- `app/components/Pages/components/OrgsPage/components/OrgCard.tsx`

---

### 4. Edit Release Config Bug Fix
**Issue:** When clicking "Edit" on a release configuration card, the wizard opened but all fields were empty instead of being pre-filled with existing configuration data.

**Root Causes:**
1. Wrong BFF API URL format (using query parameter instead of path parameter)
2. Wrong response property (`data.configuration` instead of `data.data`)
3. Backend returning metadata only (SafeConfig) instead of full config

**Solution:**
- Fixed API URL format: `/api/v1/tenants/:tenantId/release-config/:configId` (path param)
- Fixed response property: `data.data` instead of `data.configuration`
- Backend now returns full config (not just SafeConfig) for GET by ID endpoint

**Files Modified:**
- `app/routes/dashboard.$org.releases.configure.tsx`
- `api/script/controllers/release-configs/release-config.controller.ts`

---

### 5. Checkmate Release Configuration Fix
**Issue:** After connecting a Checkmate integration, Release Configuration form still showed "No Checkmate integration found" even though integration was connected.

**Root Causes:**
1. Route was using mock/hardcoded data instead of real API
2. Backend not returning non-sensitive config fields (baseUrl, orgId)
3. Form not initializing from existing config

**Solution:**
- Replaced mock data with real API calls in route loader
- Backend now includes non-sensitive config fields in TEST_MANAGEMENT response
- Form now initializes from existing config and uses integration ID as primary identifier

**Files Modified:**
- `app/routes/dashboard.$org.releases.configure.tsx`
- `app/utils/integration-helpers.ts`
- `app/components/ReleaseConfig/TestManagement/CheckmateConfigForm.tsx`
- `app/components/ReleaseConfig/TestManagement/CheckmateConfigFormEnhanced.tsx`
- `api/script/routes/management.ts`

---

### 6. Create App Context-Aware Dropdown Fix
**Issue:** When creating an app from within an organization, the "Select Organization" dropdown was still showing, even though the app should automatically be created in that organization.

**Root Cause:** When there were no apps, clicking "Create App" navigated to global route `/dashboard/create/app` which doesn't have org context.

**Solution:** Refactored component to always render modal at top level instead of navigating. Modal uses `CreateAppForm` which is context-aware and checks `params.org` to hide dropdown when org context exists.

**Files Modified:**
- `app/components/Pages/components/AppListPage/index.tsx`

---

### 7. Target Release Date Extension delayReason Field Not Showing Fix
**Issue:** When modifying the target release date for a release, `delayReason` is mandatory when extending the date (as per backend validation), but the UI was not showing the delay reason input field in some cases.

**Root Cause:** The `isExtendingTargetDate` calculation was comparing only dates (date strings) instead of full datetimes (date + time). This caused the UI to miss cases where:
- The date stayed the same but time was extended
- Date-only comparison didn't match backend validation which compares full ISO datetime strings

**Solution:**
- Updated `isExtendingTargetDate` calculation to compare full datetimes using `combineDateAndTime()` helper
- Now compares `existingRelease.targetReleaseDate` (ISO datetime) with combined `targetReleaseDate + targetReleaseTime` from state
- This ensures UI detection matches backend validation logic exactly
- Added `targetReleaseTimeValue` to useMemo dependencies to recalculate when time changes

**Files Modified:**
- `app/components/ReleaseCreation/ReleaseSchedulingPanel.tsx`

---

## Current Fixes

### 8. GitHub Actions PAT Token Mandatory Fix
**Issue:** PAT Token field was marked as optional in GitHub Actions connection flow, but it should be mandatory for new connections.

**Solution:**
- Updated label from "Personal Access Token (Optional)" to "Personal Access Token"
- Updated description to "Required. Create a token with repo, workflow, and read:org scopes"
- Removed tip message about leaving token empty
- Added `required={!isEditMode}` prop to PasswordInput
- Added validation in `handleVerify` and `handleConnect` to check token is provided for non-edit mode
- Token remains optional in edit mode (to keep existing token)

**Files Modified:**
- `app/constants/integration-ui.ts`
- `app/components/Integrations/GitHubActionsConnectionFlow.tsx`

---

### 9. Workflow Parameters Manual Entry Removal & Required Parameter Protection Fix
**Issue:** 
1. Manual parameter entry was available in workflow creation/edit, which could lead to inconsistencies with fetched parameters
2. Required parameters could be deleted in fetched parameters mode
3. Workflow parameters for Jenkins and GitHub Actions were not in parity (different removal behaviors)

**Solution:**
- Commented out all manual parameter entry flows in both Jenkins and GitHub Actions config forms
- Added auto-fetch logic: When editing workflows, if `parameterDefinitions` are missing, parameters are automatically fetched
- Added required parameter protection: Required parameters cannot be deleted (remove button only shown for non-required parameters)
- Updated `handleRemoveParameter`/`handleRemoveInput` to check `param.required` before allowing deletion
- Restored `parameterDefinitions` in edit mode in both `WorkflowForm` and `WorkflowCreateModal` to preserve fetched parameter metadata
- Ensured parity between Jenkins and GitHub Actions: Both now follow the same pattern for parameter handling

**Files Modified:**
- `app/components/ReleaseConfig/BuildPipeline/JenkinsConfigForm.tsx`
- `app/components/ReleaseConfig/BuildPipeline/GitHubActionsConfigForm.tsx`
- `app/components/ReleaseSettings/WorkflowForm.tsx`
- `app/components/ReleaseSettings/WorkflowCreateModal.tsx`

---

### 10. Remove Unused Test Management Configuration Fields Fix
**Issue:** 
1. "Auto-create Test Runs" field was displayed in test management configuration but not used in backend
2. "Filter Type" (AND/OR) option was displayed but backend uses hardcoded default 'and' value, ignoring frontend selection

**Solution:**
- Removed "Auto-create Test Runs" Switch from CheckmateConfigFormEnhanced component
- Removed "Filter Type" Radio.Group (AND/OR selection) from CheckmateConfigFormEnhanced component
- Removed unused imports (Radio, Switch) from component
- Test Configuration Settings now only shows "Pass Threshold (%)" field
- Backend continues to use default 'and' for filterType (hardcoded)

**Files Modified:**
- `app/components/ReleaseConfig/TestManagement/CheckmateConfigFormEnhanced.tsx`

---

### 11. Kickoff Reminder Date Timezone Conversion Fix
**Issue:** When displaying `kickOffReminderDate` from backend API (UTC format like `2025-12-28T23:30:00.000Z`), the update release form showed incorrect date/time. It displayed `2025-12-28T05:00:00.000` (IST) instead of `2025-12-29T05:00:00.000` (IST).

**Root Cause:** The `extractDateAndTime` function was mixing UTC date with local timezone time:
- Date was extracted using `toISOString().split('T')[0]` (UTC date)
- Time was extracted using `getHours()` and `getMinutes()` (local timezone)
- This caused date to be one day behind when UTC time crossed midnight in local timezone

**Solution:**
- Updated `extractDateAndTime` to use local timezone for both date and time extraction
- Changed from `toISOString().split('T')[0]` to `getFullYear()`, `getMonth()`, `getDate()` for date
- Now both date and time are consistently in user's local timezone
- Example: UTC `2025-12-28T23:30:00.000Z` → IST `2025-12-29T05:00:00.000` (correct)

**Files Modified:**
- `app/utils/release-creation-converter.ts`

---

### 12. Project Management Configuration UI Cleanup Fix
**Issue:** 
1. Unnecessary labels and icons were cluttering the project management configuration UI
2. Issue Type field was optional but should be required
3. Global Settings section (createReleaseTicket, linkBuildsToIssues) was irrelevant and not used

**Solution:**
- Removed ThemeIcon from info header and enable toggle section in JiraProjectStep
- Removed IconCheck badge when integration is enabled
- Removed icon emoji and label from platform header in JiraPlatformConfigCard (kept only platform badge)
- Made Issue Type field required: Added `required` prop, removed `clearable`, updated type definition from `issueType?: string` to `issueType: string`
- Removed entire Global Settings section (createReleaseTicket, linkBuildsToIssues checkboxes)
- Removed `handleGlobalSettingChange` function
- Updated `createDefaultPlatformConfigs` to include default `issueType: 'Task'`
- Updated validation to require issueType in both `validatePlatformConfig` and `validateProjectManagement`
- Updated transformer to handle issueType as required field with default fallback

**Files Modified:**
- `app/components/ReleaseConfig/JiraProject/JiraProjectStep.tsx`
- `app/components/ReleaseConfig/JiraProject/JiraPlatformConfigCard.tsx`
- `app/types/release-config.ts`
- `app/utils/jira-config-transformer.ts`
- `app/components/ReleaseConfig/Wizard/wizard-validation.ts`

---

### 13. Task Status Filter Consolidation Improvement
**Issue:** Task status filter dropdown showed `AWAITING_CALLBACK` and `AWAITING_MANUAL_BUILD` as separate filter options, creating unnecessary complexity. These statuses represent tasks that are in progress (waiting for external systems), so they should be grouped under "In Progress" filter.

**Solution:**
- Removed `AWAITING_CALLBACK` and `AWAITING_MANUAL_BUILD` from `STATUS_FILTER_OPTIONS` in `release-process-ui.ts`
- Updated `filterAndSortTasks` function to include these statuses when filtering by `IN_PROGRESS`
- When user selects "In Progress" filter, it now shows tasks with:
  - `IN_PROGRESS`
  - `AWAITING_CALLBACK` (CI/CD mode: waiting for external callback)
  - `AWAITING_MANUAL_BUILD` (Manual mode: waiting for user upload)
- This simplifies the UI while maintaining all functionality

**Files Modified:**
- `app/constants/release-process-ui.ts`
- `app/utils/task-filtering.ts`

---

### 14. Polling Interval Constants Consolidation Improvement
**Issue:** Polling intervals were hardcoded throughout the codebase with inconsistent values (3 seconds, 10 seconds, 30 seconds). This made it difficult to maintain consistency and update intervals across the application.

**Solution:**
- Created centralized `app/constants/polling-intervals.ts` with all polling-related constants
- Standardized all polling intervals to 30 seconds:
  - `RELEASE_PROCESS_STAGE_POLLING_INTERVAL` (30s) - for Kickoff, Regression, Pre-Release stages
  - `ACTIVITY_LOGS_POLLING_INTERVAL` (30s) - for activity logs and status checks
  - `DISTRIBUTION_STATUS_POLLING_INTERVAL` (30s) - for distribution polling
- Added cache and stale time constants for consistency:
  - `RELEASE_PROCESS_STAGE_STALE_TIME` (2 minutes)
  - `RELEASE_PROCESS_STAGE_CACHE_TIME` (10 minutes)
  - `ACTIVITY_LOGS_STALE_TIME` (30 seconds)
  - `ACTIVITY_LOGS_CACHE_TIME` (2 minutes)
  - `CHERRY_PICK_STALE_TIME` (1 minute)
  - `CHERRY_PICK_CACHE_TIME` (5 minutes)
- Updated all hooks to use these constants instead of hardcoded values
- Distribution constants now import from the centralized polling-intervals file

**Files Modified:**
- `app/constants/polling-intervals.ts` (new file)
- `app/hooks/useReleaseProcess.ts`
- `app/constants/distribution/distribution.constants.ts`

---

### 15. Reverted smartRetry Implementation Fix
**Issue:** 
1. `smartRetry` utility was causing infinite retry loops on 500 errors
2. Infinite refetching on window focus and other triggers causing performance issues
3. Error handling was overly complex with status code detection

**Solution:**
- Removed `smartRetry` utility function (`app/utils/query-retry.ts`)
- Reverted all hooks back to original retry configuration (`retry: 1` or `retry: 2`)
- Removed all `smartRetry` imports and usage across the codebase
- Restored global default `retry: 1` in `root.tsx`
- Simplified error handling to rely on React Query's default retry behavior

**Files Modified:**
- `app/utils/query-retry.ts` (deleted)
- `app/root.tsx`
- `app/hooks/useRelease.ts`
- `app/hooks/useReleases.ts`
- `app/hooks/useReleaseConfigs.ts`
- `app/hooks/useTenantConfig.ts`
- `app/hooks/useSystemMetadata.ts`
- `app/hooks/useReleaseProcess.ts`
- `app/hooks/useDistributionStage.ts`
- `app/components/TermsAndConditions/hooks/useSimpleTerms.ts`
- `app/components/Pages/components/OrgListNavbar/hooks/useGetOrgList.ts`
- `app/components/Pages/components/OrgListNavbar/data/getOrgList.tsx`
- Multiple other hooks and components

---

### 16. Infinite Refetch Loop Fix for Organizations List
**Issue:** 
1. `/api/v1/tenants` API was causing infinite refetch loops on 500 errors
2. Dashboard component was re-rendering infinitely
3. No error handling in dashboard component for failed org list fetch

**Root Causes:**
1. `useGetOrgList` hook was inheriting global defaults (`refetchOnWindowFocus: true`, `retry: 1`)
2. On 500 errors, React Query would retry, then refetch on window focus, causing infinite loops
3. Dashboard component didn't check for `isError` state, silently ignoring errors

**Solution:**
- Disabled all refetch triggers in `useGetOrgList` hook:
  - `retry: false` - No automatic retries
  - `refetchOnWindowFocus: false` - Don't refetch on window focus
  - `refetchOnMount: false` - Don't refetch on mount if data exists
  - `refetchOnReconnect: false` - Don't refetch on reconnect
- Added error state handling in dashboard component (checking `isError` and `error`)
- Simplified `getOrgList` error handling to throw standard `Error` instead of `ApiError`

**Files Modified:**
- `app/components/Pages/components/OrgListNavbar/hooks/useGetOrgList.ts`
- `app/components/Pages/components/OrgListNavbar/data/getOrgList.tsx`
- `app/routes/dashboard.tsx`

---

### 17. HeaderUserButton Null Reference Error Fix
**Issue:** `TypeError: Cannot read properties of undefined (reading 'user')` in `HeaderUserButton` component when user data was missing.

**Root Cause:** Component was accessing `user.user` without checking if `user` or `user.user` exists.

**Solution:**
- Added defensive null check at start of component: `if (!user?.user) return null;`
- Added conditional rendering in dashboard: `{user?.user && <HeaderUserButton user={user} />}`
- Added optional chaining for `userEmail` prop: `user?.user?.email || ''`

**Files Modified:**
- `app/components/UserButton/HeaderUserButton.tsx`
- `app/routes/dashboard.tsx`

---

### 18. Workflow Name Validation Fix
**Issue:** Workflow name validation was incorrectly flagging the current workflow as duplicate when editing, preventing users from saving workflows with the same name.

**Root Cause:** Validation logic was not excluding the current workflow when checking for duplicates in edit mode.

**Solution:**
- Created centralized `validateWorkflowName` utility function in `app/utils/workflow-validation.ts`
- Validation now correctly excludes current workflow when in edit mode
- Updated both `WorkflowForm` and `WorkflowCreateModal` to use the utility
- Validation checks: `wf.id !== (existingWorkflow?.id || workflowId)` when editing

**Files Modified:**
- `app/utils/workflow-validation.ts` (new file)
- `app/components/ReleaseSettings/WorkflowForm.tsx`
- `app/components/ReleaseSettings/WorkflowCreateModal.tsx`
- `app/routes/dashboard.$org.releases.workflows.$workflowId.tsx`

---

### 19. Workflow Edit Navigation Fix
**Issue:** Clicking "Edit" on a workflow card caused a full page reload instead of client-side navigation.

**Root Cause:** Using `window.location.href` instead of Remix's `useNavigate` hook.

**Solution:**
- Replaced `window.location.href` with `useNavigate()` from `@remix-run/react`
- Navigation now uses client-side routing: `navigate(route("/dashboard/:org/releases/workflows/:workflowId", { org, workflowId }))`

**Files Modified:**
- `app/components/ReleaseSettings/WorkflowList.tsx`

---

### 20. Organization Card Redirect Fix
**Issue:** Clicking on organization card from dashboard redirected to `/dashboard/:org/ota/apps` instead of `/dashboard/:org/releases`.

**Root Cause:** Hardcoded navigation path in `OrgCard` and `OrgSwitcher` components.

**Solution:**
- Updated `OrgCard` `onNavigate` callback to redirect to `/dashboard/:org/releases`
- Updated `OrgSwitcher` onClick handler to redirect to `/dashboard/:org/releases`
- Changed from `/dashboard/:org/ota/apps` to `/dashboard/:org/releases`

**Files Modified:**
- `app/components/Pages/components/OrgsPage/index.tsx`
- `app/components/Pages/components/AppListPage/components/OrgSwitcher.tsx`

---

### 21. Release List Refresh on Archive Fix
**Issue:** 
1. Archiving a release on releases page did not refresh the release list
2. Tab counts (upcoming, active, completed) were not updating after archive
3. Tab switches should also refresh releases to catch status changes

**Solution:**
- Enabled `refetchOnMount: true` in `useReleases` hook to ensure fresh data on mount
- Implemented optimistic updates in `useArchiveRelease` hook:
  - Immediately updates local cache with archived release
  - Background refetch ensures data consistency
- Added `invalidateCache()` call on tab change to force refetch when switching tabs
- Removed redundant `refetchQueries` call from `ReleaseCard` component (handled by hook)

**Files Modified:**
- `app/hooks/useReleases.ts`
- `app/hooks/useReleaseProcess.ts`
- `app/routes/dashboard.$org.releases._index.tsx`
- `app/components/Releases/ReleaseCard.tsx`

---

### 22. Release Update Optimistic Updates Fix
**Issue:** Release updates (modify workflow, edit release) were not providing immediate UI feedback, requiring manual refresh to see changes.

**Solution:**
- Implemented optimistic updates in `ReleaseProcessHeader` and `ReleaseDetailsHeader` components
- Updates local cache immediately with new release data
- Background refetch ensures data consistency with server
- Added `refetchOnMount: true` in `useRelease` hook to ensure fresh data on mount

**Files Modified:**
- `app/components/ReleaseProcess/ReleaseProcessHeader.tsx`
- `app/components/Releases/ReleaseDetailsHeader.tsx`
- `app/hooks/useRelease.ts`
- `app/components/ReleaseProcess/shared/ReleaseHeaderModals.tsx`

---

### 23. Release Schedule initialVersions Format Handling Fix
**Issue:** Backend expects `initialVersions` as an array `[{ platform, target, version }]`, but frontend sometimes sends it as an object `{ IOS: '1.0.0' }`. When the backend returns data in array format and it's sent back, the transformation logic failed because it only handled object format.

**Root Cause:** The transformation logic in `prepareReleaseConfigPayload` only handled object format, using `Object.entries()` which doesn't work correctly on arrays.

**Solution:**
- Updated transformation to handle both array and object formats
- If `initialVersions` is already an array (backend format), validate and use directly
- If `initialVersions` is an object (frontend format), transform to array format
- Added validation to ensure platform-target combinations match `platformTargets`
- Added debug logging to trace transformation process

**Files Modified:**
- `app/.server/services/ReleaseConfig/release-config-payload.ts`

---

### 24. Workflow providerConfig Null Reference Fix
**Issue:** `TypeError: Cannot read properties of undefined (reading 'type')` when transforming workflows that don't have a `providerConfig` field.

**Root Cause:** The transformation function was accessing `providerConfig.type` without checking if `providerConfig` exists first.

**Solution:**
- Added null check before accessing `providerConfig.type`
- Added error handling to throw descriptive error if `providerConfig` is missing in frontend format
- Transformation now safely handles workflows with missing `providerConfig`

**Files Modified:**
- `app/.server/services/ReleaseConfig/release-config-payload.ts`

---

### 25. App Distribution Draft Storage Cross-Contamination Fix
**Issue:** When editing a distribution connection, App Store draft data was appearing in Play Store forms and vice versa. This happened because both `useDraftStorage` hooks were receiving the same `existingData` regardless of the active `storeType`.

**Root Cause:** Both Play Store and App Store draft hooks were receiving `existingData` even when the `storeType` didn't match, causing cross-contamination of draft data.

**Solution:**
- Modified `AppDistributionConnectionFlow` to conditionally pass `existingData` only when:
  - `isEditMode` is true AND
  - `storeType` matches the specific draft (Play Store or App Store)
- Each draft hook now only receives `existingData` when the `storeType` matches
- Prevents App Store data from appearing in Play Store forms and vice versa

**Files Modified:**
- `app/components/Integrations/AppDistributionConnectionFlow.tsx`

---

### 26. Workflow Transformation Format Handling Fix
**Issue:** Workflows were being sent in backend format (`displayName`, `providerType`) but the transformation function expected frontend format (`name`, `provider`, `providerConfig`), causing missing fields in the payload.

**Root Cause:** The transformation function only handled frontend format, but workflows were sometimes stored in backend format in the config state.

**Solution:**
- Refactored transformation into two utility functions:
  - `transformBackendFormatWorkflow`: Handles backend format (pass-through with validation)
  - `transformFrontendFormatWorkflow`: Transforms frontend format to backend format
- Main function detects format and calls appropriate utility
- Replaced hardcoded strings `'JENKINS'` and `'GITHUB_ACTIONS'` with `BUILD_PROVIDERS` constants
- Improved code readability and maintainability

**Files Modified:**
- `app/.server/services/ReleaseConfig/release-config-payload.ts`

---

## Future Fixes

_No future fixes documented yet. Add new fixes here as they are identified._

