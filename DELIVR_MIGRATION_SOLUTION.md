# Delivr Migration: From Hardcoded Dream11 to Configurable Multi-Tenant Platform

## 📋 Executive Summary

The original Delivr (OG Delivr) was built as a **monolithic, hardcoded release management system specifically for Dream11**. To transform it into a **multi-tenant SaaS platform**, we need to make every hardcoded aspect configurable per organization.

This document provides a comprehensive analysis of OG Delivr's hardcoded elements and presents a detailed solution architecture for the new configurable system.

---

## 🔍 Analysis of OG Delivr Hardcoded Elements

### 1. **Release Workflow - Hardcoded for Dream11**

#### **Regression Slot Timings** (Hardcoded)
```typescript
// Lines 97-109 in useCreateRelease.tsx
const generateRegressionSlots = (plannedDate: Date) => {
  // Slot 1: Same day at 9 PM
  const slot1 = new Date(plannedDate);
  slot1.setHours(21, 0, 0, 0); // HARDCODED: 9:00 PM
  
  // Slot 2: Next working day at 4 PM
  const slot2 = new Date(nextWorkingDay1);
  slot2.setHours(16, 0, 0, 0); // HARDCODED: 4:00 PM
  
  // Slot 3: Next working day after slot2 at 2 PM
  const slot3 = new Date(nextWorkingDay2);
  slot3.setHours(14, 0, 0, 0); // HARDCODED: 2:00 PM
}
```

**What's Hardcoded:**
- Regression slot count: **Always 3 slots**
- Slot 1 timing: **9 PM same day**
- Slot 2 timing: **4 PM next working day**
- Slot 3 timing: **2 PM day after next**
- Working days: **Skip weekends (Saturday, Sunday)**

---

#### **Default Dates and Timings** (Hardcoded)
```typescript
// Lines 463-472
const defaultKickOffReminderDate = useRef(
  new Date(DateTime.now().toJSDate().setHours(17, 0, 0, 0)) // HARDCODED: 5 PM
);

const defaultKickOffDate = useRef(
  new Date(DateTime.now().plus({ days: 1 }).toJSDate().setHours(11, 0, 0, 0)) // HARDCODED: 11 AM next day
);

const defaultTargetReleaseDate = useRef(
  new Date(DateTime.now().plus({ days: 4 }).toJSDate().setHours(20, 0, 0, 0)) // HARDCODED: 8 PM in 4 days
);
```

**What's Hardcoded:**
- Kick-off reminder: **5 PM**
- Kick-off date: **11 AM, 1 day after creation**
- Target release date: **8 PM, 4 days after creation**
- Reminder offset: **1 working day before kickoff**

---

#### **Release Frequency Pattern** (Hardcoded)
```typescript
// Lines 811-814
const previousReleaseDate = new Date(dd);
previousReleaseDate.setDate(previousReleaseDate.getDate() + 21); // HARDCODED: 21 days
previousReleaseDate.setHours(18, 0, 0, 0); // HARDCODED: 6 PM
```

**What's Hardcoded:**
- Release cycle: **Every 21 days (3 weeks)**
- Release time: **6 PM**

---

### 2. **Platform & Target Configuration** (Hardcoded)

#### **Available Platforms**
```typescript
// app/constants/platform.ts
export const PLATFORM = [
  {
    label: 'Android',
    value: PlatformName.ANDROID,
    target: [TargetName.PLAY_STORE, TargetName.WEB], // HARDCODED
  },
  {
    label: 'iOS',
    value: PlatformName.IOS,
    target: [TargetName.APP_STORE], // HARDCODED
  },
];
```

#### **Available Targets**
```typescript
// app/constants/target.ts
export const TARGET = [
  { label: 'Web', value: TargetName.WEB, platform: PlatformName.ANDROID },
  { label: 'Play Store', value: TargetName.PLAY_STORE, platform: PlatformName.ANDROID },
  { label: 'App Store', value: TargetName.APP_STORE, platform: PlatformName.IOS },
];
```

