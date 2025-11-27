# App List Page Components

This directory contains components used in the Application List Page.

## Components

### AppListRow (AppCard)
Card component for displaying individual applications in a grid layout.

**Features:**
- 250x250px square card
- Colorful gradient icon with initials
- Role badge (Owner/Collaborator)
- Delete button for owners
- Purple shadow on hover
- Click to navigate to app details

### OrgSwitcher
Side panel component for switching between organizations.

**Features:**
- Fixed 280px width side panel
- Scrollable list of all organizations
- Active state highlighting (purple border & background)
- Building icon for each org
- Click to switch to different org's apps
- Shows "Current organization" label for active org

**Active State:**
- Purple border (2px)
- Light purple background
- Purple icon background
- Bold text
- "Current organization" label

**Hover State:**
- Light purple background on hover
- Smooth transition

## Layout

The AppListPage uses a two-column layout:
```
┌─────────────┬───────────────────────────────────┐
│             │  Header (Org › Apps) [Create App] │
│  Org        │                                    │
│  Switcher   │  [Card] [Card] [Card] [Card]      │
│  (280px)    │  [Card] [Card] [Card] [Card]      │
│             │                                    │
│  Scrollable │  (App cards in flex grid)         │
│             │                                    │
└─────────────┴───────────────────────────────────┘
```

## Usage

The OrgSwitcher automatically:
1. Fetches all organizations the user has access to
2. Highlights the currently selected organization
3. Navigates to the selected org's apps page on click
4. Shows scrollbar if there are many organizations

The AppListRow displays:
1. App initials in a colorful gradient icon
2. App name
3. Role badge (Owner/Collaborator)
4. Delete button (only for owners)
5. Hover effect with purple shadow

