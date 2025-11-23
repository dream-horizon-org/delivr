# Platform Mapper Integration Guide

## ✅ Solution: Dynamic Platform Mapping

Instead of hardcoding `ANDROID → ANDROID_PLAY_STORE`, we now **deduce it from selected platforms and targets** in Step 2.

---

## 🎯 How It Works

### Step 2: User selects targets
```
✅ PLAY_STORE (Android + Play Store)
✅ APP_STORE (iOS + App Store)
```

### Step 5 (Test Management): Auto-generate platform configs
```typescript
import { targetToTestPlatform, groupTargetsByPlatform } from '~/utils/platform-mapper';

// selectedTargets from Step 2: ['PLAY_STORE', 'APP_STORE']

// Transform for backend:
const testPlatforms = selectedTargets.map(target => ({
  platform: targetToTestPlatform(target), // 'ANDROID_PLAY_STORE', 'IOS_APP_STORE'
  parameters: {
    sectionIds: [...],
    labelIds: [...],
    squadIds: [...],
  }
}));
```

---

## 📝 Usage Examples

### Example 1: Transform Test Management Config

```typescript
import { targetToTestPlatform } from '~/utils/platform-mapper';
import type { ReleaseConfiguration } from '~/types/release-config';

function transformTestManagementConfig(
  config: ReleaseConfiguration,
  selectedTargets: TargetPlatform[]
) {
  const testManagement = config.testManagement;
  
  if (!testManagement?.enabled) return null;
  
  // Transform each platform config
  const platformConfigurations = testManagement.platformConfigurations.map(pc => ({
    platform: targetToTestPlatform(pc.platform), // ← Dynamic mapping!
    parameters: {
      sectionIds: pc.sectionIds || [],
      labelIds: pc.labelIds || [],
      squadIds: pc.squadIds || [],
      autoCreateRuns: true,
      filterType: "AND" as const,
    }
  }));
  
  return {
    tenantId: config.organizationId,
    integrationId: testManagement.integrationId,
    name: `Test Management for ${config.name}`,
    passThresholdPercent: testManagement.passThresholdPercent || 100,
    platformConfigurations,
    createdByAccountId: userId,
  };
}
```

### Example 2: Show Only Relevant Platform Cards

Update `CheckmateConfigFormEnhanced.tsx`:

```typescript
import { groupTargetsByPlatform, isAndroidTarget, isIOSTarget } from '~/utils/platform-mapper';

interface CheckmateConfigFormEnhancedProps {
  config: Partial<CheckmateSettings>;
  onChange: (config: CheckmateSettings) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
  selectedTargets: TargetPlatform[]; // ← NEW: Pass from wizard
}

export function CheckmateConfigFormEnhanced({
  config,
  onChange,
  availableIntegrations,
  selectedTargets, // ← NEW
}: CheckmateConfigFormEnhancedProps) {
  
  // Determine which platforms to show based on selected targets
  const hasAndroidTarget = selectedTargets.some(isAndroidTarget);
  const hasIOSTarget = selectedTargets.some(isIOSTarget);
  
  return (
    <Stack gap="lg">
      {/* ... Integration & Project selection ... */}
      
      {/* Platform-Specific Configurations */}
      <div>
        <Text fw={600} size="md" className="mb-3">
          Platform-Specific Test Configuration
        </Text>
        <Stack gap="md">
          {/* Only show Android card if Android target is selected */}
          {hasAndroidTarget && (
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group gap="xs" className="mb-3">
                <Badge color="green" size="lg" variant="filled">
                  Android
                </Badge>
                <Text size="sm" c="dimmed">
                  Configure test selection for Android builds
                </Text>
              </Group>
              {/* ... Android config fields ... */}
            </Card>
          )}
          
          {/* Only show iOS card if iOS target is selected */}
          {hasIOSTarget && (
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Group gap="xs" className="mb-3">
                <Badge color="blue" size="lg" variant="filled">
                  iOS
                </Badge>
                <Text size="sm" c="dimmed">
                  Configure test selection for iOS builds
                </Text>
              </Group>
              {/* ... iOS config fields ... */}
            </Card>
          )}
        </Stack>
      </div>
    </Stack>
  );
}
```

### Example 3: Update TestManagementStep

Update `TestManagementStep.tsx` to pass selected targets:

```typescript
import type { ReleaseConfiguration, TargetPlatform } from '~/types/release-config';

interface TestManagementStepProps {
  config: ReleaseConfiguration;
  onUpdate: (updates: Partial<ReleaseConfiguration>) => void;
  connectedIntegrations: Integration[];
}

export function TestManagementStep({ 
  config, 
  onUpdate, 
  connectedIntegrations 
}: TestManagementStepProps) {
  
  // Get selected targets from Step 2
  const selectedTargets: TargetPlatform[] = config.defaultTargets || [];
  
  return (
    <Stack gap="lg">
      {/* ... Enable/Disable switch ... */}
      
      {config.testManagement?.enabled && (
        <CheckmateConfigFormEnhanced
          config={config.testManagement}
          onChange={(testMgmtConfig) => onUpdate({ testManagement: testMgmtConfig })}
          availableIntegrations={checkmateIntegrations}
          selectedTargets={selectedTargets} // ← Pass selected targets
        />
      )}
    </Stack>
  );
}
```

### Example 4: BFF Transformer

Create `release-config-transformer.ts` in BFF:

```typescript
import { targetToTestPlatform } from '~/utils/platform-mapper';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { CreateReleaseConfigRequest } from './types';

export function transformToBackendPayload(
  config: ReleaseConfiguration,
  userId: string
): CreateReleaseConfigRequest {
  
  return {
    tenantId: config.organizationId,
    name: config.name,
    description: config.description,
    releaseType: config.releaseType,
    isDefault: config.isDefault,
    platforms: getUniquePlatforms(config.defaultTargets), // ['ANDROID', 'IOS']
    defaultTargets: config.defaultTargets, // ['PLAY_STORE', 'APP_STORE']
    baseBranch: config.baseBranch,
    
    // Test Management (with dynamic platform mapping)
    testManagement: config.testManagement?.enabled ? {
      tenantId: config.organizationId,
      integrationId: config.testManagement.integrationId,
      name: `TCM Config for ${config.name}`,
      passThresholdPercent: config.testManagement.passThresholdPercent || 100,
      platformConfigurations: config.testManagement.platformConfigurations.map(pc => ({
        platform: targetToTestPlatform(
          config.defaultTargets.find(t => 
            getPlatformForTarget(t) === pc.platform
          )!
        ), // ← Maps ANDROID → ANDROID_PLAY_STORE dynamically
        parameters: {
          sectionIds: pc.sectionIds || [],
          labelIds: pc.labelIds || [],
          squadIds: pc.squadIds || [],
          autoCreateRuns: true,
          filterType: "AND",
        }
      })),
      createdByAccountId: userId,
    } : undefined,
    
    // Communication (Slack)
    communication: config.communication?.enabled ? {
      tenantId: config.organizationId,
      channelData: config.communication.slack?.channels || {},
    } : undefined,
    
    // Project Management (JIRA)
    projectManagement: config.jiraProject?.enabled ? {
      tenantId: config.organizationId,
      integrationId: config.jiraProject.integrationId,
      name: `PM Config for ${config.name}`,
      description: config.description || '',
      platformConfigurations: config.jiraProject.platformConfigurations.map(pc => ({
        platform: pc.platform, // ← JIRA uses simple ANDROID/IOS (no transformation)
        parameters: pc.parameters,
      })),
      createdByAccountId: userId,
    } : undefined,
    
    // Workflows
    workflows: config.workflows?.map(w => ({
      id: w.id || generateId(),
      tenantId: config.organizationId,
      providerType: w.provider,
      integrationId: w.integrationId,
      displayName: w.name,
      workflowUrl: w.url,
      platform: w.platform, // ← Workflows use simple ANDROID/IOS
      workflowType: w.type,
      parameters: w.config,
      createdByAccountId: userId,
    })),
    
    // Scheduling
    scheduling: config.scheduling ? {
      ...config.scheduling,
      regressionSlots: config.scheduling.regressionSlots?.map(slot => ({
        name: slot.name,
        regressionSlotOffsetFromKickoff: slot.regressionSlotOffsetFromKickoff,
        time: slot.time,
        config: {
          regressionBuilds: slot.regressionBuilds.includes('REGRESSION_BUILD'),
          postReleaseNotes: slot.regressionBuilds.includes('POST_RELEASE_NOTES'),
          automationBuilds: slot.regressionBuilds.includes('AUTOMATION_BUILD'),
          automationRuns: slot.regressionBuilds.includes('AUTOMATION_RUN'),
        }
      })),
    } : undefined,
  };
}

// Helper: Extract unique platforms from targets
function getUniquePlatforms(targets: TargetPlatform[]): Platform[] {
  return [...new Set(targets.map(getPlatformForTarget))];
}
```

