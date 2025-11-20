# Release Creation Flow - Complete Implementation

## 🎯 Overview

This document describes the complete implementation of the new release creation flow based on the updated requirements.

## 📋 Implementation Summary

### **New Flow Structure**

The release creation now follows a 5-step wizard:

1. **Select Configuration** - Choose a release configuration template
2. **Release Details** - Version, type, targets, and base branch
3. **Scheduling** - Timeline and regression build slots
4. **Configure** - Optional feature toggles (simplified)
5. **Review** - Final review before creation

---

## 🗂️ Files Created/Modified

### **Types**
- ✅ `app/types/release-creation.ts` - Updated with new structure
  - `ReleaseBasicDetails` - Now includes scheduling, targets, branch
  - `ReleaseCustomizations` - Simplified to 2 boolean toggles
  - `ReleaseValidationRules` - Validation constants

### **Components**

#### **New Components**
- ✅ `app/components/ReleaseCreation/ReleaseSchedulingPanel.tsx`
  - Handles release date/time, kickoff date/time
  - Regression build slots management with validations
  - Auto-calculates kickoff date (RD-2 days)
  
- ✅ `app/components/ReleaseCreation/ReleaseConfigurePanel.tsx`
  - Simplified configuration with only 2 toggles:
    - Enable Pre-Regression Builds (only if config has them)
    - Enable Checkmate (only if config has it)

#### **Updated Components**
- ✅ `app/components/ReleaseCreation/ReleaseDetailsForm.tsx`
  - Added version auto-generation (editable)
  - Release type prefilled from config (disabled)
  - Base branch prefilled (editable)
  - Release targets (Web, Play Store, App Store) from config
  - Removed date fields (moved to scheduling step)

- ✅ `app/components/ReleaseCreation/ReleaseReviewSummary.tsx`
  - Updated to show new structure
  - Shows scheduling details with regression slots
  - Shows release targets
  - Shows simplified customizations

### **Routes**
- ✅ `app/routes/dashboard.$org.releases.create.tsx`
  - Updated wizard steps (5 steps)
  - Added comprehensive validation logic
  - Updated state management
  - Updated submit handler with new data structure

---

## 📊 Data Flow

### **Step 1: Configuration Selection**
```typescript
// User selects a configuration
selectedConfigId: string
selectedConfig: ReleaseConfiguration
```

### **Step 2: Release Details**
```typescript
{
  version: "v1.2.0",              // Auto-generated, editable
  releaseType: "PLANNED",         // From config, disabled
  baseBranch: "main",             // From config, editable
  releaseTargets: {
    web: true,                    // From config options
    playStore: true,
    appStore: false
  },
  description: "..."              // Optional
}
```

### **Step 3: Scheduling**
```typescript
{
  releaseDate: "2025-12-01",      // Required
  releaseTime: "18:00",           // Optional (default: no)
  kickoffDate: "2025-11-29",      // Auto: RD-2 days, editable
  kickoffTime: "10:00",           // Optional
  hasRegressionBuilds: true,      // Toggle
  regressionBuildSlots: [         // If hasRegressionBuilds = true
    {
      id: "slot-1",
      name: "Slot 1",
      offsetDays: 1,              // Days before release
      time: "10:00",              // Build time
      config: { ... }
    }
  ]
}
```

### **Step 4: Configure**
```typescript
{
  enablePreRegressionBuilds: true,  // Only if config has pre-regression
  enableCheckmate: true              // Only if config has Checkmate
}
```

### **Step 5: Review & Submit**
Displays all information and submits to backend:

```typescript
POST /api/v1/tenants/:tenantId/releases
{
  tenantId: string,
  configId: string,
  basicDetails: { ... },
  customizations: { ... }
}
```

---

## ✅ Validations Implemented

### **Step 1: Configuration**
- ✅ Configuration must be selected

### **Step 2: Release Details**
- ✅ Version required (format: `v1.2.3`)
- ✅ Release type required
- ✅ Base branch required
- ✅ At least one release target must be selected

### **Step 3: Scheduling**
- ✅ Release date required & must be in future
- ✅ Kickoff date required & must be before release date
- ✅ If regression builds enabled, at least one slot required
- ✅ Each slot timing validated (must be between kickoff and release)

### **Step 4: Configure**
- ✅ No validation (optional step)

### **Step 5: Review**
- ✅ Final validation before submit

---

## 🧪 Testing Checklist

### **Navigation & Flow**
- [ ] Can navigate to create release page
- [ ] Wizard steps display correctly (5 steps)
- [ ] Cannot proceed without completing required fields
- [ ] Previous/Next buttons work correctly
- [ ] Can navigate back and forth between steps

