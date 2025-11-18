# Release Configuration - User Guide

## 🚀 Quick Start: How to Access Release Configuration

### Option 1: From Release Dashboard (Primary Entry Point)

1. Navigate to **Dashboard** → Select your **Organization** → **Releases**
2. You'll see one of two things:
   - **If NOT Configured**: A prominent **blue banner** at the top saying "Configure Your Release Process" with a **"Configure Release"** button
   - **If Configured**: Normal dashboard with stats and releases

3. Click **"Configure Release"** button (either from banner or top navigation)

### Option 2: From Header Navigation

1. On the **Release Dashboard**, look at the top-right buttons:
   - **Configure Release** (⚙️ Settings icon)
   - View All Releases
   - Create Release

2. Click **"Configure Release"** to start the configuration wizard

### Option 3: Direct URL

Navigate directly to: `/dashboard/{your-org}/releases/configure`

---

## 📋 Complete Flow: First-Time Configuration

### Step 1: Basic Information
**What you'll configure:**
- Configuration Name (e.g., "Standard Release Configuration")
- Description (optional)
- Release Type (Planned/Hotfix/Emergency)
- Set as Default (toggle)

**Example:**
```
Name: Dream11 Standard Release
Description: Bi-weekly releases with full regression testing
Type: Planned Release
Default: ✓ Yes
```

### Step 2: Build Pipelines
**What you'll configure:**
- Add build pipelines for each platform and environment
- **Required Pipelines:**
  - ✅ Android Pre-Regression
  - ✅ Android Regression
  - ✅ iOS Pre-Regression (if using iOS)
  - ✅ iOS Regression (if using iOS)
  - ✅ iOS TestFlight (if using iOS)

**For each pipeline:**
1. Click **"Add Pipeline"**
2. Enter:
   - Pipeline Name (e.g., "Android Pre-Regression Build")
   - Platform (Android/iOS)
   - Environment (Pre-Regression/Regression/TestFlight)
   - Provider (Jenkins/GitHub Actions/Manual Upload)
3. Configure provider-specific settings:
   - **Jenkins**: Job URL, Job Name, Parameters
   - **GitHub Actions**: Workflow Path, Branch, Inputs
   - **Manual Upload**: Instructions (optional)

**Example - Jenkins Pipeline:**
```
Name: Android Pre-Regression Build
Platform: Android
Environment: Pre-Regression
Provider: Jenkins
Jenkins Instance: Jenkins Production
Job URL: https://jenkins.company.com/job/android-preregression
Job Name: android-preregression
Parameters:
  - BRANCH: release/*
  - BUILD_TYPE: preregression
```

### Step 3: Target Platforms
**What you'll select:**
- ☐ Web (Android) - CodePush updates
- ☐ Play Store - Google Play Store distribution
- ☐ App Store - Apple App Store via TestFlight

**Note:** At least one platform must be selected.

### Step 4: Test Management (Optional)
**What you'll configure:**
- Enable/Disable test management integration
- Select Provider:
  - Checkmate ✅ (Available)
  - TestRail (Coming Soon)
  - Zephyr (Coming Soon)

**If using Checkmate:**
- Workspace ID
- Project ID
- Test Run Name Template (e.g., "v{{version}} - {{platform}} - {{date}}")
- Auto-create test runs (toggle)

### Step 5: Scheduling
**What you'll configure:**

**A. Release Frequency:**
- Weekly (7 days)
- Biweekly (14 days)
- Monthly (30 days)
- Custom (specify days)

**B. Timezone:**
- Select your team's timezone (e.g., Asia/Kolkata, America/New_York)

**C. Working Days:**
- Select which days your team works (typically Mon-Fri)

**D. Default Timings:**
- Default Release Time (e.g., 18:00)
- Default Kickoff Time (e.g., 10:00)
- Kickoff Lead Days (days before release, e.g., 7)

**E. Kickoff Reminder (Optional):**
- Reminder Time
- Reminder Lead Days

**F. Regression Slots:**
Add regression testing slots throughout the release cycle.

**Example Regression Slot:**
```
Name: Evening Regression Slot 1
Days Offset from Kickoff: 0 (same day)
Time: 21:00
Activities:
  ✓ Trigger Regression Builds
  ✓ Post Release Notes
  ☐ Trigger Automation Builds
  ☐ Run Automated Tests
```

