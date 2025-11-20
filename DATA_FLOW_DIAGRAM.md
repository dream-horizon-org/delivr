# 🌊 Data Flow Diagram - Delivr Web Panel

## 📋 Complete Architecture Overview

This document provides a visual representation of data flows across the major features in delivr-web-panel.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DELIVR WEB PANEL                           │
│                         (Frontend - Remix)                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DELIVR BACKEND SERVER (OTA)                      │
│                      (Express + Sequelize)                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Database Queries
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          MySQL DATABASE                             │
│              (Tenants, Releases, Integrations, etc.)                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Flow 1: Onboarding Flow (First-Time Setup)

### Overview
New organizations go through a guided setup wizard to connect essential integrations.

### Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         ONBOARDING FLOW                                    │
└────────────────────────────────────────────────────────────────────────────┘

USER LANDS ON
/dashboard/{org}/releases/setup/flow
          │
          ▼
┌─────────────────────────────────────┐
│  Check Setup Status                 │
│  (setupStepsInfo from loader)       │
│                                     │
│  • scmIntegration: bool             │◄──── From Backend DB
│  • targetPlatforms: bool            │      (tenant_integrations)
│  • pipelines: bool                  │
│  • communication: bool              │
└─────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  Determine Initial Step             │
│  (useSetupWizard hook)              │
│                                     │
│  Logic:                             │
│  1. If no SCM → Start at 'scm'      │
│  2. If no Slack → Go to 'comm'      │
│  3. Else → Go to 'review'           │
└─────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 1: CONNECT SOURCE CONTROL                   │
│                    (GitHubConnectionStep)                           │
│                                                                     │
│  User Actions:                                                      │
│  1. Click "Connect GitHub"                                          │
│  2. OAuth redirect to GitHub                                        │
│  3. Authorize Delivr app                                            │
│  4. Callback: /api/auth/github/callback                             │
│  5. Select repository (owner/repo)                                  │
│                                                                     │
│  Backend API:                                                       │
│  POST /api/v1/tenants/{tenantId}/integrations/scm                  │
│  {                                                                  │
│    type: "GITHUB",                                                  │
│    owner: "org-name",                                               │
│    repo: "repo-name",                                               │
│    accessToken: "ghp_xxx" (encrypted)                               │
│  }                                                                  │
│                                                                     │
│  Database Updates:                                                  │
│  INSERT INTO tenant_integrations                                    │
│  - tenantId                                                         │
│  - type: 'scm'                                                      │
│  - providerType: 'GITHUB'                                           │
│  - config: { owner, repo, defaultBranch }                           │
│  - verificationStatus: 'VALID'                                      │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼ (Auto-advance to next step)
          │
┌─────────────────────────────────────────────────────────────────────┐
│              STEP 2: CONNECT COMMUNICATION (Optional)               │
│                     (SlackConnectionStep)                           │
│                                                                     │
│  User Actions:                                                      │
│  1. Click "Connect Slack" or "Skip"                                 │
│  2. OAuth redirect to Slack                                         │
│  3. Select workspace and channels                                   │
│  4. Callback: /api/auth/slack/callback                              │
│                                                                     │
│  Backend API:                                                       │
│  POST /api/v1/tenants/{tenantId}/integrations/communication        │
│  {                                                                  │
│    type: "SLACK",                                                   │
│    workspaceId: "T123456",                                          │
│    botToken: "xoxb-xxx" (encrypted),                                │
│    channels: ["releases", "builds", "regression"]                   │
│  }                                                                  │
│                                                                     │
│  Database Updates:                                                  │
│  INSERT INTO tenant_integrations                                    │
│  - type: 'communication'                                            │
│  - communicationType: 'SLACK'                                       │
│  - config: { workspaceId, channels }                                │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 3: REVIEW & COMPLETE                        │
│                        (ReviewStep)                                 │
│                                                                     │
│  Shows:                                                             │
│  ✅ GitHub Connected (org/repo)                                     │
│  ✅ Slack Connected (workspace-name) [optional]                     │
│                                                                     │
│  User Action: Click "Complete Setup"                                │
│                                                                     │
│  Backend API:                                                       │
│  PATCH /api/v1/tenants/{tenantId}/setup                             │
│  { setupComplete: true }                                            │
│                                                                     │
│  Redirect to: /dashboard/{org}/releases                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Hardcoded Assumptions in Onboarding

| Component | Hardcoded Value | Location |
|-----------|----------------|----------|
| **Setup Steps** | `'scm'`, `'communication'`, `'review'` | `useSetupWizard.ts` |
| **SCM Provider** | Only GitHub (GitLab/Bitbucket not impl) | `OnboardingFlow.tsx` |
| **Communication** | Only Slack (Teams not impl) | `OnboardingFlow.tsx` |
| **Step Order** | Fixed: SCM → Communication → Review | `useSetupWizard.ts` |
| **Required Integrations** | GitHub required, Slack optional | `useSetupWizard.ts` |

---

## 🔧 Flow 2: Integration Management

### Overview
Organizations can connect, disconnect, and manage various integrations.

### Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      INTEGRATION MANAGEMENT FLOW                           │
└────────────────────────────────────────────────────────────────────────────┘

