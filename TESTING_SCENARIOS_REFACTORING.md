# Testing Scenarios - Refactoring Changes

## Overview

This document outlines comprehensive testing scenarios for all refactoring changes made in the recent migration. Test all scenarios to ensure functionality remains intact after the architectural improvements.

---

## 1. Project Management Integration (Jira Migration)

### 1.1 Jira Connection Flow

#### ✅ Test: Connect New Jira Integration
**Steps:**
1. Navigate to `/dashboard/{org}/releases/settings?tab=integrations`
2. Click "Connect" on Jira integration card
3. Fill in Jira connection form:
   - Display Name: "Test Jira"
   - Jira Type: Select "Jira Cloud"
   - Base URL: `https://test.atlassian.net`
   - Email: `test@example.com`
   - API Token: Enter valid token
4. Click "Verify Credentials"
5. Verify success message appears
6. Click "Connect Jira"
7. Verify integration appears in connected integrations list

**Expected:**
- ✅ Verification succeeds
- ✅ Connection succeeds
- ✅ Integration appears in list
- ✅ No console errors
- ✅ API calls go to `/api/v1/tenants/{tenantId}/integrations/project-management?providerType=JIRA`

#### ✅ Test: Verify Jira Credentials (Invalid)
**Steps:**
1. Navigate to Jira connection modal
2. Enter invalid credentials (wrong API token)
3. Click "Verify Credentials"

**Expected:**
- ✅ Error message displayed
- ✅ Connection button remains disabled
- ✅ API call to `/api/v1/tenants/{tenantId}/integrations/project-management/verify?providerType=JIRA`

#### ✅ Test: Edit Existing Jira Integration
**Steps:**
1. Navigate to integrations tab
2. Find connected Jira integration
3. Click "Edit" or "Manage"
4. Update display name or credentials
5. Save changes

**Expected:**
- ✅ Update succeeds
- ✅ Changes reflected in UI
- ✅ API call uses PATCH to `/api/v1/tenants/{tenantId}/integrations/project-management`

#### ✅ Test: Disconnect Jira Integration
**Steps:**
1. Navigate to integrations tab
2. Find connected Jira integration
3. Click "Disconnect"
4. Confirm disconnection

**Expected:**
- ✅ Disconnection succeeds
- ✅ Integration removed from list
- ✅ API call uses DELETE to `/api/v1/tenants/{tenantId}/integrations/project-management?integrationId={id}`

#### ✅ Test: List Jira Integrations
**Steps:**
1. Navigate to integrations tab
2. Verify Jira integration appears in list

**Expected:**
- ✅ Integration displayed correctly
- ✅ API call to GET `/api/v1/tenants/{tenantId}/integrations/project-management?providerType=JIRA`

---

### 1.2 Project Management Config

#### ✅ Test: Create PM Config
**Steps:**
1. Navigate to release configuration wizard
2. Complete setup and reach Project Management step
3. Select Jira integration
4. Configure Jira settings (projects, issue types, etc.)
5. Save configuration

**Expected:**
- ✅ Config creation succeeds
- ✅ API call to POST `/api/v1/tenants/{tenantId}/integrations/project-management/config`

#### ✅ Test: Get PM Config
**Steps:**
1. Navigate to existing release configuration
2. View Project Management settings

**Expected:**
- ✅ Config loaded correctly
- ✅ API call to GET `/api/v1/tenants/{tenantId}/integrations/project-management/config`

#### ✅ Test: Update PM Config
**Steps:**
1. Navigate to existing release configuration
2. Edit Project Management settings
3. Save changes

**Expected:**
- ✅ Update succeeds
- ✅ API call to PUT `/api/v1/tenants/{tenantId}/integrations/project-management/config`

#### ✅ Test: Delete PM Config
**Steps:**
1. Navigate to existing release configuration
2. Remove Project Management configuration
3. Save changes

**Expected:**
- ✅ Deletion succeeds
- ✅ API call to DELETE `/api/v1/tenants/{tenantId}/integrations/project-management/config`

