# Release Creation UI Refactor Plan
## Direct Backend API Compatibility (No BFF Transformation)

## Overview
Refactor the release creation UI to generate data that matches the backend API format exactly, eliminating the need for transformation in the BFF layer.

---

## Backend API Contract

### Endpoint
```
POST /tenants/:tenantId/releases
```

### Request Body Format
```typescript
{
  // REQUIRED
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED',
  platformTargets: Array<{
    platform: 'ANDROID' | 'IOS' | 'WEB',
    target: 'PLAY_STORE' | 'APP_STORE' | 'WEB',
    version: string  // e.g., 'v6.5.0'
  }>,
  releaseConfigId: string,
  baseBranch: string,
  kickOffDate: string,        // ISO date string
  targetReleaseDate: string,  // ISO date string
  
  // OPTIONAL
  branch?: string,
  baseReleaseId?: string,
  kickOffReminderDate?: string,
  hasManualBuildUpload?: boolean,
  
  // Regression Build Slots
  regressionBuildSlots?: Array<{
    date: string,              // ISO date string
    config: Record<string, unknown>
  }>,
  regressionTimings?: string,
  
  // Pre-created Builds
  preCreatedBuilds?: Array<{
    platform: string,
    target: string,
    buildNumber: string,
    buildUrl: string
  }>,
  
  // Cron Config
  cronConfig?: {
    kickOffReminder?: boolean,
    preRegressionBuilds?: boolean,
    automationBuilds?: boolean,
    automationRuns?: boolean
  },
  
  // Custom Integration Configs
  customIntegrationConfigs?: Record<string, unknown>
}
```

### Key Differences from Current UI Format
1. **platformTargets**: Array format with per-platform versions (not separate `releaseTargets` + `platformVersions`)
2. **regressionBuildSlots**: Array of `{ date, config }` (not offset-based like config)
3. **Dates**: ISO strings (not separate date + time)
4. **cronConfig**: Separate object (not embedded in customizations)

---

## Implementation Plan

### Phase 1: Type Definitions

#### 1.1 Create Backend-Compatible Types
**File**: `app/types/release-creation-backend.ts`

```typescript
/**
 * Backend-compatible release creation request
 * Matches exact backend API contract
 */
export interface CreateReleaseBackendRequest {
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  platformTargets: PlatformTargetWithVersion[];
  releaseConfigId: string;
  baseBranch: string;
  kickOffDate: string;  // ISO string
  targetReleaseDate: string;  // ISO string
  
  // Optional fields
  branch?: string;
  baseReleaseId?: string;
  kickOffReminderDate?: string;
  hasManualBuildUpload?: boolean;
  regressionBuildSlots?: RegressionBuildSlotBackend[];
  regressionTimings?: string;
  preCreatedBuilds?: PreCreatedBuild[];
  cronConfig?: CronConfig;
  customIntegrationConfigs?: Record<string, unknown>;
}

export interface PlatformTargetWithVersion {
  platform: 'ANDROID' | 'IOS' | 'WEB';
  target: 'PLAY_STORE' | 'APP_STORE' | 'WEB';
  version: string;  // e.g., 'v6.5.0'
}

export interface RegressionBuildSlotBackend {
  date: string;  // ISO date string
  config: Record<string, unknown>;
}

export interface PreCreatedBuild {
  platform: string;
  target: string;
  buildNumber: string;
  buildUrl: string;
}

export interface CronConfig {
  kickOffReminder?: boolean;
  preRegressionBuilds?: boolean;
  automationBuilds?: boolean;
  automationRuns?: boolean;
}
```

---

### Phase 2: Extract Reusable Components

#### 2.1 Extract RegressionSlotCard Component
**Action**: Extract `RegressionSlotCard` from `SchedulingConfig.tsx` to a reusable component

**New File**: `app/components/ReleaseConfig/Scheduling/RegressionSlotCard.tsx`

**Props Interface**:
```typescript
export interface RegressionSlotCardProps {
  slot: RegressionSlot;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (slot: RegressionSlot) => void;
  onCollapse: () => void;
  targetReleaseOffset: number;
  targetReleaseTime: string;
  kickoffTime: string;
}
```

