# 📋 Backend Test Management Config Flow - Complete Analysis

## 🎯 Overview

Understanding how test management configuration works in the backend to align the frontend UI properly.

---

## 🏗️ Backend Architecture

### **1. Metadata Endpoints** (Checkmate-specific)

These endpoints fetch dynamic data from Checkmate API:

```
Base Path: /test-management/integrations/:integrationId/checkmate/metadata/

GET /projects                    → List all Checkmate projects
GET /sections?projectId=X        → List sections for project
GET /labels?projectId=X          → List labels for project  
GET /squads?projectId=X          → List squads for project
```

**Controller**: `checkmate-metadata.controller.ts`  
**Purpose**: Proxy requests to Checkmate API (secure, doesn't expose credentials)

---

### **2. Test Management Config CRUD**

Main configuration management endpoints:

```
Base Path: /test-management/

POST   /projects/:projectId/configs     → Create new config
GET    /projects/:projectId/configs     → List all configs for project
GET    /configs/:id                     → Get specific config
PUT    /configs/:id                     → Update config
DELETE /configs/:id                     → Delete config
```

---

## 📊 Data Model

### **Test Management Config Structure**

```typescript
TestManagementConfig {
  id: string;                              // Auto-generated UUID
  projectId: string;                       // Delivr project ID
  integrationId: string;                   // Reference to test management integration
  name: string;                            // Config name (e.g., "iOS Regression Config")
  passThresholdPercent: number;            // Min pass % (0-100)
  platformConfigurations: PlatformConfiguration[];
  createdByAccountId: string | null;       // Who created it
  createdAt: Date;
  updatedAt: Date;
}
```

### **Platform Configuration** (The Key Part!)

```typescript
PlatformConfiguration {
  platform: TestPlatform;                  // 'IOS' | 'ANDROID_WEB' | 'ANDROID_PLAYSTORE'
  parameters: Record<string, unknown>;     // ⬅️ FLEXIBLE JSONB FIELD
}
```

**The `parameters` field is where ALL the Checkmate-specific settings go!**

Example `parameters` object:
```typescript
{
  sectionIds: [1, 2, 3],          // Checkmate section IDs
  labelIds: [10, 11],             // Checkmate label IDs
  squadIds: [5, 6],               // Checkmate squad IDs
  filterType: 'AND',              // How to combine filters
  // Any other provider-specific parameters
}
```

---

## 🔄 Complete Backend Flow

### **Step 1: User Selects Integration**

```
Frontend → GET /test-management/integrations/:integrationId/checkmate/metadata/projects
Backend → Fetch from Checkmate API
Response:
{
  data: {
    projectsList: [
      { projectId: 101, projectName: "Mobile App", ... }
    ]
  }
}
```

### **Step 2: User Selects Project** 

```
Frontend → GET /test-management/integrations/:integrationId/checkmate/metadata/sections?projectId=101
         → GET /test-management/integrations/:integrationId/checkmate/metadata/labels?projectId=101
         → GET /test-management/integrations/:integrationId/checkmate/metadata/squads?projectId=101

Backend → Fetch all three in parallel from Checkmate API
Response: Arrays of sections, labels, squads
```

### **Step 3: User Configures Platforms**

User selects:
- Platform: `IOS`
- Sections: `[1, 2, 3]`
- Labels: `[10, 11]`
- Squads: `[5]`
- Filter Type: `AND`

### **Step 4: User Saves Config**

```
Frontend → POST /test-management/projects/:projectId/configs

Request Body:
{
  "integrationId": "integration-abc-123",
  "name": "iOS Regression Config",
  "passThresholdPercent": 95,
  "platformConfigurations": [
    {
      "platform": "IOS",
      "parameters": {
        "sectionIds": [1, 2, 3],
        "labelIds": [10, 11],
        "squadIds": [5],
        "filterType": "AND"
      }
    },
    {
      "platform": "ANDROID_PLAYSTORE",
      "parameters": {
        "sectionIds": [1, 2],
        "labelIds": [10],
        "squadIds": [5, 6],
        "filterType": "OR"
      }
    }
  ]
}

Backend Validation:
1. ✅ Validate projectId exists
2. ✅ Validate integrationId exists
3. ✅ Validate integration belongs to project
4. ✅ Validate name is provided
5. ✅ Validate passThresholdPercent (0-100)
6. ✅ Validate platformConfigurations is array

Backend Create:
- Generates UUID for config
- Sets createdAt, updatedAt
- Saves to database (test_management_configs table)

Response:
{
  "success": true,
  "data": {
    "id": "config-xyz-789",
    "projectId": "project-123",
    "integrationId": "integration-abc-123",
    "name": "iOS Regression Config",
    "passThresholdPercent": 95,
    "platformConfigurations": [...],
    "createdAt": "2025-11-21T10:00:00Z",
    "updatedAt": "2025-11-21T10:00:00Z"
  }
}
```

---

## ✅ What the Frontend Should Do

### **Simplified UI Flow**

```
┌─────────────────────────────────────────────────────┐
│  1. Select Integration                              │
│     → Fetch projects from Checkmate                 │
└────────────┬────────────────────────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────┐
│  2. Select Project                                  │
│     → Fetch sections, labels, squads                │
└────────────┬────────────────────────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────┐
│  3. Configure Settings                              │
│     a) Config Name                                  │
│     b) Pass Threshold %                             │
│     c) Platform Configurations (add multiple):      │
│        - Select Platform (IOS/ANDROID_*)            │
│        - Select Sections (multiselect)              │
│        - Select Labels (multiselect)                │
│        - Select Squads (multiselect)                │
│        - Select Filter Type (AND/OR)                │
└────────────┬────────────────────────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────┐
│  4. Save Config                                     │
│     → POST to backend with proper structure          │
└─────────────────────────────────────────────────────┘
```

### **Key Changes Needed in Frontend**

1. **Remove `rules` completely** - Not in backend schema
2. **Simplify platform configuration** to match backend:
   - platform: TestPlatform enum
   - parameters: object with sectionIds, labelIds, squadIds, filterType

3. **Update type mappings**:
   ```typescript
   // Frontend platforms should map to backend TestPlatform enum:
   'IOS_APP_STORE' → 'IOS'
   'ANDROID_PLAY_STORE' → 'ANDROID_PLAYSTORE'
   'IOS_TESTFLIGHT' → 'IOS' (same as App Store)
   'ANDROID_INTERNAL_TESTING' → 'ANDROID_WEB'
   ```

4. **Form submission structure**:
   ```typescript
   {
     integrationId: string,
     name: string,
     passThresholdPercent: number,
     platformConfigurations: [
       {
         platform: 'IOS',
         parameters: {
           sectionIds: number[],
           labelIds: number[],
           squadIds: number[],
           filterType: 'AND' | 'OR'
         }
       }
     ]
   }
   ```

---

## 🚫 What to Remove from Frontend

1. ❌ `rules` object (maxFailedTests, maxUntestedCases, requireAllPlatforms, allowOverride)
2. ❌ `type: 'CHECKMATE'` field (not in backend)
3. ❌ `workspaceId` as separate field (can be in parameters if needed)
4. ❌ `autoCreateRuns` field (not in current backend schema)
5. ❌ `runNameTemplate` field (not in current backend schema)

---

## 📝 Summary

**What Backend Actually Needs:**
- integrationId ✅
- name ✅
- passThresholdPercent ✅
- platformConfigurations[] ✅
  - platform (enum) ✅
  - parameters (flexible object) ✅

**Frontend Should:**
1. Use dummy data for development (already done ✅)
2. Remove `rules` logic (in progress)
3. Simplify form to match backend schema
4. Map frontend platform names to backend TestPlatform enum
5. Package sections/labels/squads into `parameters` object

---

**Status**: Analysis Complete 📊  
**Next Step**: Simplify frontend UI to match backend schema  
**Date**: November 21, 2025