---

## 2. Checkmate Metadata Routes Consolidation

### 2.1 Dynamic Metadata Route

#### ✅ Test: Fetch Checkmate Projects
**Steps:**
1. Navigate to release configuration wizard
2. Reach Test Management step
3. Select Checkmate integration
4. Load projects dropdown

**Expected:**
- ✅ Projects loaded successfully
- ✅ API call to GET `/api/v1/integrations/{integrationId}/metadata/projects`
- ✅ Response format matches expected structure

#### ✅ Test: Fetch Checkmate Sections
**Steps:**
1. In Checkmate configuration, select a project
2. Load sections dropdown

**Expected:**
- ✅ Sections loaded successfully
- ✅ API call to GET `/api/v1/integrations/{integrationId}/metadata/sections?projectId={projectId}`
- ✅ Sections filtered by project

#### ✅ Test: Fetch Checkmate Labels
**Steps:**
1. In Checkmate configuration, select a project
2. Load labels dropdown

**Expected:**
- ✅ Labels loaded successfully
- ✅ API call to GET `/api/v1/integrations/{integrationId}/metadata/labels?projectId={projectId}`
- ✅ Labels filtered by project

#### ✅ Test: Fetch Checkmate Squads
**Steps:**
1. In Checkmate configuration, select a project
2. Load squads dropdown

**Expected:**
- ✅ Squads loaded successfully
- ✅ API call to GET `/api/v1/integrations/{integrationId}/metadata/squads?projectId={projectId}`
- ✅ Squads filtered by project

#### ✅ Test: Invalid Metadata Type
**Steps:**
1. Make API call with invalid metadata type (e.g., `/metadata/invalid`)

**Expected:**
- ✅ Returns 400 error
- ✅ Error message: "Invalid metadata type"

---

## 3. Release Management Routes

### 3.1 Releases List Route

#### ✅ Test: List Releases (GET)
**Steps:**
1. Navigate to `/dashboard/{org}/releases`
2. Verify releases list loads

**Expected:**
- ✅ Releases displayed correctly
- ✅ API call to GET `/api/v1/tenants/{tenantId}/releases`
- ✅ Authentication uses `authenticateLoaderRequest`
- ✅ User object available in route handler

#### ✅ Test: List Releases with Tasks
**Steps:**
1. Navigate to releases page
2. Include tasks in query: `?includeTasks=true`

**Expected:**
- ✅ Releases loaded with tasks
- ✅ API call includes `includeTasks=true` parameter

#### ✅ Test: Create Release (POST)
**Steps:**
1. Navigate to create release page
2. Fill in release form
3. Submit release

**Expected:**
- ✅ Release created successfully
- ✅ API call to POST `/api/v1/tenants/{tenantId}/releases`
- ✅ Authentication uses `authenticateActionRequest`
- ✅ Success message displayed
- ✅ Redirect to release detail page

#### ✅ Test: Create Release - Unauthenticated
**Steps:**
1. Log out
2. Attempt to create release via API

**Expected:**
- ✅ Returns 401 Unauthorized
- ✅ Proper error response format

---

### 3.2 Single Release Route

#### ✅ Test: Get Release by ID (GET)
**Steps:**
1. Navigate to `/dashboard/{org}/releases/{releaseId}`
2. Verify release details load

**Expected:**
- ✅ Release details displayed correctly
- ✅ API call to GET `/api/v1/tenants/{tenantId}/releases/{releaseId}`
- ✅ Authentication uses `authenticateLoaderRequest`
- ✅ All release data visible

#### ✅ Test: Update Release (PUT)
**Steps:**
1. Navigate to release detail page
2. Edit release fields
3. Save changes

**Expected:**
- ✅ Update succeeds
- ✅ API call to PUT `/api/v1/tenants/{tenantId}/releases/{releaseId}`
- ✅ Authentication uses `authenticateActionRequest`
- ✅ Changes reflected in UI