**Usage**: Can be reused in both:
- Release Config Scheduling (`SchedulingConfig.tsx`)
- Release Creation Scheduling (new component)

---

### Phase 3: Create New Release Creation Components

#### 3.1 Platform Targets Selector Component
**New File**: `app/components/ReleaseCreation/PlatformTargetsSelector.tsx`

**Purpose**: Allow user to select platforms/targets with per-platform version input

**Features**:
- Pre-fill from selected config
- Allow deselection (but maintain minimum 1)
- Per-platform version input
- Visual indication of pre-filled values

**Props**:
```typescript
interface PlatformTargetsSelectorProps {
  platformTargets: PlatformTargetWithVersion[];
  onChange: (platformTargets: PlatformTargetWithVersion[]) => void;
  config?: ReleaseConfiguration;  // For pre-filling
  errors?: Record<string, string>;
}
```

**UI Structure**:
```
┌─────────────────────────────────────┐
│ Platform Targets                    │
│ [From Config] Badge                 │
├─────────────────────────────────────┤
│ ☑ Android → Play Store              │
│   Version: [v6.5.0] (pre-filled)     │
│                                     │
│ ☑ iOS → App Store                   │
│   Version: [v6.3.0] (pre-filled)    │
│                                     │
│ ☐ Web → Web                         │
│   Version: [v6.5.0]                 │
└─────────────────────────────────────┘
```

**Validation**:
- At least 1 platformTarget required
- Each selected target must have a version
- Version format: `vX.Y.Z`

#### 3.2 Regression Slots Manager Component
**New File**: `app/components/ReleaseCreation/RegressionSlotsManager.tsx`

**Purpose**: Manage regression build slots in backend format

**Features**:
- Reuse `RegressionSlotCard` component
- Convert from config format (offset-based) to backend format (date-based)
- Convert back to offset-based for editing
- **Pre-fill from config**: When user provides kickoff and target release dates, convert config's offset-based slots to absolute dates

**Props**:
```typescript
interface RegressionSlotsManagerProps {
  regressionBuildSlots: RegressionBuildSlotBackend[];
  kickOffDate: string;  // ISO string
  targetReleaseDate: string;  // ISO string
  onChange: (slots: RegressionBuildSlotBackend[]) => void;
  config?: ReleaseConfiguration;  // For pre-filling
  errors?: Record<string, string>;
}
```

**Conversion Logic**:
```typescript
/**
 * Convert config's offset-based regression slots to backend's date-based format
 * Uses user-provided kickoff date to calculate absolute dates
 */
function convertConfigSlotsToBackend(
  configSlots: RegressionSlot[],
  kickOffDate: Date,
  targetReleaseDate: Date
): RegressionBuildSlotBackend[] {
  return configSlots.map(slot => {
    // Calculate absolute date: kickoff date + offset days
    const slotDate = new Date(kickOffDate);
    slotDate.setDate(slotDate.getDate() + slot.regressionSlotOffsetFromKickoff);
    
    // Combine date with time from slot
    const [hours, minutes] = slot.time.split(':');
    slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // Validate slot date is between kickoff and target release
    if (slotDate < kickOffDate || slotDate > targetReleaseDate) {
      console.warn(`Regression slot date ${slotDate.toISOString()} is outside valid range`);
    }
    
    return {
      date: slotDate.toISOString(),
      config: {
        regressionBuilds: slot.config.regressionBuilds,
        postReleaseNotes: slot.config.postReleaseNotes,
        automationBuilds: slot.config.automationBuilds,
        automationRuns: slot.config.automationRuns,
      }
    };
  });
}

/**
 * Convert backend's date-based slots back to config's offset-based format (for editing)
 * Useful if user wants to edit slots in offset format
 */
function convertBackendSlotsToConfig(
  backendSlots: RegressionBuildSlotBackend[],
  kickOffDate: Date
): RegressionSlot[] {
  return backendSlots.map((slot, index) => {
    const slotDate = new Date(slot.date);
    const offsetDays = Math.floor(
      (slotDate.getTime() - kickOffDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return {
      id: `slot-${index}`,
      name: slot.config.name || `Slot ${index + 1}`,
      regressionSlotOffsetFromKickoff: offsetDays,
      time: slotDate.toTimeString().slice(0, 5),  // HH:MM
      config: slot.config
    };
  });
}
```

