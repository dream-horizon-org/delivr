# 🔍 Quick Reference: Hardcoded Values Location Guide

A developer's quick lookup guide for finding where specific types, enums, and constants are hardcoded in the delivr-web-panel codebase.

---

## 📍 Release Types

### Frontend Definitions

**Location 1:** `app/types/release.ts`
```typescript
export type ReleaseType = 'PLANNED' | 'HOTFIX' | 'MAJOR';
```

**Location 2:** `app/types/release-config.ts`
```typescript
releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY';
```
**⚠️ Inconsistency:** `MAJOR` vs `EMERGENCY`

**Location 3:** `app/.server/services/ReleaseManagement/integrations/types.ts`
```typescript
export enum ReleaseType {
  HOTFIX = 'HOTFIX',
  PLANNED = 'PLANNED',
  MAJOR = 'MAJOR'
}
```

**Location 4:** `app/components/ReleaseConfig/Wizard/BasicInfoForm.tsx` (Line 80-84)
```typescript
<Select
  label="Release Type"
  data={[
    { value: 'PLANNED', label: 'Planned Release' },
    { value: 'HOTFIX', label: 'Hotfix Release' },
    { value: 'EMERGENCY', label: 'Emergency Release' },
  ]}
/>
```

### Backend Definitions

**Location:** `delivr-server-ota-managed/api/script/storage/release/release-models.ts` (Line 41-45)
```typescript
export enum ReleaseType {
  HOTFIX = 'HOTFIX',
  PLANNED = 'PLANNED',
  MAJOR = 'MAJOR'
}
```

**Location:** `delivr/prisma/schema.prisma` (Line 453-457)
```prisma
enum ReleaseType {
  HOTFIX
  PLANNED
  MAJOR
}
```

### Where Type Mapping Happens

**Location:** `app/routes/dashboard.$org.releases.create.tsx` (Line 179-181)
```typescript
const mappedReleaseType = selectedConfig.releaseType === 'EMERGENCY' 
  ? 'HOTFIX' as const
  : selectedConfig.releaseType as 'PLANNED' | 'HOTFIX' | 'PATCH';
```

---

## 📍 Platform & Target Types

### Platform Types

**Location:** `app/types/release-config.ts` (Line 14)
```typescript
export type Platform = 'ANDROID' | 'IOS';
```

**Location:** `delivr-server-ota-managed/api/script/storage/release/release-models.ts` (Line 30-33)
```typescript
export enum PlatformName {
  ANDROID = 'ANDROID',
  IOS = 'IOS'
}
```

**Location:** `delivr/prisma/schema.prisma` (Line 442-445)
```prisma
enum PlatformName {
  ANDROID
  IOS
}
```

### Target Platform Types

**Location:** `app/types/release-config.ts` (Line 16)
```typescript
export type TargetPlatform = 'WEB' | 'PLAY_STORE' | 'APP_STORE';
```

**Location:** `delivr-server-ota-managed/api/script/storage/release/release-models.ts` (Line 35-39)
```typescript
export enum TargetName {
  WEB = 'WEB',
  PLAY_STORE = 'PLAY_STORE',
  APP_STORE = 'APP_STORE'
}
```

**Location:** `delivr/prisma/schema.prisma` (Line 447-451)
```prisma
enum TargetName {
  WEB
  PLAY_STORE
  APP_STORE
}
```

### Platform Configuration UI

**Location:** `app/components/ReleaseConfig/TargetPlatform/PlatformSelector.tsx` (Line 31-74)
```typescript
const platformConfigs: PlatformConfig[] = [
  {
    id: 'ANDROID',
    name: 'Android',
    description: 'Build and distribute for Android devices',
    targets: [
      {
        id: 'PLAY_STORE',
        name: 'Google Play Store',
        description: 'Distribute to Play Store',
        available: true,
      },
    ],
  },
  {
    id: 'IOS',
    name: 'iOS',
    description: 'Build and distribute for iOS devices',
    targets: [
      {
        id: 'APP_STORE',
        name: 'Apple App Store',
        description: 'Distribute to App Store',
        available: true,
      },
    ],
  },
];
```

