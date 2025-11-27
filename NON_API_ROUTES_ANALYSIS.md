# Non-API Routes Analysis

## Summary
**Total Non-API Routes:** 27
- **Routes with `loader` (server-side loaded):** 18 (66.7%)
- **Routes with `action` (server-side mutations):** 3 (11.1%)
- **Client-side only (no loader/action):** 9 (33.3%)

---

## Exact List of Non-API Routes

### Routes with BOTH `loader` and `action` (3 routes)
1. `auth.$provider.tsx` - OAuth authentication
2. `dashboard.$org.releases.configure.tsx` - Release configuration
3. `logout.tsx` - User logout

### Routes with ONLY `loader` (15 routes)
1. `$.tsx` - Catch-all error route
2. `_index.tsx` - Root index route
3. `auth.$provider.callback.tsx` - OAuth callback
4. `dashboard.$org.$app.tsx` - App detail page
5. `dashboard.$org.$app_.$release.tsx` - App release detail
6. `dashboard.$org.$app_.create-release.tsx` - Create app release
7. `dashboard.$org.apps.tsx` - Apps list page
8. `dashboard.$org.manage.tsx` - Organization management
9. `dashboard.$org.release-management.tsx` - Release management page
10. `dashboard.$org.releases.create.tsx` - Create release page
11. `dashboard.$org.releases.settings.tsx` - Release settings page
12. `dashboard.$org.tsx` - Organization layout (parent route)
13. `dashboard.tsx` - Dashboard layout (parent route)
14. `healthcheck.ts` - Health check endpoint
15. `login.tsx` - Login page

### Client-side only routes (9 routes - NO `loader`/`action`)
1. `dashboard.$org.integrations.tsx` - Uses React Query hooks
2. `dashboard.$org.releases.$releaseId.tsx` - Uses React Query hooks
3. `dashboard.$org.releases._index.tsx` - Uses React Query hooks
4. `dashboard.$org.releases.setup.tsx` - Uses route loader data from parent
5. `dashboard.$org.releases.tsx` - Layout route (just renders Outlet)
6. `dashboard._index.tsx` - Dashboard index (redirects)
7. `dashboard.create.app.tsx` - Uses React Query hooks
8. `dashboard.delete.tsx` - Uses React Query hooks
9. `dashboard.tokens.tsx` - Uses React Query hooks

---

## Are API Routes and Non-API Routes Treated Similarly in Remix?

**Yes, they are treated the same way!** Here's the key difference:

### Similarities:
- Both can have `loader` functions (server-side data fetching)
- Both can have `action` functions (server-side mutations)
- Both follow the same Remix routing conventions
- Both are server-side rendered by default

### Differences:

**API Routes (BFF - Backend For Frontend):**
- Typically return JSON responses: `return json({ data })`
- Called via `fetch()` from frontend components
- Used as data endpoints for React Query, SWR, etc.
- Example: `api.v1.tenants.$tenantId.releases.tsx`

**Non-API Routes (Page Routes):**
- Return data that gets passed to components via `useLoaderData()`
- Render React components directly
- Can return JSON too, but typically return data for components
- Example: `dashboard.$org.releases.create.tsx`

### Example Comparison:

**API Route:**
```typescript
// api.v1.tenants.$tenantId.releases.tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const releases = await getReleases(params.tenantId);
  return json({ releases }); // Returns JSON
}
```

**Non-API Route:**
```typescript
// dashboard.$org.releases.create.tsx
export const loader = authenticateLoaderRequest(async ({ params }) => {
  const configs = await getConfigs(params.org);
  return json({ configs }); // Also returns JSON, but used differently
});

export default function CreateReleasePage() {
  const { configs } = useLoaderData<typeof loader>(); // Data available here
  return <CreateReleaseForm configs={configs} />;
}
```

**Key Point:** In Remix, there's no special "API route" type. Routes under `/api/v1/` are just regular Remix routes that happen to return JSON. The distinction is more about **usage pattern** than **technical difference**.