**Key Points**:
- Config slots are **offset-based** (days from kickoff)
- Backend expects **absolute dates** (ISO strings)
- Conversion happens when user provides kickoff/target dates
- If user changes dates, slots are recalculated automatically

#### 3.3 Updated Release Details Form
**File**: `app/components/ReleaseCreation/ReleaseDetailsForm.tsx` (refactor)

**Changes**:
1. Replace `releaseTargets` (boolean object) with `platformTargets` (array)
2. Use `PlatformTargetsSelector` component
3. Remove separate `platformVersions` - integrate into selector
4. Pre-fill `baseBranch` from config
5. Pre-fill `platformTargets` from config

**Pre-fill Logic**:
```typescript
// When config is selected
useEffect(() => {
  if (config) {
    // Pre-fill baseBranch
    onChange({
      ...details,
      baseBranch: config.baseBranch || defaultBranch,
    });
    
    // Pre-fill platformTargets from config
    const platformTargets: PlatformTargetWithVersion[] = [];
    
    // Map config targets to platformTargets
    config.targets.forEach(target => {
      if (target === 'WEB') {
        platformTargets.push({
          platform: 'WEB',
          target: 'WEB',
          version: defaultVersion,  // From config or generate
        });
      } else if (target === 'PLAY_STORE') {
        platformTargets.push({
          platform: 'ANDROID',
          target: 'PLAY_STORE',
          version: defaultVersion,
        });
      } else if (target === 'APP_STORE') {
        platformTargets.push({
          platform: 'IOS',
          target: 'APP_STORE',
          version: defaultVersion,
        });
      }
    });
    
    onChange({
      ...details,
      platformTargets,
    });
    
    // Note: Regression slots will be pre-filled when user provides dates
    // They are offset-based in config, converted to absolute dates using user's kickoff/target dates
  }
}, [config]);

// Separate effect to update regression slots when dates change
useEffect(() => {
  if (config?.scheduling?.regressionSlots && kickOffDate && targetReleaseDate) {
    const regressionBuildSlots = convertConfigSlotsToBackend(
      config.scheduling.regressionSlots,
      new Date(kickOffDate),
      new Date(targetReleaseDate)
    );
    onChange({
      ...details,
      regressionBuildSlots,
    });
  }
}, [kickOffDate, targetReleaseDate, config]);
```

#### 3.4 Updated Scheduling Panel
**File**: `app/components/ReleaseCreation/ReleaseSchedulingPanel.tsx` (refactor)

**Changes**:
1. Use `RegressionSlotsManager` component
2. Accept dates as ISO strings (not separate date + time)
3. Convert dates to ISO format before sending

**Date Handling**:
```typescript
// Combine date + time to ISO string
function combineDateAndTime(date: string, time?: string): string {
  const dateObj = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':');
    dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  return dateObj.toISOString();
}

// Usage
const kickOffDateISO = combineDateAndTime(kickoffDate, kickoffTime);
const targetReleaseDateISO = combineDateAndTime(releaseDate, releaseTime);
```

---

### Phase 4: Update Main Create Release Page

#### 4.1 Update State Management
**File**: `app/routes/dashboard.$org.releases.create.tsx`

**Changes**:
1. Replace `ReleaseBasicDetails` with backend-compatible state
2. Update form submission to send backend format directly
3. Remove transformation logic

**New State Structure**:
```typescript
interface ReleaseCreationState {
  // Basic Info
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  platformTargets: PlatformTargetWithVersion[];
  releaseConfigId?: string;
  baseBranch: string;
  
  // Dates (ISO strings)
  kickOffDate: string;
  targetReleaseDate: string;
  kickOffReminderDate?: string;
  
  // Optional
  branch?: string;
  baseReleaseId?: string;
  hasManualBuildUpload?: boolean;
  
  // Regression Slots
  regressionBuildSlots?: RegressionBuildSlotBackend[];
  regressionTimings?: string;
  
  // Cron Config
  cronConfig?: CronConfig;
  
  // Custom Integration Configs
  customIntegrationConfigs?: Record<string, unknown>;
}
```