---

## 📍 Build Environments & Providers

### Build Environments

**Location:** `app/types/release-config.ts` (Line 12)
```typescript
export type BuildEnvironment = 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT' | 'PRODUCTION';
```

**Location:** `app/components/ReleaseConfig/BuildPipeline/PipelineEditModal.tsx` (Line 42-47)
```typescript
const environmentOptions = [
  { value: 'PRE_REGRESSION', label: 'Pre-Regression' },
  { value: 'REGRESSION', label: 'Regression' },
  { value: 'TESTFLIGHT', label: 'TestFlight' },
  { value: 'PRODUCTION', label: 'Production' },
];
```

### Build Providers

**Location:** `app/types/release-config.ts` (Line 10)
```typescript
export type BuildProvider = 'JENKINS' | 'GITHUB_ACTIONS' | 'MANUAL_UPLOAD';
```

### Fixed Pipeline Categories

**Location:** `app/components/ReleaseConfig/BuildPipeline/FixedPipelineCategories.tsx` (Line 46-90)
```typescript
const androidCategories: PipelineCategory[] = [
  {
    id: 'android-pre-regression',
    platform: 'ANDROID',
    environment: 'PRE_REGRESSION',
    label: 'Android Pre-Regression',
    description: 'Optional pre-regression build before main testing',
    required: false,
  },
  {
    id: 'android-regression',
    platform: 'ANDROID',
    environment: 'REGRESSION',
    label: 'Android Regression',
    description: 'Main regression build for Play Store release',
    required: true,
  },
];

const iosCategories: PipelineCategory[] = [
  {
    id: 'ios-pre-regression',
    platform: 'IOS',
    environment: 'PRE_REGRESSION',
    label: 'iOS Pre-Regression',
    description: 'Optional pre-regression build before main testing',
    required: false,
  },
  {
    id: 'ios-regression',
    platform: 'IOS',
    environment: 'REGRESSION',
    label: 'iOS Regression',
    description: 'Main regression build for App Store release',
    required: true,
  },
  {
    id: 'ios-testflight',
    platform: 'IOS',
    environment: 'TESTFLIGHT',
    label: 'iOS TestFlight',
    description: 'TestFlight build for App Store distribution',
    required: true,
  },
];
```

---

## 📍 Integration Types & IDs

### Integration Categories

**Location:** `app/types/integrations.ts` (Line 6-13)
```typescript
export enum IntegrationCategory {
  SOURCE_CONTROL = 'Source Control',
  COMMUNICATION = 'Communication',
  CI_CD = 'CI/CD',
  TEST_MANAGEMENT = 'Test Management',
  PROJECT_MANAGEMENT = 'Project Management',
  APP_DISTRIBUTION = 'App Distribution'
}
```

### Integration Type Constants

**Location:** `app/constants/integrations.ts` (Line 12-24)
```typescript
export const INTEGRATION_TYPES = {
  SCM: 'scm',
  TARGET_PLATFORM: 'targetPlatform',
  CICD: 'cicd',
  PIPELINE: 'pipeline',  // Deprecated
  COMMUNICATION: 'communication',
} as const;

export const SCM_TYPES = {
  GITHUB: 'GITHUB',
  GITLAB: 'GITLAB',
  BITBUCKET: 'BITBUCKET',
} as const;

export const CICD_PROVIDER_TYPES = {
  GITHUB_ACTIONS: 'GITHUB_ACTIONS',
  JENKINS: 'JENKINS',
  CIRCLECI: 'CIRCLECI',
  GITLAB_CI: 'GITLAB_CI',
} as const;

export const COMMUNICATION_TYPES = {
  SLACK: 'SLACK',
  TEAMS: 'TEAMS',
  EMAIL: 'EMAIL',
} as const;
```

### All Available Integrations (Hardcoded List)

