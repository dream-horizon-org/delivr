# Releases Routes Authentication Migration

## Current State

### Routes Using Legacy `requireUserId` Pattern

1. **`api.v1.tenants.$tenantId.releases.tsx`**
   - **Loader:** Uses `requireUserId(request)` directly
   - **Action:** Uses `requireUserId(request)` directly
   - **Lines:** 30, 79

2. **`api.v1.tenants.$tenantId.releases.$releaseId.tsx`**
   - **Loader:** Uses `requireUserId(request)` directly
   - **Action:** Uses `requireUserId(request)` directly
   - **Lines:** 30, 77

---

## Differences Between Patterns

### Legacy Pattern: `requireUserId`
```typescript
export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  // userId is just a string
  // No automatic error handling
  // Must manually handle auth errors
}
```

**Issues:**
- ❌ No automatic error handling
- ❌ Returns only `userId` (string), not full `User` object
- ❌ Inconsistent with other routes
- ❌ Must manually catch auth errors

### Standard Pattern: `authenticateLoaderRequest`
```typescript
export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    // user.user.id available
    // Automatic error handling
    // Consistent with other routes
  }
);
```

**Benefits:**
- ✅ Automatic error handling
- ✅ Full `User` object available
- ✅ Consistent with 34 other routes
- ✅ Better type safety

---

## Migration Plan

### Step 1: Update `api.v1.tenants.$tenantId.releases.tsx`

**Before:**
```typescript
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  // ...
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  // ...
}
```

**After:**
```typescript
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const userId = user.user.id;
    // ...
  }
);

export const action = authenticateActionRequest({
  POST: async ({ request, params, user }: ActionFunctionArgs & { user: User }) => {
    const userId = user.user.id;
    // ...
  },
});
```

### Step 2: Update `api.v1.tenants.$tenantId.releases.$releaseId.tsx`

**Before:**
```typescript
import { requireUserId } from '~/.server/services/Auth';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  // ...
}

export async function action({ params, request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  // ...
}
```

**After:**
```typescript
import { authenticateLoaderRequest, authenticateActionRequest } from '~/utils/authenticate';
import type { User } from '~/.server/services/Auth/Auth.interface';

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const userId = user.user.id;
    // ...
  }
);

export const action = authenticateActionRequest({
  PUT: async ({ params, request, user }: ActionFunctionArgs & { user: User }) => {
    const userId = user.user.id;
    // ...
  },
  PATCH: async ({ params, request, user }: ActionFunctionArgs & { user: User }) => {
    const userId = user.user.id;
    // ...
  },
});
```

---

## Benefits of Migration

1. **Consistency** - All routes use the same authentication pattern
2. **Error Handling** - Automatic error handling for auth failures
3. **Type Safety** - Full `User` object with proper TypeScript types
4. **Maintainability** - Easier to update auth logic in one place
5. **Best Practices** - Follows established patterns in the codebase

---

## Implementation Notes

### Key Changes:
1. Replace `requireUserId(request)` with `user.user.id` from authenticated context
2. Wrap loader with `authenticateLoaderRequest`
3. Wrap action with `authenticateActionRequest` and use method-specific handlers
4. Add `User` type import
5. Remove `requireUserId` import

### Error Handling:
- `authenticateLoaderRequest` automatically handles auth errors
- Returns proper JSON error responses
- No need for manual try-catch around auth

### Method Handling:
- For actions with multiple methods (PUT, PATCH), use separate handlers in `authenticateActionRequest`
- Each method gets its own function

---

## Testing Checklist

After migration, verify:
- ✅ GET `/api/v1/tenants/:tenantId/releases` works
- ✅ POST `/api/v1/tenants/:tenantId/releases` works
- ✅ GET `/api/v1/tenants/:tenantId/releases/:releaseId` works
- ✅ PUT/PATCH `/api/v1/tenants/:tenantId/releases/:releaseId` works
- ✅ Unauthenticated requests return proper error
- ✅ Error responses match expected format

