# Release Configuration Storage & Listing Guide

## Where Configurations Are Listed

### **Primary Location: Settings Page**

**Route:** `/dashboard/:org/settings/release-config`

**File:** `app/routes/dashboard.$org.settings.release-config.tsx`

**What it shows:**
- ✅ All configurations (ACTIVE, DRAFT, ARCHIVED)
- ✅ Statistics (Total, Active, Draft, Archived)
- ✅ Filter by status and release type
- ✅ Search by name/description
- ✅ Actions: Edit, Duplicate, Archive, Set Default, Export

**Data flow:**
```typescript
loader() {
  // Fetches from API
  GET /api/v1/tenants/:org/release-config
  
  // Returns all configurations
  return { configurations, stats }
}
```

**Component:** `ConfigurationList` → `ConfigurationListItem`

**Access:** Settings → Release Configuration

---

## Storage Architecture

### **Current Implementation**

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layers                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. localStorage (Client-side)                               │
│     └── Draft only: delivr_release_config_draft_{org}       │
│         • Auto-saves during wizard                           │
│         • Cleared on successful submission                   │
│         • Purpose: Recovery from interrupted sessions        │
│                                                               │
│  2. In-Memory Store (Server-side)                            │
│     └── configStore: Map<tenantId, Map<configId, Config>>  │
│         • Active configurations                              │
│         • Lost on server restart                             │
│         • Purpose: Temporary until backend ready             │
│                                                               │
│  3. Future: PostgreSQL Database                              │
│     └── release_configurations table                         │
│         • Permanent storage                                  │
│         • Audit logs                                         │
│         • Version history                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Using Client-Side Cache (New Feature)

### **When to Use Cache**

✅ **Use cache for:**
- Reducing API calls on settings page
- Faster page loads
- Offline-first experience
- Reducing server load

❌ **Don't rely on cache for:**
- Critical data (always verify with API)
- Real-time updates
- Cross-tab synchronization

### **Implementation Example**

#### **Option 1: Cache on Save (Recommended)**

Update `dashboard.$org.releases.configure.tsx`:

```typescript
import { addConfigToCache } from '~/utils/config-cache';

const handleSubmit = async (config: ReleaseConfiguration) => {
  // Already submitting to API in ConfigurationWizard.handleFinish()
  // Just cache after successful submission
  
  try {
    // The config is already saved via API in the wizard
    // Now cache it for faster access
    addConfigToCache(organizationId, config);
    
    console.log('[Configure] Cached configuration:', config.id);
    
    // Navigate to settings or releases list
    navigate(`/dashboard/${organizationId}/settings/release-config`);
  } catch (error) {
    console.error('[Configure] Failed to cache:', error);
    // Still navigate even if caching fails
    navigate(`/dashboard/${organizationId}/settings/release-config`);
  }
};
```

#### **Option 2: Cache on Load**

Update `dashboard.$org.settings.release-config.tsx`:

```typescript
import { 
  loadCachedConfigurations, 
  cacheConfigurations 
} from '~/utils/config-cache';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Try cache first
  const cached = loadCachedConfigurations(org);
  if (cached) {
    console.log('[Settings] Using cached configurations');
    return json({
      organizationId: org,
      configurations: cached,
      stats: calculateStats(cached),
      fromCache: true,
    });
  }
  
  // Fetch from API if no cache
  let configurations: ReleaseConfiguration[] = [];
  let stats = null;
  
  try {
    const url = new URL(request.url);
    const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}/release-config`;
    
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      configurations = data.configurations || [];
      stats = data.stats || null;
      
      // Cache the results
      cacheConfigurations(org, configurations);
      
      console.log(`[Settings] Loaded ${configurations.length} configurations from API`);
    }
  } catch (error) {
    console.error('[Settings] Failed to load configurations:', error);
  }
  
  return json({
    organizationId: org,
    configurations,
    stats,
    fromCache: false,
  });
}

function calculateStats(configs: ReleaseConfiguration[]) {
  return {
    total: configs.length,
    active: configs.filter(c => c.status === 'ACTIVE').length,
    draft: configs.filter(c => c.status === 'DRAFT').length,
    archived: configs.filter(c => c.status === 'ARCHIVED').length,
    hasDefault: configs.some(c => c.isDefault && c.status === 'ACTIVE'),
  };
}
```

#### **Option 3: Cache with Invalidation**

When configurations change, invalidate cache:

```typescript
import { invalidateConfigCache } from '~/utils/config-cache';

