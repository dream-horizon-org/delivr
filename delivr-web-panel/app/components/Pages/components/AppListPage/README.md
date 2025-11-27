# AppListPage Component

## Overview
A list view component that displays all apps for a specific organization. Replaces the card grid view with a more compact and efficient list layout.

## Features
- ✅ **List View**: Apps displayed in a clean, scrollable list
- ✅ **App Details**: Click on any app row to navigate to app details
- ✅ **Delete Functionality**: Admin users can delete apps with a single click
- ✅ **Role Badges**: Visual indicators for user role (Owner/Collaborator)
- ✅ **Loading States**: Skeleton loaders while data is fetching
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Empty State**: Clear message when no apps exist
- ✅ **Hover Effects**: Smooth hover animations for better UX

## Component Structure

```
AppListPage/
├── index.tsx                   # Main component
├── components/
│   └── AppListRow.tsx         # Individual app row component
└── README.md                  # This file
```

## Usage

The component is used in the route `/dashboard/:org/apps`:

```typescript
import { AppListPage } from "~/components/Pages/components/AppListPage";

export default function AppsList() {
  const user = useLoaderData<User>();
  return <AppListPage user={user} />;
}
```

## Props

### AppListPage
- `user: User` - The authenticated user object

### AppListRow
- `app: AppCardResponse` - App data object
- `onNavigate: () => void` - Callback when row is clicked
- `onDelete: () => void` - Callback when delete button is clicked

## Data Flow

1. **Fetch Apps**: Uses existing `useGetAppListForOrg` hook
2. **Display**: Shows apps in list format with AppListRow components
3. **Navigate**: Clicking a row navigates to `/dashboard/:org/:app`
4. **Delete**: Clicking delete icon opens delete confirmation modal

## Dependencies

### Existing Components (Reused)
- `useGetAppListForOrg` hook - Data fetching
- Delete modal at `/dashboard/delete` - Delete confirmation
- `AppCardResponse` type - App data structure

### Mantine Components
- `Stack` - Vertical layout
- `Title` - Page heading
- `Paper` - Container for list items
- `Group` - Horizontal layout
- `Avatar` - App avatar with initials
- `Text` - Text content
- `Badge` - Role badges
- `ActionIcon` - Delete button
- `Tooltip` - Hover tooltips
- `Skeleton` - Loading state

### Icons (Tabler)
- `IconTrash` - Delete button
- `IconChevronRight` - Navigation indicator

## Styling

Uses custom Tailwind utility class `.hover-highlight` for smooth hover effects:
- Transition animation on hover
- Subtle scale transform
- Shadow elevation

## Permissions

- **All Users**: Can view apps and navigate to details
- **Owners Only**: Can see and use the delete button
- **Collaborators**: Delete button is hidden

## Testing

Test the feature by:
1. Navigate to `/dashboard/:org/apps`
2. Verify list view displays correctly
3. Click on app row to navigate to details
4. Click delete icon (if owner) to open delete modal
5. Test with no apps (empty state)
6. Test loading state by throttling network

## Future Enhancements

Potential improvements:
- Search/filter functionality
- Sort options (name, date, etc.)
- Bulk actions
- App metrics preview in list
- Drag-and-drop reordering