**Location:** `app/config/integrations.ts` (Line 20-134)
```typescript
export function getAllIntegrations(params: GetAllIntegrationsParams = {}): Integration[] {
  return [
    // SOURCE CONTROL
    { id: 'github', name: 'GitHub', category: IntegrationCategory.SOURCE_CONTROL, isAvailable: true },
    { id: 'gitlab', name: 'GitLab', category: IntegrationCategory.SOURCE_CONTROL, isAvailable: false },
    { id: 'bitbucket', name: 'Bitbucket', category: IntegrationCategory.SOURCE_CONTROL, isAvailable: false },
    
    // COMMUNICATION
    { id: 'slack', name: 'Slack', category: IntegrationCategory.COMMUNICATION, isAvailable: true },
    
    // CI/CD
    { id: 'jenkins', name: 'Jenkins', category: IntegrationCategory.CI_CD, isAvailable: true },
    { id: 'github-actions', name: 'GitHub Actions', category: IntegrationCategory.CI_CD, isAvailable: true },
    
    // TEST MANAGEMENT
    { id: 'checkmate', name: 'Checkmate', category: IntegrationCategory.TEST_MANAGEMENT, isAvailable: true },
    
    // PROJECT MANAGEMENT
    { id: 'jira', name: 'Jira', category: IntegrationCategory.PROJECT_MANAGEMENT, isAvailable: true },
    
    // APP DISTRIBUTION
    { id: 'appstore', name: 'Apple App Store', category: IntegrationCategory.APP_DISTRIBUTION, isAvailable: true },
    { id: 'playstore', name: 'Google Play Store', category: IntegrationCategory.APP_DISTRIBUTION, isAvailable: true },
  ];
}
```

### Integration Connection Routing

**Location:** `app/components/Integrations/IntegrationConnectModal.tsx` (Line 28-90)
```typescript
const renderConnectionFlow = () => {
  switch (integration.id) {
    case 'slack':
      return <SlackConnectionFlow />;
    case 'jenkins':
      return <JenkinsConnectionFlow />;
    case 'github-actions':
      return <GitHubActionsConnectionFlow />;
    case 'checkmate':
      return <CheckmateConnectionFlow />;
    case 'jira':
      return <JiraConnectionFlow />;
    case 'github':
      return <div>Redirects to setup...</div>;
    default:
      return <DefaultConnectionMessage />;
  }
};
```

**Location:** `app/routes/dashboard.$org.integrations.tsx` (Line 210-240)
```typescript
const handleConnect = (integrationId: string, data?: any) => {
  if (integrationId === 'github') {
    window.location.href = `/dashboard/${params.org}/releases/setup`;
  } else if (integrationId === 'slack') {
    window.location.href = `/dashboard/${params.org}/releases/setup`;
  } else if (integrationId === 'jenkins') {
    alert('Jenkins integration connected successfully!');
    window.location.reload();
  } else if (integrationId === 'github-actions') {
    alert('GitHub Actions integration connected successfully!');
    window.location.reload();
  } else if (integrationId === 'checkmate') {
    alert('Checkmate integration connected successfully!');
    window.location.reload();
  } else {
    alert(`${integrationId} connection initiated (demo mode)`);
  }
};
```

### Backend Integration Enum

**Location:** `app/.server/services/ReleaseManagement/integrations/types.ts` (Line 85-96)
```typescript
export enum IntegrationType {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  JENKINS = 'JENKINS',
  GITHUB_ACTIONS = 'GITHUB_ACTIONS',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  JIRA = 'JIRA',
  APP_STORE_CONNECT = 'APP_STORE_CONNECT',
  PLAY_STORE = 'PLAY_STORE',
  TEST_RAIL = 'TEST_RAIL'
}
```

---

## 📍 Test Management Providers

**Location:** `app/types/release-config.ts` (Line 60)
```typescript
export type TestManagementProvider = 'CHECKMATE' | 'TESTRAIL' | 'ZEPHYR' | 'NONE';
```

**Location:** `app/components/ReleaseConfig/TestManagement/TestManagementSelector.tsx` (Line 19-24)
```typescript
const providerOptions = [
  { value: 'NONE', label: 'No Test Management', disabled: false },
  { value: 'CHECKMATE', label: 'Checkmate', disabled: false },
  { value: 'TESTRAIL', label: 'TestRail (Coming Soon)', disabled: true },
  { value: 'ZEPHYR', label: 'Zephyr (Coming Soon)', disabled: true },
];
```