USER NAVIGATES TO
/dashboard/{org}/integrations
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Load Integrations Page                                         │
│  (IntegrationsPage component)                                   │
│                                                                 │
│  Data Sources:                                                  │
│  1. System Integrations (hardcoded in frontend)                 │
│     - getAllIntegrations() in app/config/integrations.ts        │
│     - Returns 11 integration definitions                        │
│                                                                 │
│  2. Tenant Integrations (from backend)                          │
│     - From parent layout loader (dashboard.$org)                │
│     - orgData.organisation.releaseManagement.integrations       │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Merge System + Tenant Data                                     │
│  (useEffect in IntegrationsPage.tsx)                            │
│                                                                 │
│  Logic:                                                         │
│  For each system integration:                                   │
│    if (tenant has this integration)                             │
│      status = CONNECTED                                         │
│      config = tenant.integration.config                         │
│    else                                                         │
│      status = NOT_CONNECTED                                     │
│                                                                 │
│  Example Mappings:                                              │
│  - integration.id === 'github' → type: 'scm'                    │
│  - integration.id === 'slack' → type: 'communication'           │
│  - integration.id === 'jenkins' → type: 'cicd'                  │
│  - integration.id === 'checkmate' → type: 'testManagement'      │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Display Integration Cards                                      │
│  (Grouped by Category)                                          │
│                                                                 │
│  Categories (Tabs):                                             │
│  • Source Control                                               │
│  • Communication                                                │
│  • CI/CD                                                        │
│  • Test Management                                              │
│  • Project Management                                           │
│  • App Distribution                                             │
└─────────────────────────────────────────────────────────────────┘
          │
          │ USER CLICKS ON INTEGRATION CARD
          │
          ▼
     ┌─────────┐
     │Connected│
     └────┬────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│         SHOW INTEGRATION DETAILS MODAL                          │
│         (IntegrationDetailModal)                                │
│                                                                 │
│  Shows:                                                         │
│  • Integration name, icon, description                          │
│  • Connection status: CONNECTED                                 │
│  • Config details (e.g., GitHub: owner/repo)                    │
│  • Connected at: Date                                           │
│  • Connected by: User email                                     │
│                                                                 │
│  Actions:                                                       │
│  [Edit] [Disconnect]                                            │
└─────────────────────────────────────────────────────────────────┘
          │
          │ USER CLICKS "DISCONNECT"
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Confirmation Dialog                                            │
│  "Are you sure you want to disconnect?"                         │
│                                                                 │
│  Backend API Call:                                              │
│  DELETE /api/v1/tenants/{tenantId}/integrations/{type}/{id}    │
│                                                                 │
│  Database:                                                      │
│  DELETE FROM tenant_integrations                                │
│  WHERE tenantId = ? AND id = ?                                  │
│                                                                 │
│  Reload page to show updated status                             │
└─────────────────────────────────────────────────────────────────┘

          OR
          │ USER CLICKS ON NOT_CONNECTED CARD
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│         SHOW CONNECTION MODAL                                   │
│         (IntegrationConnectModal)                               │
│                                                                 │
│  Routing Logic (Switch on integration.id):                     │
│                                                                 │
│  case 'github':                                                 │
│    → Redirect to /dashboard/{org}/releases/setup                │
│                                                                 │
│  case 'slack':                                                  │
│    → Redirect to /dashboard/{org}/releases/setup                │
│                                                                 │
│  case 'jenkins':                                                │
│    → Show JenkinsConnectionFlow                                 │
│    → User enters: displayName, hostUrl, username, apiToken      │
│    → POST /api/v1/tenants/{tenantId}/integrations/cicd         │
│    → Verify connection                                          │
│    → Save to DB                                                 │
│                                                                 │
│  case 'github-actions':                                         │
│    → Show GitHubActionsConnectionFlow                           │
│    → Similar flow                                               │
│                                                                 │
│  case 'checkmate':                                              │
│    → Show CheckmateConnectionFlow                               │
│    → User enters: name, baseUrl, apiKey, projectId             │
│    → POST /api/v1/tenants/{tenantId}/integrations/test-mgmt    │
│                                                                 │
│  case 'jira':                                                   │
│    → Show JiraConnectionFlow (placeholder)                      │
│                                                                 │
│  default:                                                       │
│    → Show "Coming Soon" message                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Type Mapping (Hardcoded)

```typescript
// Frontend Integration IDs → Backend Integration Types

'github'         → { type: 'scm', providerType: 'GITHUB' }
'gitlab'         → { type: 'scm', providerType: 'GITLAB' } [not impl]
'bitbucket'      → { type: 'scm', providerType: 'BITBUCKET' } [not impl]

'slack'          → { type: 'communication', communicationType: 'SLACK' }

'jenkins'        → { type: 'cicd', providerType: 'JENKINS' }
'github-actions' → { type: 'cicd', providerType: 'GITHUB_ACTIONS' }

'checkmate'      → { type: 'testManagement', providerType: 'CHECKMATE' }

'jira'           → { type: 'projectManagement', providerType: 'JIRA' } [not impl]

'appstore'       → { type: 'targetPlatform', platformType: 'APP_STORE' } [not impl]
'playstore'      → { type: 'targetPlatform', platformType: 'PLAY_STORE' } [not impl]
```

---

## ⚙️ Flow 3: Create Release Configuration

### Overview
Organizations create reusable release configurations that define build pipelines, testing, scheduling, etc.

### Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   CREATE RELEASE CONFIGURATION FLOW                        │
└────────────────────────────────────────────────────────────────────────────┘

USER NAVIGATES TO
/dashboard/{org}/releases/configure
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Load Configuration Wizard                                      │
│  (ConfigurationWizard component)                                │
│                                                                 │
│  Fetch Available Integrations:                                  │
│  GET /api/v1/tenants/{tenantId}/integrations                    │
│                                                                 │
│  Transform for UI:                                              │
│  {                                                              │
│    jenkins: [...],      // Connected Jenkins integrations       │
│    github: [...],       // Connected GitHub integrations        │
│    slack: [...],        // Connected Slack integrations         │
│    checkmate: [...],    // Connected Checkmate integrations     │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: BASIC INFORMATION                          │
│                      (BasicInfoForm)                                    │
│                                                                         │
│  User Inputs:                                                           │
│  • Configuration Name: "Standard Release Config"                        │
│  • Description: "For regular bi-weekly releases"                        │
│  • Release Type: [PLANNED | HOTFIX | EMERGENCY]  ◄── HARDCODED        │
│  • Default Base Branch: [main | develop | ...]   ◄── From GitHub       │
│  • Is Default Configuration: [Yes/No]                                   │
│                                                                         │
│  Data Flow:                                                             │
│  1. Fetch branches from GitHub:                                         │
│     GET /api/v1/tenants/{tenantId}/integrations/scm/branches           │
│     Returns: ['main', 'develop', 'staging', ...]                        │
│                                                                         │
│  2. Store in wizard state:                                              │
│     config.name = "Standard Release Config"                             │
│     config.releaseType = "PLANNED"                                      │
│     config.baseBranch = "main"                                          │
│     config.isDefault = true                                             │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STEP 2: TARGET PLATFORMS                              │
│                   (PlatformSelector)                                    │
│                                                                         │
│  Hardcoded Platform Options:                                           │
│                                                                         │
│  ┌────────────────────────┐  ┌────────────────────────┐               │
│  │   Android Platform     │  │    iOS Platform        │               │
│  │                        │  │                        │               │
│  │  Targets:              │  │  Targets:              │               │
│  │  ✅ Play Store         │  │  ✅ App Store          │               │
│  │  ⬜ Firebase (soon)    │  │  ⬜ TestFlight (soon)  │               │
│  └────────────────────────┘  └────────────────────────┘               │
│                                                                         │
│  User Selects:                                                          │
│  config.defaultTargets = ['PLAY_STORE', 'APP_STORE']                   │
│                                                                         │
│  Platform Mapping (HARDCODED):                                         │
│  - PLAY_STORE → Requires Android platform                              │
│  - APP_STORE → Requires iOS platform                                   │
│  - WEB → Always tied to Android (in old system)                        │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STEP 3: BUILD PIPELINES                               │
│                   (FixedPipelineCategories)                             │
│                                                                         │
│  Fixed Pipeline Structure (HARDCODED):                                 │
│                                                                         │
│  IF ANDROID SELECTED:                                                   │
│  ┌──────────────────────────────────────────┐                          │
│  │  Android Pre-Regression (Optional)       │                          │
│  │  Environment: PRE_REGRESSION             │ ◄── HARDCODED           │
│  │  Provider: [Jenkins | GitHub Actions]    │                          │
│  │  [Configure Pipeline] or [Skip]          │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │  Android Regression (Required)           │                          │
│  │  Environment: REGRESSION                 │ ◄── HARDCODED           │
│  │  Provider: [Jenkins | GitHub Actions]    │                          │
│  │  [Configure Pipeline] - MUST CONFIGURE   │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  IF IOS SELECTED:                                                       │
│  ┌──────────────────────────────────────────┐                          │
│  │  iOS Pre-Regression (Optional)           │                          │
│  │  Environment: PRE_REGRESSION             │                          │
│  │  [Configure Pipeline] or [Skip]          │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │  iOS Regression (Required)               │                          │
│  │  Environment: REGRESSION                 │                          │
│  │  [Configure Pipeline] - MUST CONFIGURE   │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │  iOS TestFlight (Required)               │                          │
│  │  Environment: TESTFLIGHT                 │ ◄── iOS ONLY            │
│  │  [Configure Pipeline] - MUST CONFIGURE   │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  User Clicks "Configure Pipeline" →                                    │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │    Pipeline Configuration Modal          │                          │
│  │    (PipelineEditModal)                   │                          │
│  │                                          │                          │
│  │  Pipeline Name: "Android Regression"     │                          │
│  │  Platform: ANDROID (locked)              │                          │
│  │  Environment: REGRESSION (locked)        │                          │
│  │                                          │                          │
│  │  Build Provider:                         │                          │
│  │  ● Jenkins                               │                          │
│  │  ○ GitHub Actions                        │                          │
│  │  ○ Manual Upload                         │                          │
│  │                                          │                          │
│  │  IF JENKINS SELECTED:                    │                          │
│  │  • Select Integration: [jenkins-prod]    │                          │
│  │  • Job URL: https://jenkins../build      │                          │
│  │  • Job Name: android-regression-build    │                          │
│  │  • Parameters:                           │                          │
│  │    version: {{version}}                  │                          │
│  │    branch: {{branch}}                    │                          │
│  │                                          │                          │
│  │  [Save Pipeline]                         │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  Saved to:                                                              │
│  config.buildPipelines = [                                              │
│    {                                                                    │
│      id: "pipeline-1",                                                  │
│      name: "Android Regression",                                        │
│      platform: "ANDROID",                                               │
│      environment: "REGRESSION",                                         │
│      provider: "JENKINS",                                               │
│      providerConfig: {                                                  │
│        type: "JENKINS",                                                 │
│        integrationId: "jenkins-prod",                                   │
│        jobUrl: "...",                                                   │
│        jobName: "android-regression-build",                             │
│        parameters: { version: "{{version}}", branch: "{{branch}}" }    │
│      },                                                                 │
│      enabled: true                                                      │
│    }                                                                    │
│  ]                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STEP 4: TEST MANAGEMENT                               │
│                   (TestManagementSelector)                              │
│                                                                         │
│  Enable Test Management: [Yes/No]                                      │
│                                                                         │
│  IF YES:                                                                │
│  Test Provider:                                                         │
│  ● Checkmate                    ◄── Implemented                        │
│  ○ TestRail (Coming Soon)       ◄── HARDCODED as disabled              │
│  ○ Zephyr (Coming Soon)         ◄── HARDCODED as disabled              │
│                                                                         │
│  IF CHECKMATE SELECTED:                                                 │
│  ┌──────────────────────────────────────────┐                          │
│  │    Checkmate Configuration               │                          │
│  │                                          │                          │
│  │  Select Integration: [checkmate-qa]      │                          │
│  │  Workspace ID: workspace-123             │                          │
│  │  Project ID: project-456                 │                          │
│  │                                          │                          │
│  │  Auto-create Test Runs: [Yes/No]         │                          │
│  │  Run Name Template: "v{{version}}"       │                          │
│  │                                          │                          │
│  │  Validation Rules:                       │                          │
│  │  • Max Failed Tests: [0]                 │                          │
│  │  • Max Untested Cases: [0]               │                          │
│  │  • Require All Platforms: [Yes/No]       │                          │
│  │  • Allow Override: [Yes/No]              │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  Saved to:                                                              │
│  config.testManagement = {                                              │
│    enabled: true,                                                       │
│    provider: "CHECKMATE",                                               │
│    integrationId: "checkmate-qa",                                       │
│    providerSettings: {                                                  │
│      type: "CHECKMATE",                                                 │
│      workspaceId: "workspace-123",                                      │
│      projectId: "project-456",                                          │
│      autoCreateRuns: true,                                              │
│      runNameTemplate: "v{{version}}",                                   │
│      rules: {                                                           │
│        maxFailedTests: 0,                                               │
│        maxUntestedCases: 0,                                             │
│        requireAllPlatforms: true,                                       │
│        allowOverride: false                                             │
│      }                                                                  │
│    }                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STEP 5: SCHEDULING                                    │
│                   (SchedulingForm)                                      │
│                                                                         │
│  Release Frequency:                                                     │
│  ○ Weekly                       ◄── HARDCODED OPTIONS                  │
│  ● Bi-weekly                                                            │
│  ○ Monthly                                                              │
│  ○ Custom (specify days)                                                │
│                                                                         │
│  Default Release Time: [17:00] (24-hour format)                         │
│  Default Kickoff Time: [09:00]                                          │
│  Kickoff Lead Days: [2] days before release                             │
│                                                                         │
│  Kickoff Reminder:                                                      │
│  • Enable Reminder: [Yes/No]                                            │
│  • Reminder Time: [08:00]                                               │
│  • Reminder Lead Days: [1] day before kickoff                           │
│                                                                         │
│  Working Days:                                                          │
│  □ Sun  ✅ Mon  ✅ Tue  ✅ Wed  ✅ Thu  ✅ Fri  □ Sat                    │
│                                                                         │
│  Timezone: [Asia/Kolkata]                                               │
│                                                                         │
│  Regression Slots:                                                      │
│  ┌──────────────────────────────────────────┐                          │
│  │  Slot 1                                  │                          │
│  │  Name: "Morning Regression"              │                          │
│  │  Offset: +0 days from kickoff            │                          │
│  │  Time: 09:00                             │                          │
│  │  Actions:                                │                          │
│  │  ✅ Regression Builds                    │                          │
│  │  ✅ Post Release Notes                   │                          │
│  │  □ Automation Builds                     │                          │
│  │  □ Automation Runs                       │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │  Slot 2                                  │                          │
│  │  Name: "Evening Regression"              │                          │
│  │  Offset: +0 days from kickoff            │                          │
│  │  Time: 17:00                             │                          │
│  │  Actions: [...]                          │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  [Add Slot]                                                             │
│                                                                         │
│  Saved to:                                                              │
│  config.scheduling = {                                                  │
│    releaseFrequency: "BIWEEKLY",                                        │
│    defaultReleaseTime: "17:00",                                         │
│    defaultKickoffTime: "09:00",                                         │
│    kickoffLeadDays: 2,                                                  │
│    kickoffReminderEnabled: true,                                        │
│    kickoffReminderTime: "08:00",                                        │
│    kickoffReminderLeadDays: 1,                                          │
│    workingDays: [1, 2, 3, 4, 5],                                        │
│    timezone: "Asia/Kolkata",                                            │
│    regressionSlots: [...]                                               │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STEP 6: COMMUNICATION                                 │
│                   (CommunicationForm)                                   │
│                                                                         │
│  Slack Configuration:                                                   │
│  • Enable Slack: [Yes/No]                                               │
│                                                                         │
│  IF YES:                                                                │
│  • Select Integration: [slack-workspace]                                │
│  • Releases Channel: #releases                                          │
│  • Builds Channel: #builds                                              │
│  • Regression Channel: #regression                                      │
│  • Critical Channel: #critical-alerts                                   │
│                                                                         │
│  Email Notifications:                                                   │
│  • Enable Email: [Yes/No]                                               │
│  • Notification Emails:                                                 │
│    - release-team@company.com                                           │
│    - qa@company.com                                                     │
│    [Add Email]                                                          │
│                                                                         │
│  Saved to:                                                              │
│  config.communication = {                                               │
│    slack: {                                                             │
│      enabled: true,                                                     │
│      integrationId: "slack-workspace",                                  │
│      channels: {                                                        │
│        releases: "C123456",                                             │
│        builds: "C234567",                                               │
│        regression: "C345678",                                           │
│        critical: "C456789"                                              │
│      }                                                                  │
│    },                                                                   │
│    email: {                                                             │
│      enabled: true,                                                     │
│      notificationEmails: [...]                                          │
│    }                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STEP 7: REVIEW & SAVE                                 │
│                   (ReviewStep)                                          │
│                                                                         │
│  Shows Summary of All Configuration:                                    │
│  • Basic Info                                                           │
│  • Target Platforms: Android (Play Store), iOS (App Store)              │
│  • Build Pipelines: 4 configured                                        │
│  • Test Management: Checkmate enabled                                   │
│  • Scheduling: Bi-weekly releases                                       │
│  • Communication: Slack + Email                                         │
│                                                                         │
│  Configuration Status:                                                  │
│  • Save as: ● Active  ○ Draft                                           │
│                                                                         │
│  [Save Configuration]                                                   │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Save to Backend                                                        │
│                                                                         │
│  API Call:                                                              │
│  POST /api/v1/tenants/{tenantId}/release-config                        │
│  {                                                                      │
│    organizationId: "tenant-123",                                        │
│    name: "Standard Release Config",                                     │
│    releaseType: "PLANNED",                                              │
│    isDefault: true,                                                     │
│    baseBranch: "main",                                                  │
│    defaultTargets: ["PLAY_STORE", "APP_STORE"],                         │
│    buildPipelines: [...],                                               │
│    testManagement: {...},                                               │
│    scheduling: {...},                                                   │
│    communication: {...},                                                │
│    status: "ACTIVE"                                                     │
│  }                                                                      │
│                                                                         │
│  Database:                                                              │
│  INSERT INTO release_configurations                                     │
│  - Stores complete JSON config                                          │
│  - References integrations by ID                                        │
│                                                                         │
│  Response:                                                              │
│  { success: true, configId: "config-abc-123" }                          │
│                                                                         │
│  Redirect to:                                                           │
│  • If returnTo=create → /dashboard/{org}/releases/create                │
│  • Else → /dashboard/{org}/releases/configure                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Hardcoded Assumptions in Config Creation

| Component | Hardcoded Value | Impact |
|-----------|----------------|--------|
| **Release Types** | PLANNED, HOTFIX, EMERGENCY | High |
| **Platforms** | ANDROID, IOS only | High |
| **Target Platforms** | PLAY_STORE, APP_STORE, WEB | High |
| **Build Environments** | PRE_REGRESSION, REGRESSION, TESTFLIGHT, PRODUCTION | High |
| **Pipeline Categories** | Fixed categories per platform | High |
| **Test Providers** | CHECKMATE, TESTRAIL, ZEPHYR (only Checkmate works) | Medium |
| **Release Frequencies** | WEEKLY, BIWEEKLY, MONTHLY, CUSTOM | Medium |
| **Workflow Actions** | Regression, Automation, Release Notes | High |

---

## 🚀 Flow 4: Create Release

### Overview
Using a saved configuration, users create a new release instance with specific version, dates, and targets.

### Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          CREATE RELEASE FLOW                               │
└────────────────────────────────────────────────────────────────────────────┘

USER NAVIGATES TO
/dashboard/{org}/releases/create
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Load Create Release Page                                       │
│  (CreateReleasePage)                                            │
│                                                                 │
│  Loader Data:                                                   │
│  1. Setup status: setupData (checks if setup complete)          │
│  2. Configurations: GET /api/v1/tenants/{org}/release-config   │
│     ?status=ACTIVE                                              │
│                                                                 │
│  IF no configurations:                                          │
│    Show banner: "Create Configuration First"                    │
│    Redirect to /dashboard/{org}/releases/configure              │
│    EXIT                                                         │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERTICAL WIZARD - 5 STEPS                            │
│                                                                         │
│  LEFT SIDEBAR:                                                          │
│  ┌───────────────────────────────┐                                     │
│  │ Create Release                │                                     │
│  │                               │                                     │
│  │ ● 1. Select Configuration     │                                     │
│  │ ○ 2. Release Details          │                                     │
│  │ ○ 3. Scheduling               │                                     │
│  │ ○ 4. Configure                │                                     │
│  │ ○ 5. Review                   │                                     │
│  │                               │                                     │
│  │ Step 1 of 5                   │                                     │
│  └───────────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              STEP 1: SELECT CONFIGURATION                               │
│              (ConfigurationSelector)                                    │
│                                                                         │
│  Shows list of active configurations:                                  │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │ ● Standard Release Config (Default)      │                          │
│  │   Type: PLANNED                          │                          │
│  │   Targets: Play Store, App Store         │                          │
│  │   Base Branch: main                      │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │ ○ Hotfix Configuration                   │                          │
│  │   Type: HOTFIX                           │                          │
│  │   Targets: Play Store, App Store         │                          │
│  │   Base Branch: main                      │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  Actions:                                                               │
│  [+ Create New Configuration]                                           │
│  [Clone & Edit Selected]                                                │
│                                                                         │
│  User selects default config →                                         │
│  selectedConfigId = "config-abc-123"                                    │
│                                                                         │
│  Auto-load full config:                                                 │
│  selectedConfig = configurations.find(c => c.id === selectedConfigId)   │
│                                                                         │
│  Validation:                                                            │
│  ✅ Config selected                                                     │
│                                                                         │
│  [Next Step →]                                                          │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              STEP 2: RELEASE DETAILS                                    │
│              (ReleaseDetailsForm)                                       │
│                                                                         │
│  Version Information:                                                   │
│  • Version: [v1.2.3]              ◄── Auto-generated from latest       │
│    (Format: v{MAJOR}.{MINOR}.{PATCH}) ◄── HARDCODED VALIDATION       │
│                                                                         │
│  • Release Type: [PLANNED]        ◄── Pre-filled from config (disabled)│
│    (PLANNED | HOTFIX | PATCH)     ◄── MISMATCH: config has EMERGENCY  │
│                                                                         │
│  • Base Branch: [main ▼]          ◄── Pre-filled from config, editable│
│    Options fetched from:                                                │
│    GET /api/v1/tenants/{tenantId}/integrations/scm/branches           │
│                                                                         │
│  Release Targets:                                                       │
│  ✅ Web                           ◄── From config.defaultTargets       │
│  ✅ Play Store                                                          │
│  ✅ App Store                                                           │
│  (At least 1 must be selected)    ◄── VALIDATION RULE                 │
│                                                                         │
│  Description (Optional):                                                │
│  [Text area for release description...]                                │
│                                                                         │
│  Stored in state:                                                       │
│  details = {                                                            │
│    version: "v1.2.3",                                                   │
│    releaseType: "PLANNED",        ◄── Mapped from config.releaseType  │
│    baseBranch: "main",                                                  │
│    releaseTargets: {                                                    │
│      web: true,                                                         │
│      playStore: true,                                                   │
│      appStore: true                                                     │
│    },                                                                   │
│    description: "..."                                                   │
│  }                                                                      │
│                                                                         │
│  Validation:                                                            │
│  ✅ Version format: /^v?\d+\.\d+\.\d+$/                                 │
│  ✅ Release type selected                                               │
│  ✅ Base branch selected                                                │
│  ✅ At least 1 target platform                                          │
│                                                                         │
│  [← Previous]  [Next Step →]                                            │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              STEP 3: SCHEDULING                                         │
│              (ReleaseSchedulingPanel)                                   │
│                                                                         │
│  Release Date & Time:                                                   │
│  • Release Date: [2025-01-15]     ◄── Must be future date             │
│  • Release Time: [17:00]          ◄── Optional, defaults from config   │
│                                                                         │
│  Branch Fork-off (Kickoff) Date & Time:                                │
│  • Kickoff Date: [2025-01-13]     ◄── Default: RD - 2 days            │
│  • Kickoff Time: [09:00]          ◄── Optional                         │
│                                                                         │
│  Validation:                                                            │
│  ✅ Release date > Today                                                │
│  ✅ Kickoff date < Release date                                         │
│                                                                         │
│  Regression Builds:                                                     │
│  ● Yes  ○ No                      ◄── Toggle                           │
│                                                                         │
│  IF YES:                                                                │
│  Regression Build Slots:                                                │
│  ┌──────────────────────────────────────────┐                          │
│  │  Slot 1                                  │                          │
│  │  Name: "Morning Build"                   │                          │
│  │  Date: [2025-01-13]                      │                          │
│  │  Time: [09:00]                           │                          │
│  │  [Remove Slot]                           │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │  Slot 2                                  │                          │
│  │  Name: "Evening Build"                   │                          │
│  │  Date: [2025-01-13]                      │                          │
│  │  Time: [17:00]                           │                          │
│  │  [Remove Slot]                           │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  [+ Add Slot]                                                           │
│                                                                         │
│  Validation:                                                            │
│  ✅ Slots must be between kickoff and release dates                     │
│  ✅ At least 1 slot if regression builds enabled                        │
│                                                                         │
│  Stored in state:                                                       │
│  details = {                                                            │
│    ...previous,                                                         │
│    releaseDate: "2025-01-15",                                           │
│    releaseTime: "17:00",                                                │
│    kickoffDate: "2025-01-13",                                           │
│    kickoffTime: "09:00",                                                │
│    hasRegressionBuilds: true,                                           │
│    regressionBuildSlots: [                                              │
│      { id: "slot-1", name: "Morning Build", date: "...", time: "..." },│
│      { id: "slot-2", name: "Evening Build", date: "...", time: "..." } │
│    ]                                                                    │
│  }                                                                      │
│                                                                         │
│  [← Previous]  [Next Step →]                                            │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              STEP 4: CONFIGURE                                          │
│              (ReleaseConfigurePanel)                                    │
│                                                                         │
│  Optional Settings (Customizations):                                    │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │  Pre-Regression Builds                   │                          │
│  │  Enable optional pre-regression builds   │                          │
│  │  before main testing phase               │                          │
│  │                                          │                          │
│  │  ● Enabled  ○ Disabled                   │                          │
│  │                                          │                          │
│  │  Only shown if config has pre-regression │                          │
│  │  pipelines configured                    │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  ┌──────────────────────────────────────────┐                          │
│  │  Checkmate Test Management               │                          │
│  │  Integrate with Checkmate for test       │                          │
│  │  case management and validation          │                          │
│  │                                          │                          │
│  │  ● Enabled  ○ Disabled                   │                          │
│  │                                          │                          │
│  │  Only shown if config has Checkmate      │                          │
│  │  configured                              │                          │
│  └──────────────────────────────────────────┘                          │
│                                                                         │
│  Stored in state:                                                       │
│  customizations = {                                                     │
│    enablePreRegressionBuilds: true,                                     │
│    enableCheckmate: true                                                │
│  }                                                                      │
│                                                                         │
│  [← Previous]  [Next Step →]                                            │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              STEP 5: REVIEW & SUBMIT                                    │
│              (ReleaseReviewSummary)                                     │
│                                                                         │
│  Release Summary:                                                       │
│                                                                         │
│  📦 Basic Details                                                       │
│  • Version: v1.2.3                                                      │
│  • Type: Planned Release                                                │
│  • Base Branch: main                                                    │
│  • Targets: Web, Play Store, App Store                                 │
│                                                                         │
│  📅 Timeline                                                            │
│  • Kickoff: Jan 13, 2025 at 09:00                                      │
│  • Release: Jan 15, 2025 at 17:00                                      │
│  • Regression Slots: 2 configured                                       │
│                                                                         │
│  ⚙️ Configuration                                                       │
│  • Config: Standard Release Config                                      │
│  • Build Pipelines: 4 pipelines                                         │
│  • Test Management: Checkmate (Enabled)                                 │
│  • Pre-Regression: Enabled                                              │
│                                                                         │
│  [← Previous]  [🚀 Create Release]                                      │
└─────────────────────────────────────────────────────────────────────────┘
          │
          │ USER CLICKS "CREATE RELEASE"
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Submit to Backend                                                      │
│                                                                         │
│  API Call:                                                              │
│  POST /api/v1/tenants/{tenantId}/releases                              │
│  {                                                                      │
│    tenantId: "tenant-123",                                              │
│    configId: "config-abc-123",  // Reference to configuration           │
│                                                                         │
│    basicDetails: {                                                      │
│      version: "v1.2.3",                                                 │
│      releaseType: "PLANNED",                                            │
│      baseBranch: "main",                                                │
│      releaseDate: "2025-01-15",                                         │
│      releaseTime: "17:00",                                              │
│      kickoffDate: "2025-01-13",                                         │
│      kickoffTime: "09:00",                                              │
│      hasRegressionBuilds: true,                                         │
│      regressionBuildSlots: [...],                                       │
│      releaseTargets: {                                                  │
│        web: true,                                                       │
│        playStore: true,                                                 │
│        appStore: true                                                   │
│      },                                                                 │
│      description: "..."                                                 │
│    },                                                                   │
│                                                                         │
│    customizations: {                                                    │
│      enablePreRegressionBuilds: true,                                   │
│      enableCheckmate: true                                              │
│    }                                                                    │
│  }                                                                      │
│                                                                         │
│  Backend Processing:                                                    │
│  1. Validate input data                                                 │
│  2. Load configuration by configId                                      │
│  3. Merge basicDetails + customizations + config                        │
│  4. Create release record in DB                                         │
│  5. Generate release key (e.g., "R-2025-01")                            │
│  6. Set status: "KICKOFF_PENDING"                                       │
│  7. Schedule automated tasks:                                           │
│     - PRE_KICK_OFF_REMINDER                                             │
│     - FORK_BRANCH (at kickoff time)                                     │
│     - TRIGGER_REGRESSION_BUILDS (per slot)                              │
│     - etc.                                                              │
│  8. Send notifications (Slack, Email)                                   │
│                                                                         │
│  Database Inserts:                                                      │
│  INSERT INTO releases (...)                                             │
│  INSERT INTO release_tasks (for each automated task)                    │
│  INSERT INTO release_targets (for web, playStore, appStore)            │
│                                                                         │
│  Response:                                                              │
│  {                                                                      │
│    success: true,                                                       │
│    releaseId: "release-xyz-789",                                        │
│    releaseKey: "R-2025-01",                                             │
│    message: "Release created successfully"                              │
│  }                                                                      │
│                                                                         │
│  Redirect to:                                                           │
│  /dashboard/{org}/releases/{releaseId}                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Release State Machine (Hardcoded Status Flow)

```
┌─────────────────┐
│ KICKOFF_PENDING │  ◄── Initial state
└────────┬────────┘
         │ (Auto/Manual) Fork branch at kickoff time
         ▼
   ┌──────────┐
   │ STARTED  │  ◄── Branch forked, tasks begin
   └─────┬────┘
         │ Regression builds complete
         ▼
┌───────────────────────┐
│ REGRESSION_IN_PROGRESS│  ◄── Testing phase
└─────────┬─────────────┘
          │ All tests pass, builds ready
          ▼
  ┌──────────────────┐
  │ BUILD_SUBMITTED  │  ◄── Builds submitted to stores
  └────────┬─────────┘
           │ Approved and released
           ▼
     ┌──────────┐
     │ RELEASED │  ◄── Live to users
     └─────┬────┘
           │ After some time
           ▼
     ┌──────────┐
     │ ARCHIVED │  ◄── Historical record
     └──────────┘
           
  At any time:
     ┌───────────┐
     │ CANCELLED │  ◄── Release aborted
     └───────────┘
```

---

## 📊 Summary Table: Hardcoded Assumptions Across Flows

| Flow | Hardcoded Component | Values | Location | Impact |
|------|---------------------|--------|----------|--------|
| **All** | Release Types | PLANNED, HOTFIX, MAJOR/EMERGENCY | Types files | 🔴 Critical |
| **All** | Integration IDs | 'github', 'slack', 'jenkins', etc. | `config/integrations.ts` | 🔴 Critical |
| **Onboarding** | Setup Steps | SCM → Communication → Review | `useSetupWizard.ts` | 🔴 High |
| **Onboarding** | Required Integrations | GitHub (required), Slack (optional) | `useSetupWizard.ts` | 🔴 High |
| **Integrations** | Integration Categories | 6 categories hardcoded | `types/integrations.ts` | 🔴 High |
| **Integrations** | Connection Routing | Switch on integration.id | `IntegrationConnectModal.tsx` | 🔴 High |
| **Config Creation** | Platforms | ANDROID, IOS only | `types/release-config.ts` | 🔴 Critical |
| **Config Creation** | Target Platforms | WEB, PLAY_STORE, APP_STORE | `types/release-config.ts` | 🔴 Critical |
| **Config Creation** | Build Environments | PRE_REGRESSION, REGRESSION, TESTFLIGHT, PRODUCTION | `types/release-config.ts` | 🔴 Critical |
| **Config Creation** | Pipeline Categories | Fixed 5 categories (Android/iOS × Env) | `FixedPipelineCategories.tsx` | 🔴 High |
| **Config Creation** | Test Providers | CHECKMATE, TESTRAIL, ZEPHYR | `TestManagementSelector.tsx` | 🟡 Medium |
| **Config Creation** | Release Frequencies | WEEKLY, BIWEEKLY, MONTHLY, CUSTOM | `types/release-config.ts` | 🟡 Medium |
| **Create Release** | Version Format | Semantic versioning regex | `release-creation.ts` | 🟡 Medium |
| **Create Release** | Kickoff Offset | Default 2 days before release | `release-creation.ts` | 🟢 Low |
| **Create Release** | Release Status | 8 status values (KICKOFF_PENDING → ARCHIVED) | `types/release.ts` | 🔴 Critical |
| **Backend** | Task Types | 14 task types hardcoded | `schema.prisma` | 🔴 Critical |
| **Backend** | Workflow Stages | 3-stage workflow (stage1/2/3) | `schema.prisma` | 🔴 High |

---

## 🎯 Key Findings

### Critical Issues

1. **Type Mismatch: Release Types**
   - Frontend config: `PLANNED | HOTFIX | EMERGENCY`
   - Frontend release: `PLANNED | HOTFIX | MAJOR`
   - Backend: `PLANNED | HOTFIX | MAJOR`
   - **Workaround:** Frontend maps `EMERGENCY → HOTFIX` during release creation

2. **Type Mismatch: Release Status**
   - Frontend has `KICKOFF_PENDING`, `CANCELLED`
   - Backend doesn't have these statuses
   - **Risk:** State synchronization issues

3. **Hardcoded Integration IDs**
   - All integration logic depends on string IDs: `'github'`, `'slack'`, etc.
   - Difficult to add new integrations dynamically
   - Requires code changes for every new integration

4. **Fixed Pipeline Structure**
   - Assumes specific workflow: Pre-Regression → Regression → TestFlight (iOS)
   - Cannot support custom workflows
   - Hardcoded categories per platform

5. **Task Types Hardcoded**
   - 14 task types baked into schema
   - Assumes specific release process (GitHub-centric, TestRail, L6 approval)
   - Cannot customize per organization

### Architecture Observations

✅ **Good Patterns:**
- Separation of configuration from release instances
- Reusable release configurations
- Integration abstraction layer (could be improved)
- Flexible scheduling configuration

❌ **Areas for Improvement:**
- All integrations hardcoded in frontend
- Platform and target types hardcoded
- Build environments hardcoded
- Task workflow hardcoded
- Type mismatches between frontend/backend

---

## 📝 Recommendations

See `HARDCODED_ASSUMPTIONS_ANALYSIS.md` for detailed recommendations on:
1. Standardizing types across frontend/backend
2. Making integrations pluggable
3. Flexible platform/pipeline configuration
4. Custom workflow support
5. Dynamic task types

---

**Generated:** 2025-01-20
**Scope:** Onboarding, Integrations, Config Creation, Release Creation flows
**Status:** Complete Analysis