**What's Hardcoded:**
- Platform-target mappings
- Only **Android & iOS** supported
- Only **3 distribution targets** (Web, Play Store, App Store)

---

### 3. **Build Pipeline Configuration** (Hardcoded)

#### **Build Download Links**
```typescript
// app/components/ReleaseBuilds/ReleaseBuilds.constants.ts
export const RELEASE_BUILDS_STATE = {
  [TargetName.APP_STORE]: {
    title: 'iOS build',
    link: 'https://appdistribution.firebase.dev/i/0dd1cb6a6fdc0710', // HARDCODED Dream11 link
  },
  [TargetName.PLAY_STORE]: {
    link: 'https://play.google.com/apps/test/com.dream11.fantasy.cricket.football.kabaddi/', // HARDCODED Dream11 link
  },
};
```

---

### 4. **Release Tasks & Workflow** (Hardcoded)

#### **Hardcoded Task Sequence**
```typescript
// app/components/ReleaseKickOffTab/ReleaseKickOff.constants.ts
export const RELEASE_KICK_OFF_TASK_STATE = {
  [TaskType.PRE_KICK_OFF_REMINDER]: { ... },
  [TaskType.FORK_BRANCH]: { ... },
  [TaskType.UPDATE_GITHUB_VARIABLES]: { ... },
  [TaskType.PRE_RELEASE_CHERRY_PICKS_REMINDER]: { ... },
  [TaskType.ADD_L6_APPROVAL_CHECK]: { ... },
  [TaskType.FINAL_PRE_REGRESSION_BUILDS]: { ... },
  [TaskType.AUTOMATION_RUNS]: { ... },
  [TaskType.TRIGGER_AUTOMATION_RUNS]: { ... },
  [TaskType.RESET_TEST_RAIL_STATUS]: { ... },
  [TaskType.TRIGGER_REGRESSION_BUILDS]: { ... },
  [TaskType.CHERRY_REMINDER]: { ... },
  [TaskType.TEST_FLIGHT_BUILD]: { ... },
  [TaskType.CREATE_RELEASE_TAG]: { ... },
  [TaskType.CREATE_RELEASE_NOTES]: { ... },
};
```

**What's Hardcoded:**
- **14 sequential tasks** in specific order
- Task descriptions and button labels
- Slack channel names (`#app_regression`)
- TestRail integration tasks
- L6 approval checks (Dream11-specific)

---

### 5. **Test Management Integration** (Hardcoded)