---

## 📍 Release Status

### Frontend Definition

**Location:** `app/types/release.ts` (Line 8-16)
```typescript
export type ReleaseStatus = 
  | 'KICKOFF_PENDING'    // Not started yet
  | 'PENDING'            // Pending
  | 'STARTED'            // Started
  | 'REGRESSION_IN_PROGRESS'  // In regression testing
  | 'BUILD_SUBMITTED'    // Build submitted
  | 'RELEASED'           // Released
  | 'CANCELLED'          // Cancelled
  | 'ARCHIVED';          // Archived
```

**Location:** `app/.server/services/ReleaseManagement/integrations/types.ts` (Line 19-28)
```typescript
export enum ReleaseStatus {
  KICKOFF_PENDING = 'KICKOFF_PENDING',
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  REGRESSION_IN_PROGRESS = 'REGRESSION_IN_PROGRESS',
  BUILD_SUBMITTED = 'BUILD_SUBMITTED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED'
}
```

### Backend Definition

**Location:** `delivr-server-ota-managed/api/script/storage/release/release-models.ts` (Line 52-59)
```typescript
export enum ReleaseStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  REGRESSION_IN_PROGRESS = 'REGRESSION_IN_PROGRESS',
  BUILD_SUBMITTED = 'BUILD_SUBMITTED',
  RELEASED = 'RELEASED',
  ARCHIVED = 'ARCHIVED'
}
```
**⚠️ Missing:** `KICKOFF_PENDING`, `CANCELLED`

**Location:** `delivr/prisma/schema.prisma` (Line 464-471)
```prisma
enum ReleaseStatus {
  PENDING
  STARTED
  REGRESSION_IN_PROGRESS
  BUILD_SUBMITTED
  RELEASED
  ARCHIVED
}
```

---

## 📍 Task Types (Backend Workflow)

**Location:** `delivr/prisma/schema.prisma` (Line 516-531)
```prisma
enum TaskType {
  PRE_KICK_OFF_REMINDER
  FORK_BRANCH
  UPDATE_GITHUB_VARIABLES
  PRE_RELEASE_CHERRY_PICKS_REMINDER
  ADD_L6_APPROVAL_CHECK
  FINAL_PRE_REGRESSION_BUILDS
  TRIGGER_REGRESSION_BUILDS
  AUTOMATION_RUNS
  TRIGGER_AUTOMATION_RUNS
  RESET_TEST_RAIL_STATUS
  CHERRY_REMINDER
  CREATE_RELEASE_NOTES
  TEST_FLIGHT_BUILD
  CREATE_RELEASE_TAG
}
```

**⚠️ Hardcoded Assumptions:**
- GitHub-specific tasks
- TestRail integration assumed
- L6 approval concept
- Specific workflow stages

---

## 📍 Onboarding Flow Steps

**Location:** `app/components/ReleaseManagement/SetupWizard/types.ts` (Line 9-14)
```typescript
export type SetupBucket = 
  | 'scm'            // Source Control Management
  | 'distribution'   // Distribution Platforms (NOT IMPLEMENTED)
  | 'cicd'           // CI/CD Pipelines (NOT IMPLEMENTED)
  | 'communication'  // Communication Channels
  | 'review';        // Final review
```

**Location:** `app/components/ReleaseManagement/SetupWizard/hooks/useSetupWizard.ts` (Line 114-177)
```typescript
const buckets: SetupBucketConfig[] = [
  // 1. SCM - IMPLEMENTED
  {
    id: 'scm',
    title: 'Connect Source Control',
    description: 'Connect your GitHub repository',
    isRequired: true,
    isComplete: hasValidIntegration(integrations, INTEGRATION_TYPES.SCM),
    canSkip: false,
    integrationType: INTEGRATION_TYPES.SCM,
    icon: '📦',
  },
  
  // 2. Distribution - NOT IMPLEMENTED (commented out)
  // 3. CI/CD - NOT IMPLEMENTED (commented out)
  
  // 4. Communication - IMPLEMENTED
  {
    id: 'communication',
    title: 'Communication Channels',
    description: 'Connect Slack for release notifications (optional)',
    isRequired: false,
    isComplete: hasValidIntegration(integrations, INTEGRATION_TYPES.COMMUNICATION),
    canSkip: true,
    integrationType: INTEGRATION_TYPES.COMMUNICATION,
    icon: '💬',
  },
  
  // 5. Review - IMPLEMENTED
  {
    id: 'review',
    title: 'Review & Complete',
    description: 'Review your setup',
    isRequired: true,
    isComplete: false,
    canSkip: false,
    icon: '✅',
  },
];
```

