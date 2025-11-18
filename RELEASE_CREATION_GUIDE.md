# Release Creation Flow - Implementation Guide

## Overview

Complete end-to-end release creation wizard that supports two modes:
1. **WITH_CONFIG**: Use saved release configurations with ability to customize
2. **MANUAL**: Create releases from scratch without a configuration template

## Architecture

### File Structure

```
app/
├── types/
│   └── release-creation.ts                    # Types for release creation
├── components/
│   └── ReleaseCreation/
│       ├── ConfigurationSelector.tsx          # Mode & config selection
│       ├── ReleaseDetailsForm.tsx             # Basic release info
│       ├── ReleaseCustomizationPanel.tsx      # Override config settings
│       ├── ManualConfigurationPanel.tsx       # Manual mode configuration
│       └── ReleaseReviewSummary.tsx           # Final review before creation
├── routes/
│   └── dashboard.$org.releases.create.tsx     # Main wizard route
└── utils/
    └── release-config-storage.ts              # Config storage utilities
```

## Component Breakdown

### 1. ConfigurationSelector

**Purpose**: Allow users to choose between using a saved configuration or creating manually.

**Features**:
- Radio selection between WITH_CONFIG and MANUAL modes
- List of available active configurations
- Display config details (name, description, pipelines, platforms, slots)
- Highlight default configuration
- Warning if no configurations available

**Props**:
```typescript
{
  configurations: ReleaseConfiguration[];
  selectedMode: 'WITH_CONFIG' | 'MANUAL';
  selectedConfigId?: string;
  onModeChange: (mode: 'WITH_CONFIG' | 'MANUAL') => void;
  onConfigSelect: (configId: string) => void;
}
```

**Usage**:
```tsx
<ConfigurationSelector
  configurations={configurations}
  selectedMode={mode}
  selectedConfigId={selectedConfigId}
  onModeChange={setMode}
  onConfigSelect={setSelectedConfigId}
/>
```

---

### 2. ReleaseDetailsForm

**Purpose**: Capture basic release information (version, dates, description).

**Features**:
- Version input (required)
- Release type selector (PLANNED/HOTFIX/EMERGENCY)
- Base version input (optional)
- Kickoff and release date pickers (required)
- Description textarea (optional)
- Pre-population from configuration (if WITH_CONFIG mode)

**Props**:
```typescript
{
  details: Partial<ReleaseBasicDetails>;
  onChange: (details: Partial<ReleaseBasicDetails>) => void;
  prePopulated?: boolean;
}
```

**Usage**:
```tsx
<ReleaseDetailsForm
  details={details}
  onChange={setDetails}
  prePopulated={mode === 'WITH_CONFIG'}
/>
```

---

### 3. ReleaseCustomizationPanel

**Purpose**: Allow customization of configuration settings for a specific release.

**Features**:
- Toggle pre-regression builds on/off
- Enable/disable test management
- Toggle auto-create test runs
- Enable/disable Slack notifications
- Enable/disable email notifications
- Display configured pipelines and scheduling info
- Alert for manual mode (no config to customize)

**Props**:
```typescript
{
  config?: ReleaseConfiguration;
  customizations: Partial<ReleaseCustomizations>;
  onChange: (customizations: Partial<ReleaseCustomizations>) => void;
}
```

**Usage**:
```tsx
<ReleaseCustomizationPanel
  config={selectedConfig}
  customizations={customizations}
  onChange={setCustomizations}
/>
```

**Customization Options**:
- **Build Pipelines**: Enable/disable pre-regression
- **Test Management**: Enable/disable, auto-create runs
- **Communication**: Enable/disable Slack and email

---

### 4. ManualConfigurationPanel

**Purpose**: Full configuration interface for manual mode (no saved configuration).

**Features**:
- Select target platforms (Web, Play Store, App Store)
- Configure build pipeline options
- Enable/disable test management
- Configure communication settings
- Helpful guidance and alerts
- Warnings about post-creation configuration needs

**Props**:
```typescript
{
  customizations: Partial<ReleaseCustomizations>;
  onChange: (customizations: Partial<ReleaseCustomizations>) => void;
}
```

**Usage**:
```tsx
<ManualConfigurationPanel
  customizations={customizations}
  onChange={setCustomizations}
/>
```

**Configuration Sections**:
1. **Target Platforms**: Checkboxes for Web, Play Store, App Store
2. **Build Configuration**: Pre-regression toggle + guidance
3. **Test Management**: Enable/disable + auto-create runs
4. **Communication**: Slack and email toggles

---

### 5. ReleaseReviewSummary

**Purpose**: Display comprehensive review of all release details before creation.

**Features**:
- Release information summary (version, type, dates, description)
- Applied configuration details (if WITH_CONFIG)
- List of all customizations
- Visual indicators for enabled/disabled features
- Manual mode indicator

**Props**:
```typescript
{
  config?: ReleaseConfiguration;
  details: Partial<ReleaseBasicDetails>;
  customizations: Partial<ReleaseCustomizations>;
}
```