#### **Checkmate (Test Management)**
```typescript
// app/utils/pending-go-aheads.ts
const APIS = {
  CHEKMATE_HOST_URL(runId: string) {
    return `http://chekmate.dream11.local/api/v1/run/state-detail?runId=${runId}&groupBy=squads`
    // HARDCODED: Dream11's internal Checkmate URL
  },
};
```

#### **Test Run IDs**
```typescript
// From Release schema
iOSTestRunId           String?   // HARDCODED per release
webTestRunId           String?   // HARDCODED per release
playStoreRunId         String?   // HARDCODED per release
```

---

### 6. **Slack Integration** (Hardcoded)

#### **Slack Channels**
```typescript
// From codebase references
- '#app_regression' // HARDCODED for regression updates
- '#app_release'    // HARDCODED for release notifications
- '#build-notifications' // HARDCODED for build status
- '#critical-alerts' // HARDCODED for critical issues
```

#### **Slack Message Templates**
```typescript
// Lines 625-629
`<!channel>\n:rotating_light: *Release Moved* \n
The target release date for release *v${appVersion}* has been moved...`
// HARDCODED message format, emojis, mentions
```

---

### 7. **Cron Jobs & Automation** (Hardcoded)

#### **Cron Configuration**
```typescript
// Lines 223-232
const [cronCheckboxes, setCronCheckboxes] = useState({
  kickOffReminder: true,         // HARDCODED: Always enabled
  plannedRelease: true,          // HARDCODED: Always enabled
  preRegressionBuilds: true,     // HARDCODED: Always enabled
  regressionBuilds: true,        // HARDCODED: Always enabled
  postReleaseNotes: true,        // HARDCODED: Always enabled
  automationBuilds: true,        // HARDCODED: Always enabled
  automationRuns: true,          // HARDCODED: Always enabled
  needAutomaticRegressions: false,
});
```

---

### 8. **Version Management** (Hardcoded)

#### **Version Bumping Logic**
```typescript
// Dream11-specific versioning: MAJOR.MINOR.PATCH
// PLANNED: Increments MINOR (e.g., 5.30.0 → 5.31.0)
// HOTFIX: Increments PATCH (e.g., 5.30.0 → 5.30.1)
```

---

### 9. **GitHub Integration** (Hardcoded)

#### **Branch Naming Convention**
```typescript
// Lines 985-987
const extractBaseVersion = (branchName: string): string | undefined => {
  const match = branchName.match(/release\/v(\d+\.\d+\.\d+)/i);
  // HARDCODED: `release/v{version}` format
};
```

**Hardcoded Branch Patterns:**
- `release/v5.30.2_web_ps_ios` - Dream11 specific format
- `main` or `master` as base branch

---

### 10. **Release Status Flow** (Hardcoded)

```typescript
// app/constants/release-status.ts
export const RELEASE_STATUS = [
  { value: ReleaseStatus.PENDING, label: 'Scheduled' },
  { value: ReleaseStatus.STARTED, label: 'Start Release Process' },
  { value: ReleaseStatus.REGRESSION_IN_PROGRESS, label: 'Start Regression' },
  { value: ReleaseStatus.REGRESSION_DONE, label: 'Complete Regression' },
  { value: ReleaseStatus.RELEASED, label: 'Complete Release' },
];
```

**What's Hardcoded:**
- **5-step linear workflow**
- Status transitions are fixed
- No conditional or parallel flows

---

## 🎯 Configurable Solution Architecture

### **Core Principle**
> **Everything that was hardcoded for Dream11 becomes a per-organization configuration stored in the database.**

---

## 📦 Database Schema Design

### **1. Organization Configuration Table**

```prisma
model OrganizationConfig {
  id              String   @id @default(cuid())
  organizationId  String   @unique
  
  // Release Cycle Configuration
  defaultReleaseFrequencyDays   Int      @default(21)  // Dream11: 21 days
  defaultReleaseTime            String   @default("18:00") // HH:MM format
  
  // Kickoff Configuration
  defaultKickOffLeadDays        Int      @default(3)   // Days before release
  defaultKickOffTime            String   @default("11:00")
  kickOffReminderLeadDays       Int      @default(1)   // Days before kickoff
  kickOffReminderTime           String   @default("17:00")
  
  // Working Days
  workingDays                   Json     @default("[1,2,3,4,5]") // Mon-Fri
  timezone                      String   @default("Asia/Kolkata")
  
  // Version Management
  versioningScheme              VersionScheme @default(SEMANTIC)
  versionFormat                 String   @default("MAJOR.MINOR.PATCH")
  
  // Branch Naming
  branchNamingConvention        String   @default("release/v{version}_{targets}")
  baseBranch                    String   @default("main")
  
  // Platforms & Targets
  enabledPlatforms              Json     // ["ANDROID", "IOS", "WEB"]
  enabledTargets                Json     // ["WEB", "PLAY_STORE", "APP_STORE"]
  
  createdAt                     DateTime @default(now())
  updatedAt                     DateTime @updatedAt
  
  organization                  Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
}

