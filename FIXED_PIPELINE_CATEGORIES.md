# Fixed Pipeline Categories Feature

## Overview
The build pipeline configuration has been redesigned with two major improvements:

1. **Two-Level Platform Selection**: Clear separation between platforms (Android/iOS) and distribution targets (Play Store/App Store/Firebase/etc.)
2. **Fixed Pipeline Categories**: Structured pipeline configuration based on selected distribution targets, replacing the previous dynamic approach

This architecture provides:
- **Clarity**: Users understand that iOS ≠ App Store (there could be other iOS distribution methods)
- **Scalability**: Easy to add new distribution targets (Firebase, TestFlight standalone, etc.)
- **Validation**: Enforces required pipelines per distribution target

## Architecture: Platform vs Distribution Target

### Key Concept
```
Platform (OS)  →  Distribution Targets  →  Build Pipelines
     ↓                    ↓                      ↓
  Android      →     Play Store       →  Pre-Regression (optional)
                                       →  Regression (required)
                                       
               →     Firebase          →  Pre-Regression (optional)
                                       →  Regression (required)
                                       
     iOS       →     App Store        →  Pre-Regression (optional)
                                       →  Regression (required)
                                       →  TestFlight (required)
                                       
               →     TestFlight Only   →  TestFlight (required)
```

### Why This Matters
- **Platform** is the device OS - cannot change (Android or iOS)
- **Distribution Target** is where the app goes - can have multiple per platform
- **Build Pipelines** are specific to each distribution target

### Current Implementation
Currently only 2 distribution targets are active:
- Android → Play Store
- iOS → App Store

But the UI and data structure support future additions like Firebase, TestFlight standalone, Enterprise Distribution, etc.

## Pipeline Categories

### For Android → Play Store
1. **Pre-Regression** (Optional)
   - Optional pre-regression build before main testing
   - Can be skipped if not needed

2. **Regression** (Required ⚠️)
   - Main regression build for Play Store release
   - **MANDATORY** for Play Store distribution

### For iOS → App Store
1. **Pre-Regression** (Optional)
   - Optional pre-regression build before main testing
   - Can be skipped if not needed

2. **Regression** (Required ⚠️)
   - Main regression build for App Store release
   - **MANDATORY** for iOS releases

3. **TestFlight** (Required ⚠️)
   - TestFlight build for App Store distribution
   - **MANDATORY** for iOS releases

## Key Changes

### 1. New Component: FixedPipelineCategories
**Location:** `app/components/ReleaseConfig/BuildPipeline/FixedPipelineCategories.tsx`

**Features:**
- Shows all relevant pipeline categories based on selected target platforms
- Each category displays as a card with:
  - Category name and description
  - Required/Optional badge
  - Configured/Not Configured status
  - "Add Pipeline" button (if not configured)
  - Pipeline details and Edit/Remove buttons (if configured)
- Real-time validation shows missing required pipelines
- Cannot remove required pipelines

### 2. Updated Component: PipelineEditModal
**Changes:**
- Added `fixedPlatform` and `fixedEnvironment` props
- Platform and Environment fields are disabled when values are fixed
- Shows helpful description: "Platform is fixed for this category"
- Prevents users from changing the category type during editing

### 3. Enhanced Validation
**Location:** `app/utils/release-config-storage.ts`

**Updated Function:** `validateBuildPipelines(pipelines, targetPlatforms)`
- Now accepts `targetPlatforms` parameter
- Validates based on selected platforms:
  - If Android (WEB or PLAY_STORE) selected → Android Regression required
  - If iOS (APP_STORE) selected → iOS Regression + TestFlight required
- Ensures all required pipelines are configured and enabled

### 4. Wizard Integration
**Location:** `app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx`

**Changes:**
- Replaced `PipelineList` with `FixedPipelineCategories`
- Updated `canProceedFromStep` to validate required pipelines
- Users cannot proceed to next step if required pipelines are missing

## User Experience Flow

### Step 1: Select Platforms & Distribution Targets
**Two-level selection for better clarity and future scalability:**

**Level 1: Select Platforms**
- [ ] Android
- [ ] iOS

**Level 2: Select Distribution Targets (per platform)**
- Android targets:
  - [x] Google Play Store (available now)
  - [ ] Firebase App Distribution (coming soon)
- iOS targets:
  - [x] Apple App Store (available now)
  - [ ] TestFlight Standalone (coming soon)

This architecture makes it clear that:
- **Platform** = The device OS (Android/iOS)
- **Distribution Target** = Where the app will be distributed (Play Store, App Store, Firebase, etc.)

Currently, there's a 1:1 mapping (Android → Play Store, iOS → App Store), but this design supports future expansion.

### Step 2: Configure Build Pipelines
Based on selected distribution targets, user sees relevant pipeline categories:

**Example: Both Android and iOS selected**
```
┌─────────────────────────────────────────────┐
│ Android Pre-Regression          [Optional]  │
│ Optional pre-regression build               │
│ [Add Pipeline]                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Android Regression             [Required ⚠️] │
│ Main regression build                       │
│ [Add Pipeline]                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ iOS Pre-Regression             [Optional]   │
│ Optional pre-regression build               │
│ [Add Pipeline]                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ iOS Regression                 [Required ⚠️] │
│ Main regression build                       │
│ [Add Pipeline]                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ iOS TestFlight                 [Required ⚠️] │
│ TestFlight build                            │
│ [Add Pipeline]                              │
└─────────────────────────────────────────────┘
```

