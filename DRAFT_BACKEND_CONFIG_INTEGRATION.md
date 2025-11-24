# Draft + Backend Config Integration - Complete Solution

## ✅ Problem Solved
Support **both** draft configurations (localStorage) and backend configurations (MySQL) in a single unified list.

---

## 📊 Three Status Types

### 1. **DRAFT** (localStorage only)
- **Source:** Browser localStorage
- **Key:** `delivr_release_config_draft_{tenantId}`
- **Field:** `config.status === 'DRAFT'`
- **Color:** Gray badge
- **Actions:** Continue Editing, Delete Draft
- **Requirement:** Only shown if user has progressed past step 0 (clicked "Next" at least once)

### 2. **ACTIVE** (Backend)
- **Source:** MySQL database via backend API
- **Field:** `config.isActive === true`
- **Color:** Green badge
- **Actions:** Edit, Duplicate, Set as Default, Archive

### 3. **ARCHIVED** (Backend)
- **Source:** MySQL database via backend API  
- **Field:** `config.isActive === false`
- **Color:** Red badge
- **Actions:** Edit, Duplicate (Archive button disabled)

---

## 🔄 How It Works

### **Merging Draft with Backend Configs**

```typescript
// File: app/routes/dashboard.$org.releases.settings.tsx

const configurations = useMemo(() => {
  const backendConfigs = releaseConfigs; // From React Query cache
  
  // Load draft config from localStorage
  // ⚠️ IMPORTANT: Only show draft if user has progressed past step 0
  const draftKey = `delivr_release_config_draft_${org}`;
  const stepKey = `delivr_release_config_wizard_step_${org}`;
  let draftConfig = null;
  
  if (typeof window !== 'undefined') {
    try {
      const draftData = localStorage.getItem(draftKey);
      const savedStep = localStorage.getItem(stepKey);
      const currentStep = savedStep ? parseInt(savedStep, 10) : 0;
      
      // ✅ Only show draft if user clicked "Next" at least once (step > 0)
      if (draftData && currentStep > 0) {
        draftConfig = JSON.parse(draftData);
        draftConfig.status = 'DRAFT'; // Mark as draft
        draftConfig.isActive = false;
        draftConfig.id = draftConfig.id || 'draft-temp-id';
        console.log('Loaded draft config at step:', currentStep);
      } else if (draftData && currentStep === 0) {
        // ❌ User is still on step 0, don't show as draft
        console.log('Draft exists but user is on step 0, not showing');
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }
  
  // Merge draft with backend configs (draft first)
  return draftConfig ? [draftConfig, ...backendConfigs] : backendConfigs;
}, [releaseConfigs, org]);
```

**Draft Validation Rules:**
- ✅ **Valid Draft:** User has progressed to step 1+ → Shows in settings
- ❌ **Invalid Draft:** User is still on step 0 → Hidden from settings
- 📝 **Reason:** Step 0 (Basic Info) is just the name field. Meaningful progress requires clicking "Next"

**Result:** Single `configurations` array containing:
- 0 or 1 draft config (from localStorage)
- N backend configs (from API/cache)

---

## 📈 Stats Calculation

```typescript
const stats = {
  total: configurations.length, // All configs (draft + backend)
  active: configurations.filter(c => c.isActive === true).length, // Backend active
  draft: configurations.filter(c => c.status === 'DRAFT').length, // localStorage draft
  archived: configurations.filter(c => c.isActive === false && c.status !== 'DRAFT').length, // Backend archived
};
```

**Output Example:**
- Total: 5 configs
- Active: 3 configs
- Draft: 1 config
- Archived: 1 config

---

## 🔍 Filtering Logic

```typescript
// File: app/components/ReleaseConfig/Settings/ConfigurationList.tsx

const matchesStatus = !statusFilter || 
  (statusFilter === 'DRAFT' && config.status === 'DRAFT') ||                          // localStorage
  (statusFilter === 'ACTIVE' && config.isActive === true) ||                          // backend
  (statusFilter === 'ARCHIVED' && config.isActive === false && config.status !== 'DRAFT'); // backend
```

**Filter Options:**
- **All** - Shows all configs (draft + active + archived)
- **Active** - Shows only `isActive: true`
- **Draft** - Shows only `status: 'DRAFT'`
- **Archived** - Shows only `isActive: false` (excluding drafts)

---

## 🎨 Status Display