enum VersionScheme {
  SEMANTIC       // MAJOR.MINOR.PATCH
  CALENDAR       // YYYY.MM.DD
  BUILD_NUMBER   // Sequential integer
  CUSTOM         // User-defined pattern
}
```

---

### **2. Regression Slot Templates**

```prisma
model RegressionSlotTemplate {
  id                    String   @id @default(cuid())
  organizationId        String
  
  name                  String   // "Standard 3-slot", "Fast-track 2-slot", etc.
  description           String?
  isDefault             Boolean  @default(false)
  
  slots                 Json     // Array of slot configurations
  /**
   * Example JSON structure:
   * [
   *   {
   *     "name": "Slot 1",
   *     "offsetDays": 0,
   *     "offsetHours": 10,  // 10 hours after kickoff
   *     "time": "21:00",
   *     "config": {
   *       "regressionBuilds": true,
   *       "postReleaseNotes": false,
   *       "automationBuilds": true,
   *       "automationRuns": true
   *     }
   *   },
   *   {
   *     "name": "Slot 2",
   *     "offsetDays": 1,
   *     "offsetHours": 0,
   *     "time": "16:00",
   *     "config": { ... }
   *   }
   * ]
   */
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  organization          Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
  @@unique([organizationId, name])
}
```

---

### **3. Release Workflow Templates**

```prisma
model ReleaseWorkflowTemplate {
  id                    String   @id @default(cuid())
  organizationId        String
  
  name                  String   // "Standard Release", "Hotfix Flow", "Emergency Deploy"
  description           String?
  releaseType           ReleaseType // PLANNED, HOTFIX, EMERGENCY
  isDefault             Boolean  @default(false)
  
  workflow              Json     // Array of workflow stages
  /**
   * Example JSON structure:
   * [
   *   {
   *     "stage": "PRE_KICKOFF",
   *     "tasks": [
   *       {
   *         "type": "PRE_KICK_OFF_REMINDER",
   *         "label": "Send pre-kickoff reminder",
   *         "description": "Notify stakeholders in Slack",
   *         "isRequired": true,
   *         "automatable": true,
   *         "estimatedDuration": 0,
   *         "integrations": ["SLACK"],
   *         "config": {
   *           "slackChannel": "#releases",
   *           "messageTemplate": "templateId"
   *         }
   *       }
   *     ]
   *   },
   *   {
   *     "stage": "KICKOFF",
   *     "tasks": [
   *       {
   *         "type": "FORK_BRANCH",
   *         "label": "Fork release branch",
   *         "isRequired": true,
   *         "automatable": true,
   *         "estimatedDuration": 120,
   *         "integrations": ["SCM", "JIRA", "TEST_MANAGEMENT"],
   *         "config": {
   *           "createJiraEpic": true,
   *           "createTestRuns": true
   *         }
   *       },
   *       {
   *         "type": "UPDATE_CI_VARIABLES",
   *         "label": "Update CI/CD variables",
   *         "isRequired": false,
   *         "automatable": true,
   *         "integrations": ["CI_CD"]
   *       }
   *     ]
   *   },
   *   {
   *     "stage": "REGRESSION",
   *     "tasks": [...]
   *   },
   *   {
   *     "stage": "POST_RELEASE",
   *     "tasks": [...]
   *   }
   * ]
   */
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  organization          Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
  @@unique([organizationId, name, releaseType])
}
```

---

### **4. Build Pipeline Configuration**

```prisma
model BuildPipelineConfig {
  id                    String   @id @default(cuid())
  organizationId        String
  
  name                  String   // "Production Android", "Staging iOS", etc.
  platform              PlatformName
  target                TargetName
  environment           Environment // STAGING, PRODUCTION, AUTOMATION
  
  // CI/CD Configuration
  cicdType              CICDType  // JENKINS, GITHUB_ACTIONS, GITLAB_CI, etc.
  cicdConfig            Json      // Provider-specific config
  /**
   * For Jenkins:
   * {
   *   "jobUrl": "https://jenkins.company.com/job/android-web-build",
   *   "jobName": "android-web-build",
   *   "parameters": {
   *     "BRANCH": "release_branch",
   *     "BUILD_TYPE": "release",
   *     "FLAVOR": "production"
   *   }
   * }
   * 
   * For GitHub Actions:
   * {
   *   "workflowId": "build.yml",
   *   "workflowPath": ".github/workflows/build.yml",
   *   "branch": "main",
   *   "inputs": { ... }
   * }
   */
  
  // Build Distribution
  distributionType      DistributionType // FIREBASE, TESTFLIGHT, INTERNAL, etc.
  distributionConfig    Json
  /**
   * For Firebase:
   * {
   *   "appId": "1:xxxx:android:xxxx",
   *   "downloadUrl": "https://appdistribution.firebase.dev/i/xxxx"
   * }
   * 
   * For TestFlight:
   * {
   *   "appId": "com.company.app",
   *   "groupName": "Internal Testers"
   * }
   */
  
  // Build Settings
  buildTimeout          Int      @default(3600) // seconds
  retryAttempts         Int      @default(3)
  
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  organization          Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId, platform, target])
}