#### ✅ Test: Update Release (PATCH)
**Steps:**
1. Navigate to release detail page
2. Edit release fields
3. Save changes

**Expected:**
- ✅ Update succeeds
- ✅ API call to PATCH `/api/v1/tenants/{tenantId}/releases/{releaseId}`
- ✅ Authentication uses `authenticateActionRequest`
- ✅ Changes reflected in UI

#### ✅ Test: Update Release - Invalid ID
**Steps:**
1. Attempt to update non-existent release

**Expected:**
- ✅ Returns 404 error
- ✅ Error message: "Release not found"

---

## 4. Configuration Management

### 4.1 Configuration Stats Component

#### ✅ Test: Display Configuration Stats
**Steps:**
1. Navigate to `/dashboard/{org}/releases/settings?tab=configurations`
2. Verify stats card displays

**Expected:**
- ✅ Stats card visible
- ✅ Total, Active, Draft, Archived counts correct
- ✅ Component renders without errors

#### ✅ Test: Stats Update After Actions
**Steps:**
1. View configurations tab
2. Note current stats
3. Create new configuration
4. Verify stats update

**Expected:**
- ✅ Stats update correctly
- ✅ Total count increases
- ✅ Active count updates if applicable

#### ✅ Test: Draft Configuration Stats
**Steps:**
1. Start creating configuration (save as draft)
2. Navigate to configurations tab
3. Verify draft count includes draft

**Expected:**
- ✅ Draft count includes draft configuration
- ✅ Draft displayed in list

---

### 4.2 Configuration Tab Actions

#### ✅ Test: Edit Configuration
**Steps:**
1. Navigate to configurations tab
2. Click "Edit" on a configuration
3. Verify navigation to configure page with edit mode

**Expected:**
- ✅ Navigates to `/dashboard/{org}/releases/configure?edit={configId}`
- ✅ Configuration data pre-filled
- ✅ Edit mode active

#### ✅ Test: Duplicate Configuration
**Steps:**
1. Navigate to configurations tab
2. Click "Duplicate" on a configuration

**Expected:**
- ✅ Info toast displayed
- ✅ Message: "Duplicate functionality coming soon"

#### ✅ Test: Archive Configuration
**Steps:**
1. Navigate to configurations tab
2. Click "Archive" on a configuration
3. Confirm archiving

**Expected:**
- ✅ Configuration archived
- ✅ Removed from active list
- ✅ Stats update (archived count increases)
- ✅ API call to DELETE `/api/v1/tenants/{tenantId}/release-config/{configId}`

#### ✅ Test: Delete Draft Configuration
**Steps:**
1. Create draft configuration
2. Navigate to configurations tab
3. Click "Archive" on draft
4. Confirm deletion

**Expected:**
- ✅ Draft deleted from localStorage
- ✅ Removed from list
- ✅ Stats update

#### ✅ Test: Set Default Configuration
**Steps:**
1. Navigate to configurations tab
2. Click "Set as Default" on a configuration

**Expected:**
- ✅ Configuration marked as default
- ✅ Success toast displayed
- ✅ API call to PUT `/api/v1/tenants/{tenantId}/release-config/{configId}` with `isDefault: true`

---

## 5. Authentication & Authorization

### 5.1 Authentication Patterns

#### ✅ Test: Authenticated Requests
**Steps:**
1. Log in as valid user
2. Make API requests to all migrated routes

**Expected:**
- ✅ All requests succeed
- ✅ User object available in route handlers
- ✅ `user.user.id` accessible

#### ✅ Test: Unauthenticated Requests
**Steps:**
1. Log out
2. Attempt to access protected routes

**Expected:**
- ✅ Returns 401 Unauthorized
- ✅ Consistent error format
- ✅ Proper error handling

#### ✅ Test: Expired Session
**Steps:**
1. Log in
2. Wait for session to expire (or manually expire)
3. Make API request

**Expected:**
- ✅ Returns 401 Unauthorized
- ✅ Error handled gracefully
- ✅ User redirected to login

---

