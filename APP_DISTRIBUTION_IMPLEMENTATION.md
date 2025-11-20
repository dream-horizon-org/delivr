# App Distribution Integration Implementation

## Overview
Complete end-to-end BFF layer implementation for App Distribution integrations (Play Store, App Store), aligned with backend API structure.

---

## 🎯 Architecture

### Flow:
```
Frontend → BFF Layer → Backend (/integrations/store/*) → Store APIs
```

### Data Flow:
1. User configures distribution in Integrations page
2. BFF proxies to backend `/integrations/store/*`
3. Backend validates & stores credentials
4. `getTenantInfo` includes distributions
5. ConfigContext provides to Release Config

---

## 📁 Files Created/Modified

### 1. **Types** (`app/types/app-distribution.ts`)
Aligned with backend API structure:

```typescript
export type StoreType = 'play_store' | 'app_store';
export type Platform = 'ANDROID' | 'IOS';

export interface AppDistributionIntegration {
  integrationId: string;
  storeType: StoreType;
  tenantId: string;
  userId: string;
  platforms: Platform[]; // User-selected
  status: VerificationStatus;
  payload: PlayStorePayload | AppStorePayload;
}
```

#### Play Store Payload:
```typescript
{
  displayName: string;
  appIdentifier: string; // com.example.app
  serviceAccountJson: {
    type: string;
    project_id: string;
    client_email: string;
    private_key: string;
  };
  defaultTrack: 'internal' | 'alpha' | 'beta' | 'production';
}
```

#### App Store Payload:
```typescript
{
  displayName: string;
  targetAppId: string;
  appIdentifier: string; // com.example.app
  issuerId: string;
  keyId: string;
  privateKeyPem: string;
  teamName: string;
  defaultLocale: string;
}
```

---

### 2. **BFF Service** (`app/.server/services/.../app-distribution-integration.ts`)
Proxies to backend API:

#### Methods:
- `verifyStore()` - POST `/integrations/store/verify`
- `connectStore()` - PUT `/integrations/store/connect`
- `listIntegrations()` - GET `/integrations/store/:tenantId`
- `getIntegration()` - GET `/integrations/store/:tenantId/:integrationId`
- `deleteIntegration()` - DELETE `/integrations/store/:tenantId/:integrationId`

---

### 3. **BFF Routes** (`app/routes/api.v1.tenants.$tenantId.distributions.ts`)

#### Endpoints:

| Method | Endpoint | Backend Proxy | Purpose |
|--------|----------|--------------|---------|
| GET | `/api/v1/tenants/:tenantId/distributions` | `/integrations/store/:tenantId` | List all |
| POST | `/api/v1/tenants/:tenantId/distributions?action=verify` | `/integrations/store/verify` | Verify credentials |
| POST | `/api/v1/tenants/:tenantId/distributions` | `/integrations/store/connect` | Connect store |
| DELETE | `/api/v1/tenants/:tenantId/distributions?integrationId=xxx` | `/integrations/store/:tenantId/:id` | Delete |

---

### 4. **Integration with `getTenantInfo`** (`app/routes/api.v1.tenants.$tenantId.ts`)

```typescript
// Fetch distributions
const distributionsResponse = await AppDistributionService.listIntegrations(tenantId, userId);

// Append to tenant info
const enrichedData = {
  ...response.data,
  appDistributions: distributions, // ✅ NEW
};
```

**Available in ConfigContext:**
```typescript
const { appDistributions } = useConfig();
// appDistributions = [ { integrationId, storeType, platforms, payload, ... } ]
```

---

## 🔌 Backend Integration Points

### 1. Verify Credentials
```bash
POST /integrations/store/verify
{
  "storeType": "play_store",
  "tenantId": "tenant_1",
  "userId": "id_0",
  "payload": { ... }
}

Response:
{
  "success": true,
  "verified": true,
  "message": "Credentials verified successfully"
}
```

### 2. Connect Store
```bash
PUT /integrations/store/connect
{
  "storeType": "play_store",
  "tenantId": "tenant_1",
  "userId": "id_0",
  "platforms": ["ANDROID"], // ✅ NEW field added
  "payload": { ... }
}

Response:
{
  "success": true,
  "data": {
    "integrationId": "7utH0RceetHf2N0Y20pcm",
    "status": "PENDING"
  }
}
```