---

## Can You Call Non-API Routes Using `fetch()`?

**Yes! You can call any Remix route using `fetch()`, including non-API routes.**

### How It Works:

**When you navigate to a route in the browser:**
- Remix renders the React component (returns HTML)
- Data is available via `useLoaderData()`

**When you call a route via `fetch()`:**
- Remix detects it's a programmatic request
- Returns JSON from the `loader` function
- No component rendering

### Example: Calling a Non-API Route

```typescript
// Non-API route: dashboard.$org.releases.create.tsx
export const loader = authenticateLoaderRequest(async ({ params }) => {
  return json({ org: params.org, configs: [] });
});

// You can call it via fetch:
const response = await fetch('/dashboard/my-org/releases/create', {
  headers: {
    'Accept': 'application/json',
    'Cookie': document.cookie, // Include auth cookies
  },
});

const data = await response.json();
// data = { org: 'my-org', configs: [] }
```

### Important Considerations:

1. **Authentication**: Include cookies/headers for authenticated routes
2. **Headers**: Set `Accept: application/json` to ensure JSON response
3. **CORS**: Same-origin requests work automatically
4. **Response Format**: Returns whatever the `loader` returns (typically JSON)

### Real Example from Your Codebase:

Looking at `dashboard.$org.tsx`, it actually calls an API route internally:

```typescript
// dashboard.$org.tsx (non-API route)
export const loader = authenticateLoaderRequest(async ({ request, params }) => {
  const apiUrl = new URL(request.url);
  // Calls API route from within a non-API route loader
  const result = await apiGet(`${apiUrl.origin}/api/v1/tenants/${tenantId}`);
  return json({ organisation: result.data?.organisation });
});
```

### When to Use Each:

**Use API routes (`/api/v1/*`) when:**
- You want a clear API endpoint
- Called from multiple places (React Query, SWR, etc.)
- Need consistent JSON responses

**Use non-API routes via `fetch()` when:**
- You want to reuse existing loader logic
- Need the same data that a page component uses
- Want to avoid duplicating code

**Best Practice:** Generally, use API routes for programmatic access and non-API routes for page rendering. But technically, both work!

---

## Is This Just a Convention?

**Yes, it's primarily a convention!** There's no technical restriction in Remix.

### Technical Reality:
- ✅ Both API and non-API routes work identically
- ✅ Both can have `loader` and `action` functions
- ✅ Both can return JSON
- ✅ Both can be called via `fetch()`
- ✅ Both can render React components

### Why the Convention Exists:

**1. Clarity & Organization:**
```
/api/v1/*          → "This is a data endpoint"
/dashboard/*       → "This is a page route"
```
Clear separation makes code easier to understand.

**2. URL Semantics:**
- `/api/v1/releases` clearly indicates an API endpoint
- `/dashboard/org/releases` indicates a page route
- Better for documentation, debugging, and team understanding

**3. Practical Benefits:**
- **API routes**: Designed for programmatic access, consistent JSON responses
- **Non-API routes**: Designed for page rendering, can include layout/UI logic

**4. But You CAN Break the Convention:**
```typescript
// This works! Non-API route called via fetch
const data = await fetch('/dashboard/org/releases/create').then(r => r.json());

// This also works! API route that renders a component
export default function ApiRoutePage() {
  return <div>This is an API route rendering a page!</div>;
}
```

### Real-World Example:

In your codebase, `dashboard.$org.tsx` (non-API route) calls an API route internally:
```typescript
// Non-API route loader calling API route
const result = await apiGet(`${apiUrl.origin}/api/v1/tenants/${tenantId}`);
```

This shows the convention: non-API routes can call API routes, but they're still separate for clarity.

### Bottom Line:
**It's a convention for maintainability and clarity, not a technical requirement.** Remix doesn't enforce it—you could use either pattern for either purpose. But following the convention makes your codebase more predictable and easier to navigate.