## 6. Error Handling

### 6.1 API Error Responses

#### ✅ Test: Network Errors
**Steps:**
1. Disconnect network
2. Attempt API operations

**Expected:**
- ✅ Error messages displayed
- ✅ User-friendly error handling
- ✅ No app crashes

#### ✅ Test: Backend Errors (500)
**Steps:**
1. Simulate backend error
2. Make API request

**Expected:**
- ✅ Error message displayed
- ✅ Proper error response format
- ✅ Logging in console

#### ✅ Test: Validation Errors (400)
**Steps:**
1. Submit invalid data to API

**Expected:**
- ✅ Validation error displayed
- ✅ Specific error message
- ✅ Form highlights invalid fields

#### ✅ Test: Not Found Errors (404)
**Steps:**
1. Access non-existent resource

**Expected:**
- ✅ 404 error displayed
- ✅ User-friendly message
- ✅ Proper error handling

---

## 7. Service Layer Integration

### 7.1 Service Calls

#### ✅ Test: All Routes Use Service Layer
**Steps:**
1. Monitor network requests
2. Verify all API routes call service layer

**Expected:**
- ✅ No direct `fetch()` calls to backend
- ✅ All routes use service classes
- ✅ Consistent service patterns

#### ✅ Test: Service Error Handling
**Steps:**
1. Simulate service layer errors
2. Verify error propagation

**Expected:**
- ✅ Errors handled at service level
- ✅ Proper error responses
- ✅ Consistent error format

---

## 8. Backward Compatibility

### 8.1 Response Format Compatibility

#### ✅ Test: Jira Integration Response Format
**Steps:**
1. Connect Jira integration
2. Verify response format matches expected structure

**Expected:**
- ✅ Response format unchanged
- ✅ UI components work without modification
- ✅ Backward compatible

#### ✅ Test: Release API Response Format
**Steps:**
1. List releases
2. Get single release
3. Verify response formats

**Expected:**
- ✅ Response formats unchanged
- ✅ UI components work correctly
- ✅ No breaking changes

---

## 9. Performance & Optimization

### 9.1 Component Memoization

#### ✅ Test: ConfigurationStats Re-renders
**Steps:**
1. Navigate to configurations tab
2. Perform actions that update parent state
3. Verify stats component doesn't re-render unnecessarily

**Expected:**
- ✅ Component memoized correctly
- ✅ No unnecessary re-renders
- ✅ Performance optimized

#### ✅ Test: ConfigurationsTab Re-renders
**Steps:**
1. Navigate to configurations tab
2. Perform various actions
3. Monitor component re-renders

**Expected:**
- ✅ Minimal re-renders
- ✅ Handlers memoized with `useCallback`
- ✅ Performance optimized

---

## 10. Edge Cases

### 10.1 Empty States

#### ✅ Test: No Integrations
**Steps:**
1. Navigate to integrations tab with no integrations

**Expected:**
- ✅ Empty state displayed
- ✅ No errors
- ✅ User-friendly message

#### ✅ Test: No Configurations
**Steps:**
1. Navigate to configurations tab with no configurations

**Expected:**
- ✅ Empty state displayed
- ✅ Stats show zeros
- ✅ Create button visible

#### ✅ Test: No Releases
**Steps:**
1. Navigate to releases page with no releases

**Expected:**
- ✅ Empty state displayed
- ✅ Create release button visible
- ✅ No errors

---

### 10.2 Concurrent Operations

#### ✅ Test: Multiple Simultaneous Requests
**Steps:**
1. Trigger multiple API requests simultaneously
2. Verify all complete successfully

**Expected:**
- ✅ All requests complete
- ✅ No race conditions
- ✅ Proper error handling

#### ✅ Test: Rapid Tab Switching
**Steps:**
1. Rapidly switch between tabs in settings page
2. Verify no errors or crashes

**Expected:**
- ✅ No errors
- ✅ Smooth transitions
- ✅ Data loads correctly

---

## 11. Browser Compatibility