**Usage**:
```tsx
<ReleaseReviewSummary
  config={selectedConfig}
  details={details}
  customizations={customizations}
/>
```

---

## Wizard Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Choose Mode                                          │
├─────────────────────────────────────────────────────────────┤
│ • Select WITH_CONFIG or MANUAL                              │
│ • If WITH_CONFIG: Select a saved configuration             │
│ • View configuration details                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Release Details                                      │
├─────────────────────────────────────────────────────────────┤
│ • Enter version (required)                                  │
│ • Select release type                                       │
│ • Enter base version (optional)                             │
│ • Set kickoff date (required)                               │
│ • Set release date (required)                               │
│ • Add description (optional)                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Configure                                            │
├─────────────────────────────────────────────────────────────┤
│ WITH_CONFIG MODE:                   MANUAL MODE:            │
│ • Toggle pre-regression builds      • Select platforms      │
│ • Enable/disable test management    • Configure builds      │
│ • Toggle communication channels     • Setup test mgmt       │
│                                      • Setup communication  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Review                                               │
├─────────────────────────────────────────────────────────────┤
│ • Review all details                                        │
│ • View applied configuration                                │
│ • Check customizations                                      │
│ • Confirm and create                                        │
└─────────────────────────────────────────────────────────────┘
```

### Validation Rules

| Step | WITH_CONFIG Mode | MANUAL Mode |
|------|------------------|-------------|
| **Step 1** | Must select a configuration | Mode selection only |
| **Step 2** | Version + both dates required | Version + both dates required |
| **Step 3** | All optional | At least one platform required |
| **Step 4** | Always valid | Always valid |

---

## Data Structures

### ReleaseCreationMode

```typescript
interface ReleaseCreationMode {
  type: 'WITH_CONFIG' | 'MANUAL';
  configId?: string;
}
```

### ReleaseBasicDetails

```typescript
interface ReleaseBasicDetails {
  version: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY';
  baseVersion?: string;
  kickoffDate: string;
  releaseDate: string;
  description?: string;
}
```

### ReleaseCustomizations

```typescript
interface ReleaseCustomizations {
  // Platform overrides
  platforms?: {
    web: boolean;
    playStore: boolean;
    appStore: boolean;
  };
  
  // Build pipeline customizations
  buildPipelines?: {
    enablePreRegression: boolean;
    enabledPipelineIds: string[];
  };
  
  // Test management customizations
  testManagement?: {
    enabled: boolean;
    createTestRuns?: boolean;
  };
  
  // Communication customizations
  communication?: {
    enableSlack: boolean;
    enableEmail: boolean;
  };
}
```

### CompleteReleaseData

```typescript
interface CompleteReleaseData {
  tenantId: string;
  configId?: string;
  basicDetails: ReleaseBasicDetails;
  customizations: ReleaseCustomizations;
  mergedConfig?: Partial<ReleaseConfiguration>;
}
```

---

## State Management

### Main Component State

```typescript
// Wizard state
const [currentStep, setCurrentStep] = useState(0);
const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

// Release creation state
const [mode, setMode] = useState<'WITH_CONFIG' | 'MANUAL'>('WITH_CONFIG');
const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
const [selectedConfig, setSelectedConfig] = useState<ReleaseConfiguration | undefined>();
const [details, setDetails] = useState<Partial<ReleaseBasicDetails>>({});
const [customizations, setCustomizations] = useState<Partial<ReleaseCustomizations>>({});
```

### Configuration Loading

```typescript
// Load configurations from local storage on client
useEffect(() => {
  if (typeof window !== 'undefined') {
    const configs = loadConfigList(org);
    const activeConfigs = configs.filter(c => c.status === 'ACTIVE');
    const defaultConfig = activeConfigs.find(c => c.isDefault);
    
    if (defaultConfig) {
      setSelectedConfigId(defaultConfig.id);
    }
  }
}, [org]);