#### 4.2 Pre-fill from Config
**Logic**: Pre-fill baseBranch, platformTargets, and regression slots from config. Regression slots are offset-based in config, so they're converted to absolute dates using user-provided kickoff and target release dates.

**Logic**:
```typescript
useEffect(() => {
  if (selectedConfig) {
    // Pre-fill baseBranch
    setBaseBranch(selectedConfig.baseBranch || defaultBranch);
    
    // Pre-fill platformTargets
    const platformTargets = convertConfigTargetsToPlatformTargets(
      selectedConfig.targets,
      defaultVersion  // Generate or use latest
    );
    setPlatformTargets(platformTargets);
    
    // Pre-fill regression slots from config (when user provides dates)
    // Slots are offset-based in config, converted to absolute dates
    if (kickOffDate && targetReleaseDate && selectedConfig.scheduling?.regressionSlots) {
      const regressionBuildSlots = convertConfigSlotsToBackend(
        selectedConfig.scheduling.regressionSlots,
        new Date(kickOffDate),
        new Date(targetReleaseDate)
      );
      setRegressionBuildSlots(regressionBuildSlots);
    }
    
    // Pre-fill cronConfig from config
    const cronConfig: CronConfig = {
      kickOffReminder: selectedConfig.scheduling?.kickoffReminder ?? true,
      preRegressionBuilds: selectedConfig.workflows.some(
        w => w.environment === 'PRE_REGRESSION'
      ),
      automationBuilds: false,  // From config if available
      automationRuns: false,    // From config if available
    };
    setCronConfig(cronConfig);
  }
}, [selectedConfig, kickOffDate, targetReleaseDate]);
```

#### 4.3 Form Submission
**Direct Backend Format**:
```typescript
const handleSubmit = async () => {
  // Validation
  if (platformTargets.length === 0) {
    showErrorToast('At least one platform target is required');
    return;
  }
  
  // Prepare backend-compatible payload
  const payload: CreateReleaseBackendRequest = {
    type,
    platformTargets,
    releaseConfigId: selectedConfigId!,
    baseBranch,
    kickOffDate,
    targetReleaseDate,
    kickOffReminderDate,
    branch,
    baseReleaseId,
    hasManualBuildUpload,
    regressionBuildSlots,
    regressionTimings,
    cronConfig,
    customIntegrationConfigs,
  };
  
  // Send directly to backend (via BFF, but no transformation)
  const result = await apiPost<{ success: boolean; release: any }>(
    `/api/v1/tenants/${org}/releases`,
    payload
  );
  
  if (result.success) {
    navigate(`/dashboard/${org}/releases/${result.data.release.id}`);
  }
};
```

---

### Phase 5: Update BFF Route

#### 5.1 Remove Transformation Logic
**File**: `app/routes/api.v1.tenants.$tenantId.releases.tsx`

**Changes**:
1. Remove `transformToReleaseCreationFormat` logic
2. Accept backend-compatible format directly
3. Forward to backend API as-is (or with minimal validation)