### 3. List Integrations
```bash
GET /integrations/store/:tenantId

Response:
{
  "success": true,
  "integrations": [
    {
      "integrationId": "7utH0RceetHf2N0Y20pcm",
      "storeType": "play_store",
      "platforms": ["ANDROID"],
      "status": "VALID",
      "payload": { ... }
    }
  ]
}
```

---

## 📊 Data Structure

### Store Type Metadata:
```typescript
STORE_TYPES = [
  {
    id: 'play_store',
    name: 'Google Play Store',
    allowedPlatforms: ['ANDROID'],
    requiresCredentials: true,
  },
  {
    id: 'app_store',
    name: 'Apple App Store',
    allowedPlatforms: ['IOS'],
    requiresCredentials: true,
  },
];
```

### Platform Mapping:
```typescript
ALLOWED_PLATFORMS = {
  play_store: ['ANDROID'],
  app_store: ['IOS'],
};
```

---

## 🎨 UI Integration (Next Steps)

### 1. **Integrations Page** (Add Distribution Tab)
```tsx
// Show connected distributions
const { appDistributions } = useConfig();

appDistributions.forEach(dist => {
  // Display: Play Store (ANDROID) - Status: VALID
});

// Add new distribution
<Button onClick={handleAddDistribution}>
  + Connect Distribution
</Button>
```

### 2. **Release Config - Platform Selection**
```tsx
// Platform-first selection
<PlatformDistributionSelector>
  📱 ANDROID
    {appDistributions
      .filter(d => d.platforms.includes('ANDROID'))
      .map(d => (
        <Checkbox>{d.payload.displayName}</Checkbox>
      ))}
    {noAndroidDistributions && (
      <Button onClick={() => navigate('/integrations')}>
        + Connect Distribution
      </Button>
    )}
  
  📱 IOS
    {/* Same for iOS */}
</PlatformDistributionSelector>
```

### 3. **Release Config Type Update**
```typescript
// Update ReleaseConfiguration
{
  "platforms": ["ANDROID", "IOS"],
  "distributionConfig": {
    "ANDROID": {
      "targets": ["7utH0RceetHf2N0Y20pcm"] // Integration IDs
    },
    "IOS": {
      "targets": ["RCwOrEc0-Dld-UeO8L-83"]
    }
  }
}
```

---

## ✅ What's Complete

- ✅ Types aligned with backend API
- ✅ BFF service layer (`AppDistributionService`)
- ✅ BFF routes (`/api/v1/tenants/:tenantId/distributions`)
- ✅ Integration with `getTenantInfo`
- ✅ Available in `ConfigContext` via `appDistributions`
- ✅ Proper authentication (userId in headers)
- ✅ Error handling
- ✅ No linter errors

---

## 🚧 To Do (UI Layer)

1. **Create Distribution Connection Flow**
   - Form for Play Store credentials
   - Form for App Store credentials
   - Platform selection (checkboxes)
   - Verify button (test connection)
   - Save button

2. **Update Integrations Page**
   - Add "App Distribution" tab
   - List connected distributions
   - Add/Edit/Delete actions

3. **Update Release Config Platform Selector**
   - Replace target-first with platform-first
   - Show distributions per platform
   - Show "+" CTA if no distributions

4. **Update Release Config Type**
   - Add `distributionConfig` field
   - Map platforms to integration IDs

---

## 🔄 Backend Migration Path

When backend is ready:
1. ✅ Types already match
2. ✅ BFF routes already proxy correctly
3. ✅ Service layer ready
4. ✅ No frontend changes needed
5. ✅ Just deploy backend, everything connects!

---

## 📝 Example Usage

### Frontend: Verify Credentials
```typescript
const response = await fetch(
  `/api/v1/tenants/${tenantId}/distributions?action=verify`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeType: 'play_store',
      payload: { /* credentials */ }
    })
  }
);

const result = await response.json();
if (result.verified) {
  // Show success, enable Save button
}
```

### Frontend: Connect Store
```typescript
const response = await fetch(
  `/api/v1/tenants/${tenantId}/distributions`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeType: 'play_store',
      platforms: ['ANDROID'],
      payload: { /* credentials */ }
    })
  }
);

const result = await response.json();
if (result.success) {
  // Refresh integrations list
}
```

---

## 🎯 Summary

The BFF layer is **100% complete** and ready to integrate with backend. Once backend endpoints are live, no code changes needed—just configuration! The UI layer can now be built knowing the data structure is finalized.