### Step 3: Add Pipeline Details
When clicking "Add Pipeline":
1. Modal opens with Platform and Environment **pre-filled and locked**
2. User configures:
   - Pipeline name
   - Build provider (Jenkins/GitHub Actions/Manual)
   - Provider-specific settings
3. Saves and returns to categories view

### Step 4: Validation
- Red alert shows if required pipelines are missing
- "Next" button is disabled until all required pipelines are configured
- Green checkmark shows when category is configured

## Benefits

### 1. Clearer User Experience
- Users know exactly what pipelines are needed
- No confusion about which environments to create
- Required vs Optional is clearly marked

### 2. Better Validation
- Cannot proceed without required pipelines
- Cannot accidentally skip TestFlight for iOS
- Real-time feedback on missing configurations

### 3. Prevents Errors
- Fixed platform/environment prevents misconfiguration
- Cannot create duplicate pipelines for same category
- Required pipelines cannot be deleted

### 4. Improved Maintainability
- Pipeline structure is standardized
- Easy to add/modify categories in future
- Validation logic is centralized

## Technical Details

### Data Structure
Pipeline data remains the same:
```typescript
interface BuildPipelineJob {
  id: string;
  name: string;
  platform: 'ANDROID' | 'IOS';
  environment: 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT';
  provider: 'JENKINS' | 'GITHUB_ACTIONS' | 'MANUAL_UPLOAD';
  providerConfig: JenkinsConfig | GitHubActionsConfig | ManualUploadConfig;
  enabled: boolean;
  timeout?: number;
  retryAttempts?: number;
}
```

### Category Definition
```typescript
interface PipelineCategory {
  id: string;
  platform: 'ANDROID' | 'IOS';
  environment: 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT';
  label: string;
  description: string;
  required: boolean;
}
```

## Migration Notes

### For Existing Configurations
- Old configurations will continue to work
- Validation will check for required pipelines
- Users may need to add missing required pipelines

### For New Configurations
- Must configure all required pipelines
- Optional pipelines can be skipped
- Clear visual guidance throughout process

## Adding New Distribution Targets

### Example: Adding Firebase App Distribution for Android

**Step 1: Update PlatformSelector.tsx**
```typescript
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
    {
      id: 'FIREBASE',
      name: 'Firebase App Distribution',
      description: 'Internal distribution via Firebase',
      available: true, // Changed from false
    },
  ],
}
```

**Step 2: Update TypeScript Types**
```typescript
// app/types/release-config.ts
export type TargetPlatform = 'PLAY_STORE' | 'APP_STORE' | 'FIREBASE';
```

**Step 3: Update FixedPipelineCategories**
Add pipeline categories for Firebase (if different from Play Store).

**Step 4: Update Validation Logic**
Add Firebase-specific validation rules if needed.

That's it! The two-level architecture makes adding new targets straightforward.

## Future Enhancements

1. **Custom Categories**: Allow admins to define custom pipeline categories per distribution target
2. **Conditional Requirements**: Make pipelines optional/required based on org settings
3. **Pipeline Templates**: Pre-fill common configurations for specific distribution targets
4. **Batch Configuration**: Configure multiple pipelines at once
5. **Pipeline Dependencies**: Define execution order and dependencies
6. **Distribution-Specific Settings**: Different pipeline requirements per target (e.g., Firebase may not need TestFlight)

## Testing

### Test Scenarios

1. **Android Only**
   - Select WEB platform
   - Should show 2 categories (Pre-Regression optional, Regression required)
   - Cannot proceed without configuring Regression

2. **iOS Only**
   - Select APP_STORE platform
   - Should show 3 categories (Pre-Regression optional, Regression + TestFlight required)
   - Cannot proceed without configuring both required pipelines

3. **Both Platforms**
   - Select PLAY_STORE and APP_STORE
   - Should show 5 categories total
   - Must configure: Android Regression, iOS Regression, iOS TestFlight

4. **Edit Existing Pipeline**
   - Click Edit on configured pipeline
   - Platform and Environment should be disabled
   - Can modify name, provider, and settings

5. **Remove Optional Pipeline**
   - Pre-Regression pipelines should have Remove button
   - Required pipelines should NOT have Remove button

## Validation Error Messages

### Missing Required Pipelines
```
⚠️ Required pipelines missing:
- Android Regression
- iOS TestFlight
```

### No Platforms Selected
```
⚠️ Please select target platforms first (previous step) to configure build pipelines.
```

### Invalid Provider Configuration
```
❌ Pipeline [Name]: Jenkins job URL is required
❌ Pipeline [Name]: GitHub Actions workflow path is required
```

## Files Modified

1. `app/components/ReleaseConfig/BuildPipeline/FixedPipelineCategories.tsx` (NEW)
2. `app/components/ReleaseConfig/BuildPipeline/PipelineEditModal.tsx`
3. `app/components/ReleaseConfig/Wizard/ConfigurationWizard.tsx`
4. `app/utils/release-config-storage.ts`

## Backwards Compatibility

✅ Fully backwards compatible with existing configurations
✅ Validation enhanced but not breaking
✅ API endpoints unchanged
✅ Data structure unchanged