**Location:** `app/components/ReleaseManagement/SetupWizard/components/OnboardingFlow.tsx` (Line 63-92)
```typescript
const renderStep = () => {
  switch (currentStep) {
    case 'scm':
      return <GitHubConnectionStep />;
    case 'communication':
      return <SlackConnectionStep />;
    case 'review':
      return <ReviewStep />;
    default:
      return null;
  }
}
```

---

## 📍 Validation Rules

### Version Format

**Location:** `app/types/release-creation.ts` (Line 58-70)
```typescript
export const ReleaseValidationRules = {
  version: {
    required: true,
    pattern: /^v?\d+\.\d+\.\d+$/, // Semantic versioning
  },
  releaseDate: {
    required: true,
    mustBeFuture: true,
  },
  kickoffDate: {
    required: true,
    mustBeBeforeRelease: true,
    defaultOffsetDays: 2, // RD-2days
  },
  regressionBuildSlots: {
    validateTime: true,
    mustBeBetweenKickoffAndRelease: true,
  },
  releaseTargets: {
    minSelected: 1, // At least one platform
  },
} as const;
```

**Location:** `app/routes/dashboard.$org.releases.create.tsx` (Line 215-217)
```typescript
if (!/^v?\d+\.\d+\.\d+$/.test(details.version)) {
  newErrors.version = 'Version must be in format: v1.2.3';
}
```

---

## 📍 Default Values

### Default Branch

**Location:** `app/config/integrations.ts` (Line 37)
```typescript
defaultBranch: githubIntegration.defaultBranch || 'main'
```

### Default Kickoff Offset

**Location:** `app/types/release-creation.ts` (Line 70)
```typescript
defaultOffsetDays: 2, // RD-2days
```

### Default Regression Timings

**Location:** `delivr/prisma/schema.prisma` (Line 384)
```prisma
regressionTimings String @default("09:00,17:00")
```

---

## 📍 Scheduling Constants

**Location:** `app/types/release-config.ts` (Line 99-121)
```typescript
export interface SchedulingConfig {
  // Release frequency
  releaseFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  customFrequencyDays?: number;
  
  // Default timings
  defaultReleaseTime: string; // HH:MM format (24-hour)
  defaultKickoffTime: string; // HH:MM format
  kickoffLeadDays: number; // Days before release
  
  // Kickoff reminder
  kickoffReminderEnabled: boolean;
  kickoffReminderTime: string; // HH:MM format
  kickoffReminderLeadDays: number;
  
  // Working days (0 = Sunday, 6 = Saturday)
  workingDays: number[]; // e.g., [1, 2, 3, 4, 5] for Mon-Fri
  timezone: string; // e.g., "Asia/Kolkata", "America/New_York"
  
  // Regression slots
  regressionSlots: RegressionSlot[];
}
```

---

## 📍 Configuration Status

**Location:** `app/types/release-config.ts` (Line 211)
```typescript
status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
```

---

## 🔧 Integration ID → Backend Type Mapping

When you see integration IDs in frontend, they map to backend integration types as follows:

| Frontend ID | Backend Type | Provider Type | Implementation Status |
|-------------|--------------|---------------|----------------------|
| `'github'` | `scm` | `GITHUB` | ✅ Implemented |
| `'gitlab'` | `scm` | `GITLAB` | ❌ Not Implemented |
| `'bitbucket'` | `scm` | `BITBUCKET` | ❌ Not Implemented |
| `'slack'` | `communication` | `SLACK` | ✅ Implemented |
| `'jenkins'` | `cicd` | `JENKINS` | ✅ Implemented |
| `'github-actions'` | `cicd` | `GITHUB_ACTIONS` | ✅ Implemented |
| `'checkmate'` | `testManagement` | `CHECKMATE` | ✅ Implemented |
| `'jira'` | `projectManagement` | `JIRA` | ⚠️ Partial |
| `'appstore'` | `targetPlatform` | `APP_STORE` | ❌ Not Implemented |
| `'playstore'` | `targetPlatform` | `PLAY_STORE` | ❌ Not Implemented |

---

## 🔍 Search Tips

### Find All Occurrences of a Type

```bash
# Find all release type definitions
grep -r "ReleaseType" app/ --include="*.ts" --include="*.tsx"

# Find all integration IDs
grep -r "id: 'github'" app/ --include="*.ts" --include="*.tsx"

# Find all hardcoded platform values
grep -r "ANDROID\|IOS" app/types/ app/components/

# Find all status enums
grep -r "ReleaseStatus" app/ --include="*.ts" --include="*.tsx"
```

### Files to Check First

When modifying types, always check these files for consistency:

**Release Types:**
- `app/types/release.ts`
- `app/types/release-config.ts`
- `app/.server/services/ReleaseManagement/integrations/types.ts`
- `delivr-server-ota-managed/api/script/storage/release/release-models.ts`
- `delivr/prisma/schema.prisma`

**Platform/Target Types:**
- `app/types/release-config.ts`
- `app/components/ReleaseConfig/TargetPlatform/PlatformSelector.tsx`
- `delivr-server-ota-managed/api/script/storage/release/release-models.ts`
- `delivr/prisma/schema.prisma`

**Integration Types:**
- `app/constants/integrations.ts`
- `app/config/integrations.ts`
- `app/types/integrations.ts`
- `app/.server/services/ReleaseManagement/integrations/types.ts`

**Onboarding Steps:**
- `app/components/ReleaseManagement/SetupWizard/hooks/useSetupWizard.ts`
- `app/components/ReleaseManagement/SetupWizard/types.ts`
- `app/components/ReleaseManagement/SetupWizard/components/OnboardingFlow.tsx`

---

## 🛠️ Making Changes

### Adding a New Release Type

1. **Update frontend types:**
   - `app/types/release.ts` - Add to ReleaseType
   - `app/types/release-config.ts` - Add to configuration type
   - `app/components/ReleaseConfig/Wizard/BasicInfoForm.tsx` - Add to dropdown

2. **Update backend:**
   - `delivr-server-ota-managed/api/script/storage/release/release-models.ts` - Add to enum
   - `delivr/prisma/schema.prisma` - Add to enum and migrate

3. **Update validation:**
   - `app/routes/dashboard.$org.releases.create.tsx` - Update validation logic

### Adding a New Platform

1. **Update types:**
   - `app/types/release-config.ts` - Add to Platform enum
   - `delivr-server-ota-managed/api/script/storage/release/release-models.ts` - Add to PlatformName
   - `delivr/prisma/schema.prisma` - Add to PlatformName

2. **Update UI:**
   - `app/components/ReleaseConfig/TargetPlatform/PlatformSelector.tsx` - Add to platformConfigs array

3. **Update pipeline logic:**
   - `app/components/ReleaseConfig/BuildPipeline/FixedPipelineCategories.tsx` - Add platform categories

### Adding a New Integration

1. **Update constants:**
   - `app/constants/integrations.ts` - Add provider type constant

2. **Update integration list:**
   - `app/config/integrations.ts` - Add to getAllIntegrations() array

3. **Create connection flow:**
   - Create `app/components/Integrations/[Integration]ConnectionFlow.tsx`
   - Update `app/components/Integrations/IntegrationConnectModal.tsx` switch statement

4. **Add routing:**
   - Update `app/routes/dashboard.$org.integrations.tsx` handleConnect() function

5. **Backend:**
   - Add integration type to backend enums
   - Create API endpoints

---

**Last Updated:** 2025-01-20
**Maintainer:** Engineering Team
**Purpose:** Quick developer reference for hardcoded values

