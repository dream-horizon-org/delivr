# Integration Components Refactoring Plan

## ✅ Completed

### 1. Created Centralized Constants
- ✅ `app/constants/integration-ui.ts` - UI-specific labels, messages
- ✅ Leverages existing `~/types/release-config-constants.ts` for system constants
- ✅ Leverages existing `~/constants/integrations.ts` for integration types

### 2. Created Reusable Components
- ✅ `ConfigDisplayField.tsx` - Display config key-value pairs
- ✅ `ConnectionAlert.tsx` - Consistent alert styling
- ✅ `ActionButtons.tsx` - Reusable button groups
- ✅ `InstructionsPanel.tsx` - Setup instructions display
- ✅ `ScopeChip.tsx` - OAuth scope chips

##  Files Requiring Refactoring

### Priority 1: Remove ALL Hardcoded System Constants

**Use Existing Global Constants:**

From `~/types/release-config-constants.ts`:
```typescript
PLATFORMS.ANDROID, PLATFORMS.IOS
TARGET_PLATFORMS.PLAY_STORE, TARGET_PLATFORMS.APP_STORE, TARGET_PLATFORMS.WEB
BUILD_ENVIRONMENTS.REGRESSION, BUILD_ENVIRONMENTS.TESTFLIGHT, BUILD_ENVIRONMENTS.PRODUCTION
BUILD_PROVIDERS.JENKINS, BUILD_PROVIDERS.GITHUB_ACTIONS, BUILD_PROVIDERS.MANUAL_UPLOAD
TEST_PROVIDERS.CHECKMATE, TEST_PROVIDERS.TESTRAIL
```

From `~/constants/integrations.ts`:
```typescript
TARGET_PLATFORM_TYPES.APP_STORE, TARGET_PLATFORM_TYPES.PLAY_STORE
CICD_PROVIDER_TYPES.GITHUB_ACTIONS, CICD_PROVIDER_TYPES.JENKINS
VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.VALID, VERIFICATION_STATUS.INVALID
```

### Files to Refactor:

#### 1. **AppDistributionConnectionFlow.tsx** (437 lines)
**Hardcoded Strings to Replace:**
- ✅ `'PLAY_STORE'` → `TARGET_PLATFORMS.PLAY_STORE` (DONE)
- `'INTERNAL'`, `'ALPHA'`, `'BETA'`, `'PRODUCTION'` → Need Play Store Track constants
- `'en-US'` → Default locale constant
- All UI labels → Use `APP_DISTRIBUTION_LABELS`
- Button labels → Use `INTEGRATION_MODAL_LABELS`
- Replace button group with `<ActionButtons />` component

#### 2. **IntegrationCard.tsx** (229 lines)
**Hardcoded Strings:**
- `'Coming Soon'` → `INTEGRATION_CARD_LABELS.COMING_SOON`
- `'Connect'` → `INTEGRATION_CARD_LABELS.CONNECT`
- `'Premium'` → `INTEGRATION_CARD_LABELS.PREMIUM`
- `'Repository'`, `'Workspace'`, etc. → Use `INTEGRATION_CARD_LABELS.*`
- `'Play Store'`, `'App Store'` → Use `INTEGRATION_CARD_LABELS.PLAY_STORE/APP_STORE`
- `'play_store'`, `'app_store'` → Use `TARGET_PLATFORMS.*`
- Replace inline config display with `<ConfigDisplayField />` components

#### 3. **IntegrationConnectModal.tsx** (233 lines)
**Hardcoded Strings:**
- `'slack'`, `'jenkins'`, `'github_actions'`, etc. → Use constants
- `'Edit'`, `'Connect'` → `INTEGRATION_MODAL_LABELS.EDIT/CONNECT`
- `'Demo Mode'` message → `INTEGRATION_MODAL_LABELS.DEMO_MODE_MESSAGE()`
- `'Cancel'`, `'Connect (Demo)'` → Use constants
- Replace case statements with constant comparisons

#### 4. **SlackConnectionFlow.tsx** (141 lines)
**Hardcoded Strings:**
- `'Ready to Connect'` → `SLACK_LABELS.READY_TO_CONNECT`
- `'Slack Bot Token'` → `SLACK_LABELS.BOT_TOKEN_LABEL`
- `'xoxb-...'` → `SLACK_LABELS.BOT_TOKEN_PLACEHOLDER`
- Instructions → Use `SLACK_LABELS.INSTRUCTIONS`
- `'channels:read'`, `'chat:write'` → Use `SLACK_REQUIRED_SCOPES`
- `'Verify Token'`, `'Connect Slack'` → Use constants
- Replace button group with `<ActionButtons />` component
- Use `<InstructionsPanel />` for instructions
- Use `<ScopeChip />` for scopes

