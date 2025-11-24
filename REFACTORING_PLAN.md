# Release Config Refactoring Plan

## Objective
Centralize all types, interfaces, and constants to eliminate code duplication and improve maintainability.

## Current Problems

### 1. **Hardcoded Type Literals**
Components are using hardcoded type literals instead of referencing centralized types:
- `'ANDROID' | 'IOS'` repeated 6+ times → Should use `Platform` type
- `'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT'` → Should use `BuildEnvironment` type
- Many interfaces defined directly in components

### 2. **Component Interfaces Not Centralized**
Found 35+ component prop interfaces scattered across components:
- Should be moved to `app/types/release-config-props.ts`
- Makes it hard to maintain consistency
- Difficult to reuse types

### 3. **Magic Strings and Values**
- Hardcoded strings like "TestFlight", "Jenkins", error messages
- Should come from centralized constants

## Refactoring Strategy

### Phase 1: Create Centralized Type Files

#### File: `app/types/release-config-props.ts` (NEW)
Move all component prop interfaces here, organized by feature:

```typescript
// Wizard Components
export interface ConfigurationWizardProps { ... }
export interface WizardNavigationProps { ... }
export interface BasicInfoFormProps { ... }

// Pipeline Components  
export interface PipelineEditModalProps { ... }
export interface FixedPipelineCategoriesProps { ... }
export interface PipelineListProps { ... }

// etc.
```

#### File: `app/types/release-config-constants.ts` (NEW)
Export const enums and literal values:

```typescript
export const PLATFORMS = {
  ANDROID: 'ANDROID',
  IOS: 'IOS',
} as const;

export const BUILD_ENVIRONMENTS = {
  PRE_REGRESSION: 'PRE_REGRESSION',
  REGRESSION: 'REGRESSION',
  TESTFLIGHT: 'TESTFLIGHT',
} as const;

export const PROVIDERS = {
  JENKINS: 'JENKINS',
  GITHUB_ACTIONS: 'GITHUB_ACTIONS',
} as const;
```

### Phase 2: Update Existing Types

#### File: `app/types/release-config.ts`
Ensure all types reference centralized constants:

```typescript
// BEFORE
export type Platform = 'ANDROID' | 'IOS';

// AFTER  
import { PLATFORMS } from './release-config-constants';
export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];
```

### Phase 3: Create String Constants File

#### File: `app/constants/release-config-messages.ts` (NEW)
```typescript
export const MESSAGES = {
  ERRORS: {
    PLATFORM_NOT_SELECTED: 'Please select platforms first',
    // ...
  },
  LABELS: {
    TESTFLIGHT: 'TestFlight',
    JENKINS: 'Jenkins',
    // ...
  },
};
```

### Phase 4: Update Components

1. Remove local interface definitions
2. Import from `~/types/release-config-props`
3. Replace hardcoded literals with imported constants
4. Replace magic strings with constants

## Implementation Order

1. ✅ Commit current changes (DONE)
2. Create `app/types/release-config-constants.ts`
3. Create `app/types/release-config-props.ts`
4. Create `app/constants/release-config-messages.ts`
5. Update components one by one
6. Run linter and fix errors
7. Test all functionality
8. Commit refactored code

## Files to Modify (35+ files)

### High Priority (Core types used everywhere)
- FixedPipelineCategories.tsx
- PipelineEditModal.tsx
- ConfigurationWizard.tsx
- CheckmateConfigFormEnhanced.tsx

### Medium Priority (Feature-specific)
- All Pipeline components
- All Scheduling components
- All Test Management components
- All Communication components

### Low Priority (Simple components)
- Card components
- Selector components
- Display-only components