```typescript
// File: app/components/ReleaseConfig/Settings/ConfigurationListItem.tsx

const getStatusDisplay = (config: any) => {
  // Draft config (from localStorage)
  if (config.status === 'DRAFT') {
    return { label: 'DRAFT', color: 'gray' };
  }
  
  // Backend configs (from API)
  return config.isActive
    ? { label: 'ACTIVE', color: 'green' }
    : { label: 'ARCHIVED', color: 'red' };
};
```

**Badge Display:**
- 🔵 **DRAFT** - Gray badge (localStorage)
- 🟢 **ACTIVE** - Green badge (backend)
- 🔴 **ARCHIVED** - Red badge (backend)

---

## ⚙️ Menu Actions by Status

### **Draft Config**
```typescript
✅ Continue Editing  // Instead of "Edit Configuration"
✅ Export JSON
✅ Delete Draft      // Instead of "Archive"
❌ Set as Default    // Hidden for drafts
❌ Duplicate         // Hidden for drafts
```

### **Active Config**
```typescript
✅ Edit Configuration
✅ Set as Default (if not already default)
✅ Duplicate
✅ Export JSON
✅ Archive
```

### **Archived Config**
```typescript
✅ Edit Configuration
✅ Set as Default
✅ Duplicate
✅ Export JSON
❌ Archive (disabled - already archived)
```

---

## 🗑️ Delete/Archive Handlers

### **Delete Draft** (localStorage)
```typescript
const handleArchive = async (configId: string) => {
  const config = configurations.find(c => c.id === configId);
  const isDraft = config?.status === 'DRAFT';
  
  if (isDraft) {
    // Delete from localStorage
    const draftKey = `delivr_release_config_draft_${org}`;
    localStorage.removeItem(draftKey);
    
    // Trigger re-render
    invalidateReleaseConfigs();
    return;
  }
  
  // ... handle backend archival
};
```

### **Archive Config** (Backend)
```typescript
  // Archive backend config
  const response = await fetch(`/api/v1/tenants/${org}/release-config/${configId}`, {
    method: 'DELETE',
  });
  
  if (response.ok) {
    invalidateReleaseConfigs(); // Refresh cache
  }
```

---

## 📋 Draft Validation Examples

### **Example 1: Not a Valid Draft (Step 0)**
```
User Journey:
1. Opens Configuration Wizard
2. Types name: "My New Config"
3. Closes browser

localStorage State:
- draft_Vy3mYbVgmx: { name: "My New Config", ... }
- wizard_step_Vy3mYbVgmx: "0"

Settings Page:
❌ Draft NOT shown (step === 0)
✅ Stats: Draft: 0
```

### **Example 2: Valid Draft (Step 1+)**
```
User Journey:
1. Opens Configuration Wizard
2. Fills Basic Info (Step 0)
3. Clicks "Next" → Moves to Platforms (Step 1)
4. Selects platforms
5. Closes browser

localStorage State:
- draft_Vy3mYbVgmx: { name: "My Config", platforms: [...], ... }
- wizard_step_Vy3mYbVgmx: "1"

Settings Page:
✅ Draft shown (step > 0)
✅ Stats: Draft: 1
✅ Shows gray "DRAFT" badge
```

---

## 🔄 Complete User Flow

### **Scenario 1: Creating a Valid Draft**

1. User opens Configuration Wizard
2. Fills Basic Info (Step 0)
3. **Clicks "Next"** → Moves to Platforms (Step 1)
4. Starts filling Platforms step
5. **Auto-saves to localStorage** on every change (step = 1)
6. Closes browser
7. Returns to Settings page
8. **Sees draft config** with DRAFT badge (because step > 0)
9. Clicks "Continue Editing"
10. Resumes from saved step (Step 1)
11. Finishes and submits
12. **Draft deleted from localStorage**
13. **Config saved to backend**
14. **Cache invalidated and refetched**
15. **Draft disappears, Active config appears**

### **Scenario 1b: Not Showing Draft (Still on Step 0)**

1. User opens Configuration Wizard
2. Types name in Basic Info (Step 0)
3. **Does NOT click "Next"**
4. Closes browser
5. Returns to Settings page
6. **Draft NOT shown** (because step === 0)
7. Draft exists in localStorage but is hidden
8. If user opens wizard again, data is restored (can continue)

### **Scenario 2: Viewing All Configs**

1. User opens Settings page
2. **useMemo merges:**
   - 1 draft from localStorage
   - 5 backend configs from cache