// After creating new config
const handleSubmit = async (config: ReleaseConfiguration) => {
  // Config is saved via API
  
  // Invalidate cache so next load fetches fresh data
  invalidateConfigCache(organizationId);
  
  navigate(`/dashboard/${organizationId}/settings/release-config`);
};

// After archiving
const handleArchive = async (configId: string) => {
  const response = await fetch(...);
  
  if (response.ok) {
    invalidateConfigCache(organizationId);
    window.location.reload(); // Will fetch fresh data
  }
};

// After setting default
const handleSetDefault = async (configId: string) => {
  const response = await fetch(...);
  
  if (response.ok) {
    invalidateConfigCache(organizationId);
    window.location.reload();
  }
};
```

---

## Current Data Flow Comparison

### **Without Cache (Current)**

```
User clicks "Finish"
        ↓
ConfigurationWizard.handleFinish()
        ↓
POST /api/v1/tenants/:org/release-config
        ↓
Server stores in memory
        ↓
Returns success
        ↓
Clear localStorage draft
        ↓
Parent onSubmit (redundant POST)
        ↓
Navigate to /dashboard/:org/releases
        ↓
Settings page loader
        ↓
GET /api/v1/tenants/:org/release-config
        ↓
Display configurations
```

### **With Cache (Optimized)**

```
User clicks "Finish"
        ↓
ConfigurationWizard.handleFinish()
        ↓
POST /api/v1/tenants/:org/release-config
        ↓
Server stores in memory
        ↓
Returns success
        ↓
Clear localStorage draft
        ↓
addConfigToCache(org, config)  ← NEW
        ↓
Navigate to /dashboard/:org/settings/release-config
        ↓
Settings page loader
        ↓
loadCachedConfigurations(org)  ← NEW
        ↓ (if cached)
Display immediately (fast!)
        ↓ (background refresh optional)
GET /api/v1/tenants/:org/release-config
        ↓
Update cache
```

---

## Recommendations

### **Best Practice: Hybrid Approach**

1. **Use cache** for initial display (fast UX)
2. **Fetch from API** in background to verify
3. **Update cache** with fresh data
4. **Invalidate cache** on mutations (create/update/delete)

### **Implementation Priority**

1. ✅ **Keep draft in localStorage** (already implemented)
   - Purpose: Recovery during wizard
   - Clear on success

2. ✅ **Use cache for listing** (optional, but recommended)
   - Purpose: Performance
   - Expire after 5 minutes
   - Invalidate on changes

3. ✅ **Always verify with API** (critical)
   - Purpose: Data integrity
   - Cache is just for speed, not reliability

---

## Cache Invalidation Strategy

| Action | Cache Strategy |
|--------|---------------|
| Create config | Invalidate + Add to cache |
| Update config | Invalidate + Update in cache |
| Delete/Archive | Invalidate + Remove from cache |
| Set default | Invalidate (affects multiple configs) |
| Page load | Load cache → fetch API → update cache |
| User refresh | Clear cache + fetch API |

---

## Files Modified for Caching

```
app/utils/config-cache.ts                          ← NEW
app/routes/dashboard.$org.settings.release-config.tsx  ← UPDATE loader
app/routes/dashboard.$org.releases.configure.tsx      ← UPDATE handleSubmit
```

---

## Testing the Cache

```typescript
// In browser console:

// Check cached data
const cached = localStorage.getItem('delivr_config_cache_org123');
console.log(JSON.parse(cached));

// Check cache age
const cache = JSON.parse(cached);
const ageSeconds = (Date.now() - cache.timestamp) / 1000;
console.log(`Cache age: ${ageSeconds}s`);

// Clear cache
localStorage.removeItem('delivr_config_cache_org123');

// Check draft
const draft = localStorage.getItem('delivr_release_config_draft_org123');
console.log(JSON.parse(draft));
```

---

## Summary

**Your Questions Answered:**

1. **Can you store in localStorage after handleSubmit?**
   - ✅ Yes, but use the **cache utility** instead
   - ✅ Call `addConfigToCache(org, config)` after successful save
   - ✅ Purpose: Performance, not persistence (API is source of truth)

2. **Where are saved configurations listed?**
   - 📍 **Settings page**: `/dashboard/:org/settings/release-config`
   - 📍 **Component**: `ConfigurationList` → `ConfigurationListItem`
   - 📍 **API**: `GET /api/v1/tenants/:org/release-config`
   - 📍 **Also used**: Release creation wizard (to select config)

**Recommended Approach:**
- Remove the redundant POST in `handleSubmit` (line 85-94 in configure route)
- Add caching after successful wizard submission
- Use cache in settings page loader for faster loads
- Always verify with API for data integrity

