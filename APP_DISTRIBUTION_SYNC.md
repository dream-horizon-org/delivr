# App Distribution System - Single Source of Truth Alignment

## ✅ System Metadata Flow (Single Source of Truth)

### Backend → BFF → Frontend

```
Backend (management.ts)
  ↓ returns IDs: "play_store", "app_store" (isAvailable: true)
  ↓
BFF (api.v1.system.metadata.ts)
  ↓ enriches with STORE_TYPES and ALLOWED_PLATFORMS
  ↓
Frontend (ConfigContext)
  ↓ enriches with UI metadata (icons, descriptions)
  ↓
Integration Cards
  ✓ Display correctly with Connect buttons
```

## 📋 ID Consistency (CRITICAL)

| Location | ID Format | Status |
|----------|-----------|--------|
| Backend API endpoints | `play_store`, `app_store` | ✅ |
| Backend system metadata | `play_store`, `app_store` | ✅ FIXED |
| BFF types | `play_store`, `app_store` | ✅ |
| Frontend constants | `play_store`, `app_store` | ✅ |
| UI metadata | `play_store`, `app_store` | ✅ FIXED |

## 🔧 Files Updated

### 1. **Backend** (`delivr-server-ota-managed/api/script/routes/management.ts`)
```typescript
const APP_DISTRIBUTION = [
  { id: "app_store", name: "App Store", requiresOAuth: false, isAvailable: true },  // ✅ Fixed
  { id: "play_store", name: "Play Store", requiresOAuth: false, isAvailable: true }, // ✅ Fixed
  { id: "firebase", name: "Firebase App Distribution", requiresOAuth: true, isAvailable: false },
];
```

### 2. **Frontend Types** (`app/types/app-distribution.ts`)
```typescript
// IMPORTANT: IDs must match backend integration provider IDs
// These are returned in SystemMetadataBackend.releaseManagement.integrations.APP_DISTRIBUTION
export const STORE_TYPES: StoreTypeMetadata[] = [
  {
    id: 'play_store',  // ✅ Matches backend
    name: 'Google Play Store',
    description: 'Distribute Android apps to Google Play Store',
    icon: 'play-store',
    allowedPlatforms: ['ANDROID'],
    requiresCredentials: true,
  },
  {
    id: 'app_store',   // ✅ Matches backend
    name: 'Apple App Store',
    description: 'Distribute iOS apps to Apple App Store',
    icon: 'app-store',
    allowedPlatforms: ['IOS'],
    requiresCredentials: true,
  },
];

export const ALLOWED_PLATFORMS: Record<string, string[]> = {
  play_store: ['ANDROID'],
  app_store: ['IOS'],
  firebase: ['ANDROID', 'IOS', 'WEB'],
};
```

### 3. **UI Metadata** (`app/constants/ui-metadata.ts`)
```typescript
// APP_DISTRIBUTION
app_store: {  // ✅ Changed from 'appstore'
  description: 'Deploy iOS apps to TestFlight and the App Store',
  icon: 'apple',
  // comingSoon: true ✅ REMOVED
},
play_store: {  // ✅ Changed from 'playstore'
  description: 'Publish Android apps to Google Play Console',
  icon: 'android',
  // comingSoon: true ✅ REMOVED
},
```

### 4. **BFF System Metadata** (`app/routes/api.v1.system.metadata.ts`)
```typescript
// Enrich with app distribution metadata
const enrichedData = {
  ...response.data,
  appDistribution: {
    availableStoreTypes: STORE_TYPES,      // ✅ From app-distribution.ts
    allowedPlatforms: ALLOWED_PLATFORMS,   // ✅ From app-distribution.ts
  },
};
```

## 🔄 Data Flow Example

### Example: User clicks "Connect" on Play Store card

1. **Backend returns** in `/system/metadata`:
   ```json
   {
     "releaseManagement": {
       "integrations": {
         "APP_DISTRIBUTION": [
           { "id": "play_store", "name": "Play Store", "isAvailable": true }
         ]
       }
     }
   }
   ```

2. **BFF enriches** the response:
   ```json
   {
     ...backend data,
     "appDistribution": {
       "availableStoreTypes": [
         {
           "id": "play_store",
           "name": "Google Play Store",
           "description": "...",
           "allowedPlatforms": ["ANDROID"]
         }
       ]
     }
   }
   ```

3. **Frontend enriches** with UI metadata:
   ```typescript
   {
     id: "play_store",
     name: "Play Store",
     isAvailable: true,
     description: "Publish Android apps to Google Play Console",
     icon: "android"
   }
   ```

4. **IntegrationCard** shows:
   - ✅ Card is visible
   - ✅ "Connect" button appears (because `isAvailable: true`)
   - ✅ Modal opens with `AppDistributionConnectionFlow`

## 🎯 Key Principles

1. **Backend is source of truth** for:
   - Available integration IDs
   - Availability status (`isAvailable`)
   - Basic metadata (name)

2. **Frontend constants provide**:
   - Detailed descriptions
   - Icons and visual metadata
   - Platform mappings
   - UI-specific configurations

3. **IDs must be consistent** across:
   - Backend system metadata
   - Backend API endpoints
   - Frontend constants
   - UI metadata

## ✅ Verification Checklist

- [x] Backend IDs match API endpoints (`play_store`, `app_store`)
- [x] Backend marks integrations as `isAvailable: true`
- [x] Frontend constants use matching IDs
- [x] UI metadata uses matching IDs
- [x] `comingSoon` flags removed from UI metadata
- [x] BFF enriches system metadata with app distribution data
- [x] IntegrationCard shows Connect button
- [x] IntegrationConnectModal handles both store types
- [x] IntegrationDetailModal displays distribution details
- [x] All TypeScript types align with system metadata structure

## 🚀 Testing Flow

1. Start backend server
2. Backend returns `play_store` and `app_store` in system metadata
3. Frontend fetches and enriches the data
4. Integrations page shows both cards with "Connect" buttons
5. Click "Connect" → Modal opens with store-specific form
6. Verify credentials → Connect → Integration saved
7. Card updates to show "Connected" status with details