**New Action Handler**:
```typescript
export async function action({ request, params }: ActionFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ error: 'Tenant ID required' }, { status: 400 });
  }
  
  try {
    const body: CreateReleaseBackendRequest = await request.json();
    
    // Basic validation
    if (!body.type || !body.platformTargets || !body.baseBranch) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (body.platformTargets.length === 0) {
      return json({ error: 'At least one platform target is required' }, { status: 400 });
    }
    
    // Forward to backend API
    const backendUrl = `${BACKEND_API_URL}/tenants/${tenantId}/releases`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'userid': userId,  // From auth
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return json({ error: data.message || 'Failed to create release' }, { status: response.status });
    }
    
    return json({ success: true, release: data.release });
  } catch (error) {
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Validation Rules

### Required Fields
- `type`: Must be 'PLANNED' | 'HOTFIX' | 'UNPLANNED'
- `platformTargets`: Array with at least 1 item
- `releaseConfigId`: Must be provided
- `baseBranch`: Must be provided
- `kickOffDate`: Must be valid ISO date string, not in past
- `targetReleaseDate`: Must be valid ISO date string, not in past, after kickOffDate

### Platform Targets Validation
- Each `platformTarget` must have:
  - `platform`: 'ANDROID' | 'IOS' | 'WEB'
  - `target`: 'PLAY_STORE' | 'APP_STORE' | 'WEB'
  - `version`: String matching `vX.Y.Z` format
- At least 1 platformTarget required
- Platform-target combinations must be valid:
  - ANDROID → PLAY_STORE
  - IOS → APP_STORE
  - WEB → WEB

### Regression Slots Validation
- If provided, must be array
- Each slot must have:
  - `date`: Valid ISO date string
  - `config`: Object with boolean flags
- Slot dates must be between kickOffDate and targetReleaseDate

---

## Component Reusability

### Reusable Components
1. **RegressionSlotCard**: Extract from `SchedulingConfig.tsx`
   - Used in: Release Config Scheduling, Release Creation Scheduling
   
2. **PlatformSelector**: Already exists in `app/components/ReleaseConfig/TargetPlatform/PlatformSelector.tsx`
   - May need enhancement for version input

### New Components
1. **PlatformTargetsSelector**: New component for release creation
2. **RegressionSlotsManager**: New component for release creation (uses RegressionSlotCard)

---

## Pre-fill Logic Summary

### From Selected Config:
1. **baseBranch**: `config.baseBranch` → form field
2. **platformTargets**: `config.targets` → convert to `PlatformTargetWithVersion[]`
3. **regressionSlots**: `config.scheduling.regressionSlots` → convert offset-based slots to absolute dates using user-provided kickoff and target release dates
4. **cronConfig**: Derived from config workflows and settings

### User Must Provide:
- **kickOffDate**: User manually enters (required)
- **targetReleaseDate**: User manually enters (required)
- **kickOffReminderDate**: User optionally enters

**How Regression Slots Work**:
- Config stores slots as **offset-based** (e.g., "Day 2 at 09:00" = 2 days from kickoff)
- When user provides kickoff date and target release date, slots are converted to **absolute dates**
- Example: If config has "Day 2 at 09:00" and user sets kickoff = "2024-01-15", slot becomes "2024-01-17T09:00:00Z"
- User can still modify/add/remove slots after pre-fill

### User Can Modify:
- All pre-filled values are editable
- Can deselect platformTargets (but minimum 1 required)
- Can change baseBranch
- Can modify regression slots (add/remove/edit)
- Can change dates (which will recalculate regression slot dates)

---

## Migration Strategy

1. **Phase 1**: Create new types and components (parallel to existing)
2. **Phase 2**: Update create release page to use new components
3. **Phase 3**: Update BFF route to accept new format
4. **Phase 4**: Remove old transformation logic
5. **Phase 5**: Test and validate

---

## Testing Checklist

- [ ] Pre-fill from config works correctly
- [ ] Platform targets can be deselected (but minimum 1 enforced)
- [ ] Per-platform versions are captured correctly
- [ ] Regression slots convert correctly (config format → backend format)
- [ ] Dates are sent as ISO strings
- [ ] Validation errors are shown correctly
- [ ] Form submission sends backend-compatible format
- [ ] BFF route forwards to backend without transformation
- [ ] Backend accepts and processes the request correctly

---

## Files to Create/Modify

### New Files
1. `app/types/release-creation-backend.ts`
2. `app/components/ReleaseConfig/Scheduling/RegressionSlotCard.tsx` (extracted)
3. `app/components/ReleaseCreation/PlatformTargetsSelector.tsx`
4. `app/components/ReleaseCreation/RegressionSlotsManager.tsx`

### Modified Files
1. `app/components/ReleaseCreation/ReleaseDetailsForm.tsx`
2. `app/components/ReleaseCreation/ReleaseSchedulingPanel.tsx`
3. `app/routes/dashboard.$org.releases.create.tsx`
4. `app/routes/api.v1.tenants.$tenantId.releases.tsx`
5. `app/components/ReleaseConfig/Scheduling/SchedulingConfig.tsx` (use extracted component)

---

## Notes

- Backend expects dates as ISO strings (not separate date + time)
- Regression slots in backend are date-based (not offset-based like config)
- Platform targets must include version for each platform-target combination
- Minimum 1 platformTarget is required
- All pre-filled values should be clearly indicated (badges, tooltips)