### **Step 1: Configuration Selection**
- [ ] Configurations load correctly
- [ ] Can select a configuration
- [ ] Default configuration is pre-selected
- [ ] "Create New Config" button redirects correctly
- [ ] Shows warning if no configurations exist

### **Step 2: Release Details**
- [ ] Version auto-generates correctly
- [ ] Version is editable
- [ ] Release type is prefilled from config
- [ ] Release type is disabled
- [ ] Base branch is prefilled
- [ ] Base branch is editable
- [ ] Release targets are shown based on config
- [ ] Can select/deselect targets
- [ ] Validation: At least one target required
- [ ] Validation: Version format check

### **Step 3: Scheduling**
- [ ] Release date picker works
- [ ] Release time is optional (can add/remove)
- [ ] Kickoff date auto-calculates (RD-2 days)
- [ ] Kickoff date is editable
- [ ] Kickoff time is optional
- [ ] Regression builds toggle works
- [ ] When enabled, can add regression slots
- [ ] Slot date/time calculated correctly
- [ ] Slot validation works (must be between kickoff and release)
- [ ] Can edit slot name, offset, and time
- [ ] Can remove slots
- [ ] Validation: Dates must be in correct order

### **Step 4: Configure**
- [ ] Shows only available toggles based on config
- [ ] Pre-regression toggle only shown if config has it
- [ ] Checkmate toggle only shown if config has it
- [ ] Toggles default to enabled
- [ ] Warning messages show when disabled
- [ ] If no toggles available, shows info message

### **Step 5: Review**
- [ ] All details display correctly
- [ ] Configuration info shown
- [ ] Scheduling details shown with slots
- [ ] Customizations shown correctly
- [ ] Submit button enabled when valid
- [ ] Submit button disabled when invalid

### **Submit & Backend Integration**
- [ ] Data structure sent to backend is correct
- [ ] Success redirects to release page
- [ ] Error handling works
- [ ] Loading state shows during submit
- [ ] Cannot submit multiple times

### **Edge Cases**
- [ ] No configurations exist - shows warning
- [ ] Config with no pre-regression builds
- [ ] Config with no Checkmate
- [ ] Config with no toggles available
- [ ] Invalid dates (past, wrong order)
- [ ] No regression slots when enabled
- [ ] No release targets selected

### **Responsive Design**
- [ ] Layout works on desktop
- [ ] Layout works on tablet
- [ ] Layout works on mobile
- [ ] Wizard stepper is usable on all sizes

---

## 🔧 Configuration Requirements

For the flow to work properly, ensure:

1. **Release Configuration** exists with:
   - `releaseType` (PLANNED, HOTFIX, or PATCH)
   - `defaultTargets` (WEB, PLAY_STORE, APP_STORE)
   - `buildPipelines` (optional: PRE_REGRESSION environment)
   - `testManagement` (optional: Checkmate provider)
   - `jiraProject.projectKey` (for base branch)

2. **Backend API** supports:
   - `POST /api/v1/tenants/:tenantId/releases` with new data structure

---

## 🚀 Next Steps

### **Backend Integration**
The frontend is complete up to the BFF layer. Backend needs to:

1. ✅ Verify BFF routes exist:
   - `POST /api/v1/tenants/:tenantId/releases`
   
2. ❌ Backend API implementation:
   - Accept new data structure
   - Create release record
   - Handle scheduling
   - Handle customizations
   - Return release ID

### **Enhancements (Future)**
- [ ] Fetch latest version from API (currently hardcoded)
- [ ] Version validation against existing releases
- [ ] Duplicate release detection
- [ ] Save draft functionality
- [ ] Clone existing release
- [ ] Bulk regression slot creation
- [ ] Custom regression slot templates
- [ ] Release calendar view
- [ ] Conflict detection (overlapping releases)

---

## 📝 Notes

### **Design Decisions**

1. **Simplified Configure Step**: Reduced from multiple cards to just 2 toggles based on requirement.

2. **Scheduling Moved to Separate Step**: Separated from details for better UX and clearer structure.

3. **Auto-calculations**: 
   - Version auto-generates but is editable
   - Kickoff date defaults to RD-2 days but is editable

4. **Validation on Next**: Validation runs when clicking "Next" to prevent incomplete steps.

5. **Config-Driven Options**: Release targets and toggles are shown only if available in selected configuration.

### **Type Mapping**
- Backend `EMERGENCY` → Frontend `HOTFIX` (temporary mapping)
- This should be aligned in future releases

---

## 📞 Support

For issues or questions:
1. Check validation error messages
2. Review browser console for detailed logs
3. Verify configuration exists and is complete
4. Check backend API logs

---

**Status**: ✅ Frontend Implementation Complete  
**Last Updated**: November 20, 2025  
**Next**: Backend Integration Required