3. **Total: 6 configs displayed**
4. Filter by "Draft" → **Shows 1 config**
5. Filter by "Active" → **Shows 4 configs**
6. Filter by "Archived" → **Shows 1 config**

### **Scenario 3: Deleting a Draft**

1. User sees draft config with DRAFT badge
2. Clicks menu → "Delete Draft"
3. Confirms deletion
4. **localStorage.removeItem()** called
5. **invalidateReleaseConfigs()** called
6. Component re-renders
7. **Draft no longer appears** in list

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SETTINGS PAGE LOAD                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            
┌───────────────────────────┬─────────────────────────────────┐
│   localStorage Draft      │    Backend Configs (Cache)      │
├───────────────────────────┼─────────────────────────────────┤
│ Key: draft_{tenantId}     │ Source: React Query             │
│ Status: 'DRAFT'           │ Field: isActive: true/false     │
│ Count: 0 or 1             │ Count: N configs                │
└───────────────────────────┴─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     useMemo() MERGE                          │
│  configurations = [draftConfig, ...backendConfigs]          │
│                                                              │
│  [                                                           │
│    { status: 'DRAFT', ... },           // localStorage       │
│    { isActive: true, ... },            // backend            │
│    { isActive: true, ... },            // backend            │
│    { isActive: false, ... },           // backend            │
│  ]                                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    FILTER & DISPLAY                          │
│  - Draft filter: status === 'DRAFT'                         │
│  - Active filter: isActive === true                         │
│  - Archived filter: isActive === false && status !== 'DRAFT'│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTIONS                              │
│                                                              │
│  Draft Config:                                              │
│    → Continue Editing (opens wizard)                        │
│    → Delete Draft (removes from localStorage)              │
│                                                              │
│  Backend Config:                                            │
│    → Edit (opens wizard with backend data)                 │
│    → Archive (calls backend DELETE API)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Files Modified

### 1. **dashboard.$org.releases.settings.tsx**
- ✅ Added `useMemo` import
- ✅ Added logic to load draft from localStorage
- ✅ Merged draft with backend configs
- ✅ Updated stats calculation for 3 statuses
- ✅ Updated `handleArchive` to handle draft deletion

### 2. **ConfigurationList.tsx**
- ✅ Restored "Draft" filter option
- ✅ Updated filtering logic to handle all 3 statuses
- ✅ Filters now correctly distinguish draft/active/archived

### 3. **ConfigurationListItem.tsx**
- ✅ Updated `getStatusDisplay()` to handle drafts
- ✅ Customized menu items for draft configs
- ✅ Shows "Continue Editing" for drafts
- ✅ Shows "Delete Draft" instead of "Archive"
- ✅ Hides "Set as Default" and "Duplicate" for drafts

---

## 🎯 Testing Checklist

- [x] Draft config appears in settings list
- [x] Draft shows gray "DRAFT" badge
- [x] Filter by "Draft" shows only draft
- [x] Filter by "Active" shows only active backend configs
- [x] Filter by "Archived" shows only archived backend configs
- [x] Stats show correct counts (draft, active, archived)
- [x] "Continue Editing" opens wizard with draft data
- [x] "Delete Draft" removes from localStorage
- [x] After deleting draft, list updates immediately
- [x] After submitting draft, it disappears and backend config appears
- [x] Backend configs show correct actions (Edit, Archive, etc.)

---

## 🚀 Benefits

1. ✅ **Seamless Integration** - Draft and backend configs in one list
2. ✅ **No Data Loss** - Drafts preserved in localStorage
3. ✅ **Clear Status** - Visual distinction (gray/green/red badges)
4. ✅ **Contextual Actions** - Different actions for drafts vs backend configs
5. ✅ **Accurate Stats** - Correct counts for all 3 types
6. ✅ **Proper Filtering** - Filter by draft/active/archived independently

---

## 📝 Summary

**Three Config Types:**
- 🔵 **DRAFT** → localStorage only, gray badge, "Continue Editing", "Delete Draft"
- 🟢 **ACTIVE** → Backend `isActive: true`, green badge, full actions
- 🔴 **ARCHIVED** → Backend `isActive: false`, red badge, limited actions

**Single Source:**
- Merged array = `[localStorage draft, ...React Query cached backend configs]`
- Filtering handles all 3 types correctly
- Stats calculated accurately across all sources

**Result:** Users can see and manage draft configs alongside backend configs in a unified, intuitive interface! 🎉