---

## 🔄 Transformation Flow

```
┌─────────────────────────────────────────────┐
│ Step 2: Platform Selection                 │
│ User selects: PLAY_STORE, APP_STORE        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Step 5: Test Management                    │
│ Shows cards for: Android, iOS              │
│ User configures sections/labels/squads     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ BFF Transformer                             │
│ targetToTestPlatform('PLAY_STORE')          │
│   → 'ANDROID_PLAY_STORE'                    │
│ targetToTestPlatform('APP_STORE')           │
│   → 'IOS_APP_STORE'                         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Backend API                                 │
│ Receives: platformConfigurations: [         │
│   { platform: 'ANDROID_PLAY_STORE', ... }, │
│   { platform: 'IOS_APP_STORE', ... }        │
│ ]                                           │
└─────────────────────────────────────────────┘
```

---

## 🎯 Benefits

✅ **No Hardcoding**: Platform enums derived from user selection
✅ **Future-Proof**: When you add TESTFLIGHT or INTERNAL_TESTING targets, just update the map
✅ **Dynamic UI**: Only show relevant platform cards based on selection
✅ **Single Source of Truth**: Selected targets drive everything
✅ **Type-Safe**: Full TypeScript support with proper enums

---

## 🚀 Implementation Checklist

### Phase 1: Create Mapper (✅ Done!)
- [x] Create `app/utils/platform-mapper.ts`
- [x] Define `targetToTestPlatform()` function
- [x] Define helper functions (`isAndroidTarget`, `isIOSTarget`, etc.)

### Phase 2: Update Test Management Step
- [ ] Pass `selectedTargets` prop to `CheckmateConfigFormEnhanced`
- [ ] Use `hasAndroidTarget` and `hasIOSTarget` to conditionally render cards
- [ ] Remove hardcoded platform checks

### Phase 3: Update BFF Transformer
- [ ] Create `release-config-transformer.ts` in BFF
- [ ] Use `targetToTestPlatform()` for test management configs
- [ ] Keep simple `ANDROID`/`IOS` for workflows and project management

### Phase 4: Test
- [ ] Test with only Android (PLAY_STORE)
- [ ] Test with only iOS (APP_STORE)
- [ ] Test with both platforms
- [ ] Verify backend receives correct enums

---

## 🔮 Future: Adding New Targets

When you add TESTFLIGHT or INTERNAL_TESTING:

1. **Update `platform-mapper.ts`:**
```typescript
const TARGET_TO_TEST_PLATFORM_MAP = {
  PLAY_STORE: 'ANDROID_PLAY_STORE',
  APP_STORE: 'IOS_APP_STORE',
  TESTFLIGHT: 'IOS_TESTFLIGHT', // ← Add this
  INTERNAL_TESTING: 'ANDROID_INTERNAL_TESTING', // ← Add this
  WEB: 'ANDROID_PLAY_STORE',
};
```

2. **Update `TargetPlatform` type:**
```typescript
export type TargetPlatform = 
  | 'WEB' 
  | 'PLAY_STORE' 
  | 'APP_STORE'
  | 'TESTFLIGHT'          // ← Add this
  | 'INTERNAL_TESTING';   // ← Add this
```

3. **Update `PLATFORM_CONFIGS` constants:**
```typescript
targets: [
  { id: 'PLAY_STORE', name: 'Google Play Store', available: true },
  { id: 'INTERNAL_TESTING', name: 'Internal Testing', available: true }, // ← Add
]
```

**That's it!** The mapper handles the rest automatically. 🎉

---

## ✅ Summary

**Before:**
```typescript
// Hardcoded
platform: config.platform === 'ANDROID' ? 'ANDROID_PLAY_STORE' : 'IOS_APP_STORE'
```

**After:**
```typescript
// Dynamic based on selected targets
import { targetToTestPlatform } from '~/utils/platform-mapper';

platform: targetToTestPlatform(selectedTarget) // Deduced from Step 2!
```

**You now have a flexible, type-safe, future-proof platform mapping system!** 🚀