### 11.1 Cross-Browser Testing

#### ✅ Test: Chrome
**Steps:**
1. Test all scenarios in Chrome

**Expected:**
- ✅ All features work
- ✅ No console errors
- ✅ UI renders correctly

#### ✅ Test: Firefox
**Steps:**
1. Test all scenarios in Firefox

**Expected:**
- ✅ All features work
- ✅ No console errors
- ✅ UI renders correctly

#### ✅ Test: Safari
**Steps:**
1. Test all scenarios in Safari

**Expected:**
- ✅ All features work
- ✅ No console errors
- ✅ UI renders correctly

---

## 12. Mobile Responsiveness

### 12.1 Mobile Views

#### ✅ Test: Mobile Integration Flow
**Steps:**
1. Open app on mobile device
2. Navigate to integrations
3. Connect Jira integration

**Expected:**
- ✅ UI responsive
- ✅ Forms usable
- ✅ No layout issues

#### ✅ Test: Mobile Configuration Tab
**Steps:**
1. Open configurations tab on mobile
2. Verify stats card layout
3. Test configuration actions

**Expected:**
- ✅ Stats card responsive
- ✅ Actions accessible
- ✅ No layout issues

---

## 13. Data Persistence

### 13.1 LocalStorage

#### ✅ Test: Draft Configuration Persistence
**Steps:**
1. Start creating configuration
2. Navigate away
3. Return to configurations tab
4. Verify draft persists

**Expected:**
- ✅ Draft saved in localStorage
- ✅ Draft visible in list
- ✅ Can resume editing

#### ✅ Test: Clear Draft
**Steps:**
1. Create draft
2. Delete draft
3. Verify localStorage cleared

**Expected:**
- ✅ Draft removed from localStorage
- ✅ Draft removed from list
- ✅ Stats update

---

## 14. Integration Points

### 14.1 Release Configuration Wizard

#### ✅ Test: Jira Integration in Wizard
**Steps:**
1. Start release configuration wizard
2. Reach Project Management step
3. Select Jira integration
4. Configure settings
5. Complete wizard

**Expected:**
- ✅ Jira integration selectable
- ✅ Config saved correctly
- ✅ Wizard completes successfully

#### ✅ Test: Checkmate Integration in Wizard
**Steps:**
1. Start release configuration wizard
2. Reach Test Management step
3. Select Checkmate integration
4. Load projects, sections, labels, squads
5. Configure settings
6. Complete wizard

**Expected:**
- ✅ Metadata loads correctly
- ✅ All dropdowns populate
- ✅ Config saved correctly

---

## 15. Regression Testing

### 15.1 Existing Functionality

#### ✅ Test: All Existing Features
**Steps:**
1. Test all features that existed before refactoring
2. Verify nothing broke

**Expected:**
- ✅ All existing features work
- ✅ No regressions
- ✅ Performance maintained or improved

---

## Testing Checklist Summary

### Critical Paths (Must Test)
- [ ] Jira connection flow (verify, connect, edit, disconnect)
- [ ] Release list and creation
- [ ] Release detail and update
- [ ] Configuration stats display
- [ ] Configuration actions (edit, archive, set default)
- [ ] Checkmate metadata loading (all 4 types)
- [ ] Authentication on all routes

### Important Paths (Should Test)
- [ ] PM config CRUD operations
- [ ] Error handling scenarios
- [ ] Empty states
- [ ] Draft configuration management
- [ ] Backward compatibility

### Nice to Have (Can Test)
- [ ] Performance optimization
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
- [ ] Concurrent operations

---

## Test Execution Notes

1. **Test Environment:** Use staging/dev environment
2. **Test Data:** Use test accounts and integrations
3. **Documentation:** Document any issues found
4. **Priority:** Focus on critical paths first
5. **Automation:** Consider automating critical paths

---

## Success Criteria

✅ **All tests pass**
✅ **No console errors**
✅ **No regressions**
✅ **Performance maintained**
✅ **User experience unchanged or improved**