#### 5. **GitHubConnectionFlow.tsx** (264 lines)
**Hardcoded Strings:**
- All labels → Use `GITHUB_LABELS.*`
- Button text → Use constants
- Replace button groups with `<ActionButtons />`
- Use `<InstructionsPanel />` for setup instructions

#### 6. **JenkinsConnectionFlow.tsx** (256 lines)
**Hardcoded Strings:**
- `'JENKINS'` → `BUILD_PROVIDERS.JENKINS`
- All labels → Use `JENKINS_LABELS.*`
- Button text → Use constants
- Replace button groups with `<ActionButtons />`

#### 7. **GitHubActionsConnectionFlow.tsx** (212 lines)
**Hardcoded Strings:**
- `'GITHUB_ACTIONS'` → `BUILD_PROVIDERS.GITHUB_ACTIONS`
- All labels → Use `GITHUB_ACTIONS_LABELS.*`
- Button text → Use constants
- Replace button groups with `<ActionButtons />`

#### 8. **JiraConnectionFlow.tsx** (211 lines)
**Hardcoded Strings:**
- All labels → Use `JIRA_INTEGRATION_LABELS.*`
- Button text → Use constants
- Replace button groups with `<ActionButtons />`

#### 9. **CheckmateConnectionFlow.tsx** (234 lines)
**Hardcoded Strings:**
- `'checkmate'` → `TEST_PROVIDERS.CHECKMATE`
- All labels → Use `CHECKMATE_LABELS.*`
- Button text → Use constants
- Replace button groups with `<ActionButtons />`

#### 10. **SlackConnectModal.tsx** (221 lines)
- Analyze for hardcoded strings
- Use appropriate constants

#### 11. **IntegrationDetailModal.tsx** (465 lines)
- Analyze for hardcoded strings
- Extract to constants
- Use reusable components where possible

## Additional Constants Needed

### Play Store Track Types
```typescript
export const PLAY_STORE_TRACKS = {
  INTERNAL: 'INTERNAL',
  ALPHA: 'ALPHA',
  BETA: 'BETA',
  PRODUCTION: 'PRODUCTION',
} as const;

export const PLAY_STORE_TRACK_LABELS = {
  INTERNAL: 'Internal Testing',
  ALPHA: 'Alpha',
  BETA: 'Beta',
  PRODUCTION: 'Production',
} as const;
```

### Default Values
```typescript
export const INTEGRATION_DEFAULTS = {
  PLAY_STORE_DEFAULT_TRACK: 'INTERNAL',
  APP_STORE_DEFAULT_LOCALE: 'en-US',
} as const;
```

## Refactoring Guidelines

### ✅ DO:
1. **Use global system constants first** (PLATFORMS, TARGET_PLATFORMS, etc.)
2. Use UI constants for labels, messages, placeholders
3. Extract reusable JSX patterns to shared components
4. Replace inline button groups with `<ActionButtons />`
5. Use `<InstructionsPanel />` for setup instructions
6. Use `<ConfigDisplayField />` for config display
7. Use `<ConnectionAlert />` for consistent alerts

### ❌ DON'T:
1. Create new constants for system values that already exist globally
2. Hardcode platform names, provider names, or enum values
3. Hardcode UI strings inline
4. Duplicate button group JSX
5. Duplicate instruction panel JSX

## Verification Checklist

After refactoring each file:
- [ ] Run linter: `npm run lint`
- [ ] Check TypeScript: `npm run typecheck`
- [ ] Search for hardcoded strings: `grep -n "'[A-Z_]*'" <file>`
- [ ] Search for hardcoded labels: `grep -n "label=\"" <file>`
- [ ] Search for hardcoded placeholders: `grep -n "placeholder=\"" <file>`
- [ ] Verify no duplicate button groups
- [ ] Verify no duplicate instruction panels

## Estimated Impact

- **Lines Eliminated**: ~500-800 lines of duplicate code
- **Constants Centralized**: 200+ hardcoded strings
- **Components Reused**: 50+ instances of button groups, alerts, etc.
- **Maintainability**: ⭐⭐⭐⭐⭐ (Significantly improved)
- **Type Safety**: ⭐⭐⭐⭐⭐ (All strings typed as constants)