enum CICDType {
  JENKINS
  GITHUB_ACTIONS
  GITLAB_CI
  CIRCLE_CI
  BITBUCKET_PIPELINES
  AZURE_DEVOPS
  CUSTOM
}

enum DistributionType {
  FIREBASE
  TESTFLIGHT
  INTERNAL
  PLAY_STORE_INTERNAL
  CUSTOM_URL
}

enum Environment {
  STAGING
  PRODUCTION
  AUTOMATION
  QA
  DEVELOPMENT
}
```

---

### **5. Integration Configuration Per Org**

```prisma
model OrganizationIntegration {
  id                    String   @id @default(cuid())
  organizationId        String
  integrationType       IntegrationType
  
  name                  String   // "Main Slack Workspace", "Prod Jenkins"
  isActive              Boolean  @default(true)
  isPrimary             Boolean  @default(false) // Primary integration for this type
  
  config                Json     // Integration-specific configuration
  /**
   * For Slack:
   * {
   *   "workspaceId": "TXXXX",
   *   "botToken": "xoxb-xxxx",
   *   "channels": {
   *     "releases": "C123ABC",
   *     "builds": "C456DEF",
   *     "regression": "C789GHI",
   *     "critical": "C012JKL"
   *   },
   *   "messageTemplates": {
   *     "releaseKickoff": "templateId",
   *     "releaseMoved": "templateId"
   *   }
   * }
   * 
   * For Checkmate:
   * {
   *   "hostUrl": "https://checkmate.company.com",
   *   "apiKey": "encrypted",
   *   "workspaceId": "workspace-123",
   *   "projectId": "project-456"
   * }
   * 
   * For Jira:
   * {
   *   "hostUrl": "https://company.atlassian.net",
   *   "authType": "BASIC",
   *   "username": "user@company.com",
   *   "apiToken": "encrypted",
   *   "defaultProject": "PROJ",
   *   "epicLinkField": "customfield_10014"
   * }
   */
  
  // Integration Health
  verificationStatus    VerificationStatus
  lastVerifiedAt        DateTime?
  verificationError     String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  organization          Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId, integrationType])
  @@unique([organizationId, integrationType, name])
}

enum IntegrationType {
  SCM              // GitHub, GitLab, Bitbucket
  CI_CD            // Jenkins, GitHub Actions, etc.
  COMMUNICATION    // Slack, Teams, Discord
  TEST_MANAGEMENT  // Checkmate, TestRail, Zephyr
  PROJECT_MGMT     // Jira, Azure DevOps
  APP_DISTRIBUTION // Firebase, TestFlight, etc.
}
```

---

### **6. Message Templates**

```prisma
model MessageTemplate {
  id                    String   @id @default(cuid())
  organizationId        String
  
  name                  String   // "Release Kickoff", "Release Moved", etc.
  type                  MessageType
  channel               CommunicationType // SLACK, TEAMS, EMAIL, etc.
  
  subject               String?  // For email/notifications
  template              String   // Message template with variables
  /**
   * Example Slack template:
   * "<!channel> :rocket: *Release Kickoff*\n\n
   * Release: *v{{version}}*\n
   * Kickoff Date: {{kickoffDate}}\n
   * Target Release: {{targetReleaseDate}}\n
   * Pilot: {{releasePilot}}\n\n
   * Platforms: {{platforms}}\n
   * Targets: {{targets}}\n\n
   * Please prepare for regression testing."
   * 
   * Variables: {{version}}, {{kickoffDate}}, {{platforms}}, etc.
   */
  
  variables             Json     // Available variables and their types
  /**
   * [
   *   { "name": "version", "type": "string", "required": true },
   *   { "name": "kickoffDate", "type": "date", "format": "MMM DD, YYYY" },
   *   { "name": "platforms", "type": "array" }
   * ]
   */
  
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  organization          Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId, type])
  @@unique([organizationId, name, type])
}