**Dream11 Example (from OG Delivr):**
```
Slot 1: Day 0, 21:00 (9 PM) - First regression
Slot 2: Day 0, 16:00 (4 PM) - Second regression
Slot 3: Day 0, 14:00 (2 PM) - Third regression
```

### Step 6: Communication (Optional)
**What you'll configure:**

**A. Slack Integration:**
- Enable/Disable
- Select Slack Workspace
- Map Channels:
  - **Releases Channel** (e.g., #releases)
  - **Builds Channel** (e.g., #builds)
  - **Regression Channel** (e.g., #regression)
  - **Critical Alerts Channel** (e.g., #critical-alerts)

**B. Email Notifications:**
- Enable/Disable
- Add recipient email addresses

### Step 7: Review & Submit
**What you'll see:**
- Complete summary of your configuration
- All configured pipelines
- Selected platforms
- Test management status
- Scheduling overview
- Communication settings

**Actions:**
- Review everything
- Click **"Save Configuration"** to finalize

---

## 🎯 Using Your Configuration

### Creating a Release with Configuration

**Option 1: From Release Dashboard**
1. Click **"Create Release"** on the dashboard
2. System will automatically use your default configuration
3. Enter release-specific details:
   - Version (e.g., v1.2.3)
   - Kickoff Date
   - Release Date
   - Description (optional)

**Option 2: Instant Release Modal**
1. The system shows an "Instant Release" modal
2. Select your configuration (if you have multiple)
3. Configuration details are displayed:
   - Number of pipelines
   - Target platforms
   - Frequency
   - Regression slots
4. Fill in release details and click **"Create Release"**

---

## ⚙️ Managing Configurations

### Viewing All Configurations

**From Settings:**
1. Navigate to **Settings** → **Release Configuration**
2. See all configurations with:
   - Status (Active/Draft/Archived)
   - Type (Planned/Hotfix/Emergency)
   - Details (pipelines, platforms, frequency)

**Filtering:**
- Search by name/description
- Filter by Status
- Filter by Type

### Editing a Configuration

1. Find the configuration in the list
2. Click the **three dots menu** (⋮)
3. Select **"Edit Configuration"**
4. Wizard opens with existing values pre-filled
5. Make changes and save

### Duplicating a Configuration

**Use Case:** Create a "Hotfix Configuration" based on your standard config

1. Find the configuration to duplicate
2. Click **three dots menu** (⋮)
3. Select **"Duplicate"**
4. System creates a copy with "(Copy)" appended
5. Edit the duplicate as needed

### Setting a Default Configuration

1. Find the configuration you want as default
2. Click **three dots menu** (⋮)
3. Select **"Set as Default"**
4. Star icon (⭐) appears next to the configuration

**Note:** Only one configuration can be default at a time.

### Archiving a Configuration

1. Find the configuration to archive
2. Click **three dots menu** (⋮)
3. Select **"Archive"**
4. Configuration status changes to "Archived"
5. Archived configs won't appear in release creation

### Exporting a Configuration

**Use Case:** Share configuration with another organization or backup

1. Click **three dots menu** (⋮)
2. Select **"Export JSON"**
3. JSON file downloads automatically
4. Share or store the file

---

## 💡 Best Practices

### Configuration Naming

**Good:**
- "Standard Biweekly Release"
- "Hotfix Configuration"
- "Emergency Release - No Regression"

**Bad:**
- "Config 1"
- "Test"
- "My Configuration"

### Regression Slots

**Recommended Approach:**
1. **Start Simple:** 1-2 regression slots
2. **Test the Flow:** Run through a complete release cycle
3. **Iterate:** Add more slots as needed
4. **Consider Timezones:** Schedule slots during working hours

### Build Pipelines

**Must-Haves:**
- ✅ Pre-Regression builds (for initial testing)
- ✅ Regression builds (for regression testing)
- ✅ TestFlight builds (iOS only, for distribution)

**Optional:**
- Production builds (if different from regression)
- Automation builds (for automated testing)

### Multiple Configurations

**When to Create Multiple:**
- Different release types (Planned vs Hotfix vs Emergency)
- Different frequencies (Weekly vs Monthly)
- Different platforms (Android-only vs iOS-only vs Both)
- Different teams (if using same Delivr instance)

**Example:**
```
1. "Standard Release" (default)
   - Biweekly
   - Full regression (3 slots)
   - All platforms

2. "Hotfix Release"
   - No schedule
   - Minimal regression (1 slot)
   - Target-specific platforms

3. "Emergency Release"
   - No schedule
   - No regression
   - Manual uploads only
```

---

## 🔧 Troubleshooting

### Configuration Won't Save

**Check:**
- ✅ All required pipelines configured (Android Pre-Regression + Regression)
- ✅ At least one target platform selected
- ✅ At least one working day selected
- ✅ At least one regression slot created
- ✅ Default release and kickoff times set

### Banner Still Shows After Configuration

**Reason:** Configuration might be in "Draft" status

**Fix:**
1. Go to **Settings** → **Release Configuration**
2. Find your configuration
3. Check status - should be "Active" not "Draft"
4. If Draft, edit and complete all required steps

### Can't Create Release

**Possible Issues:**
1. No active configuration exists
2. Configuration is in Draft status
3. Configuration is Archived

**Fix:**
1. Create a new configuration OR
2. Set an existing configuration as Active OR
3. Un-archive a configuration

### Build Pipeline Shows Error

**Common Issues:**
- Invalid Job URL
- Missing Parameters
- Integration not connected

**Fix:**
1. Edit the pipeline
2. Verify provider-specific settings:
   - **Jenkins**: Job URL accessible, credentials valid
   - **GitHub Actions**: Workflow file exists, branch correct
3. Test integration in Integrations page first

---

## 📊 Configuration Validation

The system validates your configuration automatically:

### Build Pipelines
- ✅ At least one pipeline exists
- ✅ Android Pre-Regression (required)
- ✅ Android Regression (required)
- ✅ iOS Pre-Regression (required if iOS enabled)
- ✅ iOS Regression (required if iOS enabled)
- ✅ iOS TestFlight (required if iOS enabled)
- ✅ No duplicate platform + environment combinations
- ✅ All provider-specific fields filled

### Target Platforms
- ✅ At least one platform selected

### Scheduling
- ✅ Default release time set
- ✅ Default kickoff time set
- ✅ At least one working day selected
- ✅ At least one regression slot created
- ✅ Timezone selected

### Communication
- ⚠️ Optional - validation warnings only

---

## 🎓 Advanced Topics

### Local Storage Persistence

**How it works:**
- As you configure, draft is saved to browser's local storage
- You can close the wizard and come back later
- Draft persists until you:
  - Submit the configuration (draft cleared)
  - Clear browser data
  - Open from a different browser

**To resume a draft:**
1. Navigate to `/dashboard/{org}/releases/configure`
2. Wizard opens with your last saved state

### Configuration as Code

**Exporting:**
1. Export configuration as JSON
2. JSON contains complete configuration structure
3. Includes all pipelines, schedules, settings

**Importing (Future):**
- Import JSON to create new configuration
- Useful for:
  - Migrating between organizations
  - Backup and restore
  - Version control

### API Integration

**For Backend Teams:**
All frontend API routes are stubbed and ready:
- `POST /api/v1/tenants/:tenantId/release-config` - Create
- `PUT /api/v1/tenants/:tenantId/release-config` - Update
- `DELETE /api/v1/tenants/:tenantId/release-config` - Delete
- `GET /api/v1/tenants/:tenantId/release-config` - Get all/specific
- `POST /api/v1/tenants/:tenantId/release-config/validate` - Validate
- `POST /api/v1/tenants/:tenantId/releases/create-with-config` - Create release

---

## 📞 Support

### Need Help?
- Check this guide first
- Review `DELIVR_MIGRATION_SOLUTION.md` for technical details
- Review `RELEASE_CONFIG_IMPLEMENTATION.md` for implementation details

### Common Questions

**Q: Can I have multiple configurations?**  
A: Yes! Create as many as needed for different release types.

**Q: Can I edit a configuration after creation?**  
A: Yes, click "Edit Configuration" from the settings page.

**Q: What happens to existing releases if I change configuration?**  
A: Existing releases use their original configuration. Only new releases use the updated config.

**Q: Can I delete a configuration?**  
A: You can archive it. Archived configurations won't appear in release creation.

**Q: Do I need to configure everything?**  
A: No. Only Build Pipelines, Target Platforms, and Scheduling are required. Test Management and Communication are optional.

---

**Last Updated:** November 18, 2025  
**Version:** 1.0.0