// Load full configuration when selected
useEffect(() => {
  if (selectedConfigId) {
    const config = loadConfigById(org, selectedConfigId);
    if (config) {
      setSelectedConfig(config);
    }
  } else {
    setSelectedConfig(undefined);
  }
}, [org, selectedConfigId]);
```

---

## Backend Integration

### API Endpoint (TODO)

**Endpoint**: `POST /api/v1/tenants/:tenantId/releases`

**Request Body**:
```typescript
{
  configId?: string,           // If using configuration
  version: string,
  releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY',
  baseVersion?: string,
  kickoffDate: string,
  releaseDate: string,
  description?: string,
  customizations: {
    platforms?: { ... },
    buildPipelines?: { ... },
    testManagement?: { ... },
    communication?: { ... }
  }
}
```

**Response**:
```typescript
{
  success: boolean;
  releaseId: string;
  message: string;
}
```

### Implementation

```typescript
const handleSubmit = async () => {
  const releaseData: CompleteReleaseData = {
    tenantId: org,
    configId: selectedConfigId,
    basicDetails: details as ReleaseBasicDetails,
    customizations,
  };
  
  try {
    const response = await fetch(`/api/v1/tenants/${org}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseData),
    });
    
    if (response.ok) {
      const { releaseId } = await response.json();
      navigate(`/dashboard/${org}/releases/${releaseId}`);
    }
  } catch (error) {
    console.error('Failed to create release:', error);
  }
};
```

---

## User Experience

### WITH_CONFIG Mode Journey

1. **Configuration Selection**
   - User selects from available configurations
   - System loads configuration details
   - Pre-populates release type from config

2. **Enter Release Details**
   - User enters version and dates
   - Dates are required, but user can pick any date
   - Description is optional

3. **Customize (Optional)**
   - User can disable pre-regression builds for this release
   - User can disable test management
   - User can toggle notifications
   - All customizations are optional

4. **Review and Create**
   - User sees complete summary
   - System shows which config is being used
   - User sees list of customizations
   - Click "Create Release" to finalize

### MANUAL Mode Journey

1. **Mode Selection**
   - User chooses "Create Manually"
   - No configuration needed

2. **Enter Release Details**
   - Same as WITH_CONFIG mode
   - All fields start empty

3. **Configure from Scratch**
   - User selects target platforms (required)
   - User configures build options
   - User enables/disables test management
   - User configures communication settings
   - Helpful guidance provided

4. **Review and Create**
   - User sees summary of all settings
   - Alert indicates manual release
   - Guidance on post-creation steps
   - Click "Create Release" to finalize

---

## Benefits

### For WITH_CONFIG Mode

✅ **Consistency**: Use proven configurations across releases
✅ **Speed**: Pre-populated settings save time
✅ **Flexibility**: Override specific settings when needed
✅ **Reliability**: Reduce configuration errors

### For MANUAL Mode

✅ **Flexibility**: Complete control over all settings
✅ **Emergency Releases**: Quick one-off releases
✅ **Custom Requirements**: Handle unique scenarios
✅ **Learning**: Understand all configuration options

---

## Future Enhancements

### Planned Features

1. **Configuration Templates**
   - Save manual configurations as templates
   - Convert manual releases to configurations

2. **Validation Improvements**
   - Check for version conflicts
   - Validate date ranges
   - Ensure required integrations are configured

3. **Smart Defaults**
   - Suggest next version number
   - Auto-calculate kickoff dates
   - Recommend configurations based on release type

4. **Release Cloning**
   - Duplicate previous releases
   - Copy customizations
   - Adjust dates automatically

5. **Bulk Operations**
   - Create multiple releases
   - Schedule release series
   - Apply configuration updates to pending releases

---

## Testing Scenarios

### Test Case 1: WITH_CONFIG - Happy Path

1. Navigate to create release
2. Select WITH_CONFIG mode
3. Choose default configuration
4. Enter version "v2.0.0"
5. Set kickoff and release dates
6. Add description
7. Keep all default customizations
8. Review and create
9. **Expected**: Release created with all config settings

### Test Case 2: WITH_CONFIG - With Customizations

1. Navigate to create release
2. Select WITH_CONFIG mode
3. Choose a configuration
4. Enter release details
5. Disable pre-regression builds
6. Disable test management
7. Review and create
8. **Expected**: Release created with customizations applied

### Test Case 3: MANUAL - Happy Path

1. Navigate to create release
2. Select MANUAL mode
3. Enter release details
4. Select platforms: Web + Play Store
5. Enable test management
6. Enable Slack notifications
7. Review and create
8. **Expected**: Manual release created

### Test Case 4: Validation Errors

1. Navigate to create release
2. Select WITH_CONFIG but don't choose config
3. Try to proceed
4. **Expected**: Cannot proceed to step 2
5. Select config, proceed
6. Don't enter version
7. Try to proceed
8. **Expected**: Cannot proceed to step 3

---

## Troubleshooting

### Issue: No configurations available

**Symptom**: Empty configuration list in WITH_CONFIG mode

**Solution**:
1. Check local storage for saved configurations
2. Navigate to Release Configuration wizard
3. Create at least one configuration
4. Mark one as default
5. Return to create release

### Issue: Cannot proceed from customization step (Manual mode)

**Symptom**: Next button disabled on step 3 in manual mode

**Solution**:
1. Ensure at least one platform is selected
2. Check validation requirements
3. Review error messages if any

### Issue: Configuration not loading

**Symptom**: Selected config doesn't populate settings

**Solution**:
1. Check browser console for errors
2. Verify local storage contains config data
3. Ensure config ID is valid
4. Try selecting different configuration

---

## Summary

The Release Creation Flow provides a flexible, user-friendly interface for creating releases with or without saved configurations. It balances automation with customization, ensuring consistency while allowing for unique requirements.

**Key Points**:
- ✅ Two modes: WITH_CONFIG and MANUAL
- ✅ 4-step wizard with validation
- ✅ Reusable, small components
- ✅ Configuration override capability
- ✅ Comprehensive review before creation
- ✅ Ready for backend integration

