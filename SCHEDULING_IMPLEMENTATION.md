# Scheduling Step Implementation

## Overview
Implemented comprehensive scheduling configuration step with all required fields and validation logic.

## Implemented Fields

### 1. Release Frequency
- **Type**: `WEEKLY | BIWEEKLY | TRIWEEKLY | MONTHLY | CUSTOM`
- **Custom Frequency**: Optional days count for custom frequency
- **UI**: Dropdown selector with description for each option

### 2. First Release Kickoff Date
- **Type**: ISO date string
- **UI**: Date input (HTML5 date picker)
- **Validation**: Must be today or future date

### 3. Kickoff Settings
- **kickoffTime**: HH:MM format (24-hour)
- **kickoffReminderEnabled**: Boolean toggle
- **kickoffReminderTime**: HH:MM format
- **Validation**: Reminder time must be ≤ kickoff time

### 4. Target Release Settings
- **targetReleaseTime**: HH:MM format (24-hour)
- **targetReleaseDateOffsetFromKickoff**: Number (days from kickoff)
- **Validation**: Offset must be ≥ 0

### 5. Working Days
- **Type**: Array of numbers (1-7, where 1 = Monday, 7 = Sunday)
- **UI**: Multi-select day picker
- **Default**: [1, 2, 3, 4, 5] (Mon-Fri)

### 6. Timezone
- **Type**: String (IANA timezone identifier)
- **UI**: Timezone picker dropdown
- **Default**: "Asia/Kolkata"

### 7. Regression Slots
- **Type**: Array of regression slot objects
- **Fields per slot**:
  - `id`: Unique identifier
  - `name`: Optional custom name
  - `regressionSlotOffsetFromKickoff`: Days from kickoff
  - `time`: HH:MM format
  - `config`: Object with boolean flags:
    - `regressionBuilds`: Trigger regression builds
    - `postReleaseNotes`: Post release notes
    - `automationBuilds`: Trigger automation builds
    - `automationRuns`: Execute automation runs

## Validation Rules

### Time Constraints
1. **Kickoff Reminder Time**
   - Must be ≤ kickoffTime
   - Only validated when kickoffReminderEnabled is true

2. **Target Release Offset**
   - Must be ≥ 0
   - Represents days from kickoff to release

3. **Regression Slot Offset**
   - Must be ≤ targetReleaseDateOffsetFromKickoff
   - Ensures regression slots don't exceed release date

4. **Regression Slot Time**
   - When `regressionSlotOffsetFromKickoff === targetReleaseDateOffsetFromKickoff`
   - Slot time must be ≤ targetReleaseTime
   - Ensures regression happens before release on the same day

## UI Features

### Validation Feedback
- Real-time validation with error messages
- Red alert banner showing all validation errors at top
- Individual field-level error messages
- Visual indicators (red borders) for invalid fields

### Regression Slot Management
- **Add Slot**: Button to create new regression slots
- **Edit Mode**: Expandable card view for editing
- **Collapsed View**: Compact display with badges for activities
- **Delete**: Action icon to remove slots
- **Inline Validation**: Shows errors for each slot

### User Experience
- Clear labels and descriptions for all fields
- Grouped related fields in cards
- Dividers for visual separation
- Icons for better visual hierarchy
- Responsive layout with proper spacing

## Data Structure

```typescript
interface SchedulingConfig {
  releaseFrequency: 'WEEKLY' | 'BIWEEKLY' | 'TRIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  customFrequencyDays?: number;
  firstReleaseKickoffDate: string; // ISO date
  kickoffTime: string; // HH:MM
  kickoffReminderEnabled: boolean;
  kickoffReminderTime: string; // HH:MM
  targetReleaseTime: string; // HH:MM
  targetReleaseDateOffsetFromKickoff: number;
  workingDays: number[]; // 1-7
  timezone: string;
  regressionSlots: RegressionSlot[];
}

interface RegressionSlot {
  id: string;
  name?: string;
  regressionSlotOffsetFromKickoff: number;
  time: string; // HH:MM
  config: {
    regressionBuilds: boolean;
    postReleaseNotes: boolean;
    automationBuilds: boolean;
    automationRuns: boolean;
  };
}
```

## Example Configuration

```json
{
  "scheduling": {
    "releaseFrequency": "BIWEEKLY",
    "firstReleaseKickoffDate": "2025-12-01T00:00:00.000Z",
    "kickoffTime": "10:00",
    "kickoffReminderEnabled": true,
    "kickoffReminderTime": "09:00",
    "targetReleaseTime": "18:00",
    "targetReleaseDateOffsetFromKickoff": 5,
    "timezone": "Asia/Kolkata",
    "workingDays": [1, 2, 3, 4, 5],
    "regressionSlots": [
      {
        "id": "slot-1",
        "name": "Morning Regression",
        "regressionSlotOffsetFromKickoff": 2,
        "time": "09:00",
        "config": {
          "regressionBuilds": true,
          "postReleaseNotes": false,
          "automationBuilds": false,
          "automationRuns": false
        }
      },
      {
        "id": "slot-2",
        "name": "Evening Regression",
        "regressionSlotOffsetFromKickoff": 2,
        "time": "16:00",
        "config": {
          "regressionBuilds": true,
          "postReleaseNotes": false,
          "automationBuilds": false,
          "automationRuns": false
        }
      }
    ]
  }
}
```

## Files Modified

1. **Types**: `app/types/release-config.ts`
   - Updated `SchedulingConfig` interface
   - Updated `RegressionSlot` interface
   - Added `ReleaseFrequency` type

2. **Components**:
   - `app/components/ReleaseConfig/Scheduling/SchedulingConfig.tsx` - Main component (rewritten)
   - `app/components/ReleaseConfig/Scheduling/ReleaseFrequencySelector.tsx` - Added TRIWEEKLY

3. **Utils**: `app/utils/default-config.ts`
   - Updated default scheduling configuration

## Integration

The scheduling step is already integrated into the `ConfigurationWizard` component:

```tsx
<SchedulingConfig
  config={config.scheduling!}
  onChange={(scheduling) => setConfig({ ...config, scheduling })}
/>
```

## Testing Checklist

- [ ] Verify all fields render correctly
- [ ] Test date picker (min date = today)
- [ ] Test time inputs (HH:MM format)
- [ ] Verify kickoff reminder validation
- [ ] Verify target offset validation (≥ 0)
- [ ] Add regression slots
- [ ] Edit regression slots
- [ ] Delete regression slots
- [ ] Verify regression slot offset validation
- [ ] Verify regression slot time validation (when offsets match)
- [ ] Test working days selector
- [ ] Test timezone picker
- [ ] Test frequency selector with custom days
- [ ] Verify validation error display
- [ ] Test save/submit with valid configuration
- [ ] Test save/submit with invalid configuration (should block)

## Notes

- All validation happens in real-time using `useMemo`
- Validation errors are collected and displayed at the top
- Individual field errors are also shown for better UX
- The component is fully TypeScript typed with proper interfaces
- All time comparisons are done using minutes for consistency

