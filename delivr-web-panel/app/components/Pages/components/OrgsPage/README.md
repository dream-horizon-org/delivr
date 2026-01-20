# OrgsPage Component

## Overview
The Organizations page serves as the main dashboard landing page. It displays all organizations the user belongs to and allows creating new organizations. When no organizations exist, it shows the Intro/Welcome page.

## Features
- ✅ **Smart Landing Page**: Shows Intro page if no orgs, or org list if orgs exist
- ✅ **List View**: Organizations displayed in a clean, scrollable list
- ✅ **Create Organization**: Button at top to create new organization
- ✅ **Navigate to Apps**: Click on any org to view its apps
- ✅ **Delete Organization**: Owners can delete organizations
- ✅ **Role Badges**: Visual indicators for user role (Owner/Member)
- ✅ **Loading States**: Skeleton loaders while data is fetching
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Org Count Badge**: Shows total number of organizations

## Component Structure

```
OrgsPage/
├── index.tsx                      # Main component
├── components/
│   ├── OrgRow.tsx                # Individual org row component
│   └── CreateOrgModal.tsx        # Create org modal form
└── README.md                     # This file
```

## Usage

The component is used in the route `/dashboard` (dashboard index):

```typescript
import { OrgsPage } from "~/components/Pages/components/OrgsPage";

export default function DashboardIndex() {
  return <OrgsPage />;
}
```

## Components

### OrgsPage (Main Component)
The main organizations page that conditionally renders:
- **Intro page** if no organizations exist
- **Organization list** with create button if organizations exist

### OrgRow
Individual organization row component.

**Props:**
- `org: Organization` - Organization data object
  - `id: string` - Organization ID
  - `orgName: string` - Organization name
  - `isAdmin: boolean` - Whether user is owner
- `onNavigate: () => void` - Callback when row is clicked
- `onDelete: () => void` - Callback when delete button is clicked

### CreateOrgModal
Form modal for creating new organizations.

**Props:**
- `onSuccess: () => void` - Callback when organization is created successfully

**Fields:**
- `orgName: string` - Name of the new organization (min 3 chars)
- `appName: string` - Name of initial app (min 3 chars, required)

**Note:** Creating an organization requires creating an initial app because the backend requires at least one app per organization.

## Data Flow

1. **Fetch Organizations**: Uses existing `useGetOrgList` hook
2. **Display Logic**:
   - If loading → Show skeleton loaders
   - If error → Show error message
   - If no orgs → Show Intro/Welcome page
   - If has orgs → Show organization list
3. **Navigate**: Clicking a row navigates to `/dashboard/:org/apps`
4. **Create Org**: Opens modal at `/dashboard/create/org`
5. **Delete**: Clicking delete icon opens delete confirmation modal

## Create Organization Flow

```
1. User clicks "Create Organization" button
   ↓
2. Modal opens with CreateOrgModal form
   ↓
3. User enters org name and initial app name
   ↓
4. POST to /api/v1/new/apps with orgName + app name
   ↓
5. Backend creates org and app
   ↓
6. Success notification + refetch org list
   ↓
7. Modal closes, user sees new org in list
```

## Dependencies

### Existing Components (Reused)
- `useGetOrgList` hook - Data fetching from `/api/v1/tenants`
- `Intro` component - Welcome page for new users
- Delete modal at `/dashboard/delete` - Delete confirmation
- Event emitter - For refetching org list after create

### Mantine Components
- `Stack` - Vertical layout
- `Title` - Page heading
- `Button` - Create org button
- `Paper` - Container for list items
- `Group` - Horizontal layout
- `Avatar` - Org avatar with icon
- `Text` - Text content
- `Badge` - Role and count badges
- `ActionIcon` - Delete button
- `Tooltip` - Hover tooltips
- `Skeleton` - Loading state
- `Modal` - Create org modal
- `TextInput` - Form inputs

### Icons (Tabler)
- `IconPlus` - Create button
- `IconBuilding` - Org avatar and form
- `IconTrash` - Delete button
- `IconChevronRight` - Navigation indicator

## Styling

Uses custom Tailwind utility class `.hover-highlight` for smooth hover effects:
- Transition animation on hover
- Subtle scale transform
- Shadow elevation

## Permissions

- **All Users**: Can view organizations and navigate to apps
- **Owners Only**: Can see and use the delete button
- **Members**: Delete button is hidden

## Routes

### Main Route
- **Path**: `/dashboard` (index)
- **Component**: `OrgsPage`
- **Purpose**: Landing page after login

### Related Routes
- **Create Org**: `/dashboard/create/org` - Opens create modal
- **View Apps**: `/dashboard/:org/apps` - Navigate to org's apps
- **Delete Org**: `/dashboard/delete?type=org&...` - Delete confirmation

## API Integration

### Get Organizations
```typescript
GET /api/v1/tenants
Response: {
  organisations: [
    { id: string, displayName: string, role: "Owner" | "Collaborator" }
  ]
}
```

### Create Organization
```typescript
POST /api/v1/new/apps
Body: {
  orgName: string,
  name: string  // initial app name
}
```

### Delete Organization
```typescript
DELETE /api/v1/:org
```

## Testing

Test the feature by:
1. Navigate to `/dashboard` (home page)
2. If no orgs → Verify intro page shows
3. If orgs exist → Verify list displays correctly
4. Click "Create Organization" button
5. Fill form with org name and app name
6. Verify org is created and list refreshes
7. Click on org row to navigate to apps
8. Click delete icon (if owner) to delete org

## Future Enhancements

Potential improvements:
- Search/filter organizations
- Sort options (name, date, etc.)
- Organization settings/details page
- Invite members to organization
- Organization avatar upload
- Activity feed for organization
- Organization stats (total apps, deployments, etc.)