enum MessageType {
  RELEASE_KICKOFF
  RELEASE_MOVED
  REGRESSION_START
  BUILD_COMPLETE
  REGRESSION_COMPLETE
  RELEASE_COMPLETE
  CHERRY_PICK_REMINDER
  GO_AHEAD_REQUEST
  CRITICAL_ALERT
}

enum CommunicationType {
  SLACK
  TEAMS
  DISCORD
  EMAIL
  WEBHOOK
}
```

---

## 🎨 Frontend Configuration UI

### **1. Organization Settings Page**

**Route**: `/dashboard/:org/settings/release-management`

**Tabs**:
1. **General Configuration**
   - Release frequency
   - Default timings
   - Working days & timezone
   - Version scheme

2. **Regression Slots**
   - Create/edit slot templates
   - Visual timeline builder
   - Drag-and-drop slot arrangement

3. **Workflow Templates**
   - View/edit workflow templates by release type
   - Task management (add/remove/reorder)
   - Task configuration per step

4. **Build Pipelines**
   - Configure CI/CD integrations per platform/target
   - Test build pipelines
   - Distribution settings

5. **Integrations**
   - Connect/configure external services
   - Map channels/projects
   - Test connections

6. **Message Templates**
   - Create/edit notification templates
   - Preview with sample data
   - Variable mapping

---

### **2. Release Creation Flow - Dynamic**

When creating a release:

1. **Fetch Organization Config**
   ```typescript
   const orgConfig = await getOrganizationConfig(tenantId);
   ```

2. **Load Templates**
   ```typescript
   const workflowTemplate = await getWorkflowTemplate(tenantId, releaseType);
   const regressionTemplate = await getRegressionSlotTemplate(tenantId);
   ```

3. **Generate Dynamic Defaults**
   ```typescript
   const kickoffDate = calculateKickoffDate(
     targetReleaseDate,
     orgConfig.defaultKickOffLeadDays,
     orgConfig.workingDays,
     orgConfig.timezone
   );
   
   const regressionSlots = generateSlots(
     kickoffDate,
     targetReleaseDate,
     regressionTemplate.slots,
     orgConfig.workingDays
   );
   ```

4. **Apply Workflow**
   ```typescript
   const releaseTasks = workflowTemplate.workflow.flatMap(stage => 
     stage.tasks.map(task => ({
       ...task,
       releaseId: release.id,
       status: 'PENDING'
     }))
   );
   ```

---

## 🔄 Migration Strategy

### **Phase 1: Data Model**
1. Create new configuration tables
2. Migrate Dream11 hardcoded values to database
3. Add foreign keys and relationships

### **Phase 2: Backend Services**
1. Create configuration service layer
2. Update release creation to use configs
3. Add validation and defaults

### **Phase 3: Frontend UI**
1. Build configuration management pages
2. Add template builders (visual)
3. Create preview/testing tools

### **Phase 4: Migration Scripts**
1. Seed default configurations for new orgs
2. Allow cloning configurations (templates)
3. Import/export configurations

### **Phase 5: Backward Compatibility**
1. Gradual rollout with feature flags
2. Fallback to hardcoded defaults if config missing
3. Deprecation notices

---

## 🎯 Key Benefits

### **For Organizations**
- ✅ **Flexibility**: Each org defines their own release cadence
- ✅ **Customization**: Tailor workflows to team processes
- ✅ **Scalability**: Add new integrations without code changes
- ✅ **Multi-tenant**: True SaaS with isolated configurations

### **For Development Team**
- ✅ **Maintainability**: Configuration changes don't require deployments
- ✅ **Extensibility**: Easy to add new workflow types
- ✅ **Testing**: Test with different org configurations
- ✅ **DRY Principle**: No duplication across organizations

---

## 📊 Configuration Hierarchy

```
Organization
  ├── Organization Config (General Settings)
  ├── Regression Slot Templates
  │   └── Slots (Time, Offset, Config)
  ├── Workflow Templates (by Release Type)
  │   └── Stages
  │       └── Tasks
  │           └── Integration Configs
  ├── Build Pipeline Configs (by Platform/Target)
  │   ├── CI/CD Settings
  │   └── Distribution Settings
  ├── Integrations (External Services)
  │   ├── SCM (GitHub, GitLab)
  │   ├── CI/CD (Jenkins, Actions)
  │   ├── Communication (Slack, Teams)
  │   ├── Test Management (Checkmate, TestRail)
  │   ├── Project Management (Jira)
  │   └── App Distribution (Firebase, TestFlight)
  └── Message Templates
      └── Templates by Type & Channel
```

---

## 🚀 Implementation Priority

### **Must Have (P0)**
1. ✅ Organization Config (timings, frequencies)
2. ✅ Regression Slot Templates
3. ✅ Basic Workflow Templates
4. ✅ Integration Configuration Storage

### **Should Have (P1)**
1. ✅ Advanced Workflow Builder UI
2. ✅ Build Pipeline Configuration
3. ✅ Message Template System
4. ✅ Configuration Import/Export

### **Nice to Have (P2)**
1. ✅ Workflow Analytics
2. ✅ Configuration Versioning
3. ✅ A/B Testing Workflows
4. ✅ AI-suggested Optimizations

---

## 💡 Example: Creating a Release (New System)

```typescript
// 1. Fetch org configuration
const orgConfig = await db.organizationConfig.findUnique({
  where: { organizationId: tenantId }
});

// 2. Get workflow template
const workflowTemplate = await db.releaseWorkflowTemplate.findFirst({
  where: {
    organizationId: tenantId,
    releaseType: 'PLANNED',
    isDefault: true
  }
});

// 3. Get regression template
const regressionTemplate = await db.regressionSlotTemplate.findFirst({
  where: {
    organizationId: tenantId,
    isDefault: true
  }
});

// 4. Calculate dates using org config
const kickoffDate = moment(targetReleaseDate)
  .subtract(orgConfig.defaultKickOffLeadDays, 'days')
  .hour(parseInt(orgConfig.defaultKickOffTime.split(':')[0]))
  .minute(parseInt(orgConfig.defaultKickOffTime.split(':')[1]))
  .tz(orgConfig.timezone);

// 5. Generate regression slots
const regressionSlots = regressionTemplate.slots.map((slot: any) => {
  const slotDate = moment(kickoffDate)
    .add(slot.offsetDays, 'days')
    .hour(parseInt(slot.time.split(':')[0]))
    .minute(parseInt(slot.time.split(':')[1]));
    
  return {
    date: slotDate.toDate(),
    config: slot.config
  };
});

// 6. Create release with generated data
const release = await db.release.create({
  data: {
    version: calculatedVersion,
    plannedDate: kickoffDate.toDate(),
    targetReleaseDate: targetReleaseDate,
    // ... other fields
  }
});

// 7. Create tasks from workflow template
const tasks = workflowTemplate.workflow.flatMap((stage: any) =>
  stage.tasks.map((task: any) => ({
    releaseId: release.id,
    type: task.type,
    label: task.label,
    description: task.description,
    status: 'PENDING',
    config: task.config
  }))
);

await db.releaseTasks.createMany({ data: tasks });
```

---

## 📝 Summary

The transformation from OG Delivr to New Delivr involves:

1. **Identifying** all hardcoded Dream11-specific values
2. **Abstracting** them into database-driven configurations
3. **Building** UI tools for organizations to manage their configs
4. **Implementing** dynamic workflow generation based on configs
5. **Maintaining** backward compatibility during migration

This approach ensures that New Delivr becomes a **true multi-tenant SaaS platform** where each organization can define its unique release management process without requiring code changes.

---

**Document Version**: 1.0  
**Last Updated**: November 17, 2025  
**Status**: ✅ Ready for Implementation

