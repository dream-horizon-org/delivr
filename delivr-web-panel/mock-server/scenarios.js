#!/usr/bin/env node

/**
 * Quick UI Testing Scenarios Toggle
 * 
 * Usage:
 *   node mock-server/scenarios.js empty   → Test empty state
 *   node mock-server/scenarios.js active  → Test with 2 distributions
 *   node mock-server/scenarios.js many    → Test pagination (20 items)
 *   node mock-server/scenarios.js mixed   → Test mixed statuses
 *   node mock-server/scenarios.js history → Test submission history (run after 'many')
 *   node mock-server/scenarios.js reset   → Restore original
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'db.json');
const backupPath = path.join(__dirname, 'data', 'db.backup.json');

// Backup original if doesn't exist
if (!fs.existsSync(backupPath)) {
  const original = fs.readFileSync(dbPath, 'utf8');
  fs.writeFileSync(backupPath, original);
  console.log('📦 Created backup: db.backup.json');
}

const scenarios = {
  /**
   * EMPTY STATE
   * All releases hidden (status: IN_PROGRESS) AND no submissions
   * Result: "No Active Distributions" message
   */
  empty: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Hide all releases
    db.releases.forEach(r => {
      r.status = 'IN_PROGRESS';
    });
    
    // Clear all submissions (so no distributions are returned)
    db.submissions = [];
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ EMPTY STATE: All releases hidden AND submissions cleared');
    console.log('   Expected: "No Active Distributions" message');
    console.log('   Refresh browser to see changes');
  },
  
  /**
   * ACTIVE STATE
   * 2 distributions visible
   * Result: Table with data, stats cards
   */
  active: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Make first 2 releases visible
    if (db.releases[0]) db.releases[0].status = 'SUBMITTED';
    if (db.releases[1]) db.releases[1].status = 'SUBMITTED';
    
    // Hide rest
    for (let i = 2; i < db.releases.length; i++) {
      db.releases[i].status = 'IN_PROGRESS';
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ ACTIVE STATE: 2 distributions visible');
    console.log('   Expected: Table with 2 rows, stats cards');
    console.log('   Refresh browser to see changes');
  },
  
  /**
   * FIVE DISTRIBUTIONS
   * Exactly 5 distributions visible
   * Result: Table with 5 rows, no pagination (< 10 items)
   * 
   * Distribution Statuses (Backend Spec):
   * - PENDING: Created after pre-release, not yet submitted
   * - PARTIALLY_RELEASED: Some platforms released (e.g., only Android)
   * - COMPLETED: All platforms fully released (100%)
   */
  five: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Make first 5 releases visible with different distribution statuses
    const statuses = ['PENDING', 'PARTIALLY_RELEASED', 'COMPLETED', 'PENDING', 'PARTIALLY_RELEASED'];
    
    for (let i = 0; i < 5; i++) {
      if (db.releases[i]) {
        db.releases[i].status = statuses[i];
      }
    }
    
    // Hide rest
    for (let i = 5; i < db.releases.length; i++) {
      db.releases[i].status = 'IN_PROGRESS';
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ FIVE DISTRIBUTIONS: 5 distributions visible');
    console.log('   Statuses: PENDING, PARTIALLY_RELEASED, COMPLETED');
    console.log('   Expected: Table with 5 rows, stats cards');
    console.log('   Expected: NO pagination (< 10 items)');
    console.log('   Refresh browser to see changes');
  },
  
  /**
   * MANY ITEMS (Pagination Test)
   * 20+ distributions with submissions
   * Result: Pagination controls appear
   */
  many: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Clear existing data
    db.distributions = [];
    db.submissions = [];
    
    // Distribution statuses
    const distStatuses = ['PENDING', 'PARTIALLY_RELEASED', 'SUBMITTED', 'PARTIALLY_RELEASED', 'RELEASED'];
    const submissionStatuses = ['PENDING', 'IN_REVIEW', 'APPROVED', 'LIVE', 'LIVE'];
    const rolloutPercentages = [0, 0, 0, 25, 100];
    
    // Create 20 releases with distributions and submissions
    const baseRelease = db.releases[0];
    db.releases = []; // Clear existing
    
    for (let i = 0; i < 20; i++) {
      // Determine platform targets (vary for realism)
      // Pattern: Both, Android-only, iOS-only, Both, Both, ...
      let targetPlatforms;
      if (i % 5 === 1) {
        targetPlatforms = ['ANDROID']; // Android-only
      } else if (i % 5 === 2) {
        targetPlatforms = ['IOS']; // iOS-only
      } else {
        targetPlatforms = ['ANDROID', 'IOS']; // Both platforms
      }
      
      // Create release
      const release = JSON.parse(JSON.stringify(baseRelease));
      release.id = `test-release-${String(i).padStart(3, '0')}`;
      release.releaseId = `REL-TEST-${String(i).padStart(3, '0')}`;
      release.branch = `release/3.${i}.0`;
      release.version = `3.${i}.0`;
      release.status = 'SUBMITTED';
      
      // Set platform target mappings based on what platforms are targeted
      release.platformTargetMappings = targetPlatforms.map(platform => ({
        id: `pt-${i}-${platform}`,
        releaseId: release.id,
        platform: platform,
        version: `3.${i}.0`
      }));
      
      db.releases.push(release);
      
      // Create distribution
      const distId = `dist_${String(i + 1).padStart(3, '0')}`;
      db.distributions.push({
        id: distId,
        tenantId: 'EkgmIbgGQx',
        releaseId: release.id,
        status: distStatuses[i % distStatuses.length],
        createdAt: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Create submissions ONLY for targeted platforms
      if (targetPlatforms.includes('ANDROID')) {
        db.submissions.push({
          id: `sub-android-${i}`,
          distributionId: distId,
          releaseId: release.id,
          platform: 'ANDROID',
          storeType: 'PLAY_STORE',
          status: submissionStatuses[i % submissionStatuses.length],
          version: `3.${i}.0`,
          versionCode: 300 + i,
          rolloutPercentage: rolloutPercentages[i % rolloutPercentages.length],
          inAppUpdatePriority: 0,
          releaseNotes: `Release 3.${i}.0 - Bug fixes and improvements`,
          submittedAt: i % 5 === 0 ? null : new Date(Date.now() - (19 - i) * 86400000).toISOString(),
          submittedBy: i % 5 === 0 ? null : 'prince@dream11.com',
          statusUpdatedAt: new Date(Date.now() - (19 - i) * 43200000).toISOString(),
          createdAt: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - (19 - i) * 43200000).toISOString(),
          isActive: true, // ✅ Active submission
          artifact: {
            artifactPath: `https://s3.amazonaws.com/builds/android-3.${i}.0.aab`,
            internalTrackLink: i === 0 ? `https://play.google.com/apps/testing/com.app.${i}` : undefined
          },
          actionHistory: []
        });
      }
      
      if (targetPlatforms.includes('IOS')) {
        db.submissions.push({
          id: `sub-ios-${i}`,
          distributionId: distId,
          releaseId: release.id,
          platform: 'IOS',
          storeType: 'APP_STORE',
          status: submissionStatuses[(i + 1) % submissionStatuses.length],
          version: `3.${i}.0`,
          releaseType: 'AFTER_APPROVAL',
          phasedRelease: i % 2 === 0,
          resetRating: false,
          rolloutPercentage: rolloutPercentages[(i + 1) % rolloutPercentages.length],
          releaseNotes: `Release 3.${i}.0 - Bug fixes and improvements`,
          isActive: true, // ✅ Active submission
          submittedAt: i % 5 === 0 ? null : new Date(Date.now() - (19 - i) * 86400000).toISOString(),
          submittedBy: i % 5 === 0 ? null : 'prince@dream11.com',
          statusUpdatedAt: new Date(Date.now() - (19 - i) * 43200000).toISOString(),
          createdAt: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - (19 - i) * 43200000).toISOString(),
          artifact: {
            testflightNumber: 50000 + i
          },
          actionHistory: []
        });
      }
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`✅ MANY ITEMS: ${db.distributions.length} distributions (${db.submissions.length} submissions)`);
    console.log('   Platform mix: Both platforms, Android-only, iOS-only, Both, Both (repeating)');
    console.log('   Expected: Some distributions show only 🤖, some only 🍎, most show both');
    console.log('   Expected: Pagination controls at bottom');
    console.log('   Expected: "Showing 1-10 of 20" on page 1');
    console.log('   Refresh browser to see changes');
  },
  
  /**
   * MIXED STATUS
   * Different statuses for visual variety
   * Result: Various colored badges
   */
  mixed: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    const statuses = ['SUBMITTED', 'RELEASED', 'PRE_RELEASE', 'HALTED'];
    
    db.releases.forEach((r, i) => {
      if (i < 8) {
        // First 8 with various statuses
        r.status = statuses[i % statuses.length];
      } else {
        // Rest hidden
        r.status = 'IN_PROGRESS';
      }
    });
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ MIXED STATUS: Various statuses visible');
    console.log('   Expected: Different colored badges (cyan, green, gray, orange)');
    console.log('   Refresh browser to see changes');
  },
  
  /**
   * DETAILED HISTORY
   * First distribution has multiple submissions (historical + active)
   * Perfect for testing detail page with submission history
   * 
   * NOTE: Run "node scenarios.js many" first to create distributions
   */
  history: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Clear existing submissions for first distribution
    const firstDist = db.distributions[0];
    if (!firstDist) {
      console.error('❌ No distributions found. Run "node scenarios.js many" first.');
      return;
    }
    
    // Remove existing submissions for this distribution
    db.submissions = db.submissions.filter(s => s.distributionId !== firstDist.id);
    
    const distId = firstDist.id;
    const releaseId = firstDist.releaseId;
    
    // Android: 2 Historical + 1 Active
    db.submissions.push({
        id: `sub-android-hist-1`,
        distributionId: distId,
        releaseId: releaseId,
        platform: 'ANDROID',
        storeType: 'PLAY_STORE',
        status: 'REJECTED',
        version: '3.0.0',
        versionCode: 300,
        rolloutPercentage: 5,
        inAppUpdatePriority: 0,
        releaseNotes: 'Initial release - rejected due to policy violation',
        submittedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        submittedBy: 'prince@dream11.com',
        statusUpdatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        isActive: false,
        artifact: { artifactPath: `https://s3.amazonaws.com/builds/android-3.0.0-v1.aab` },
        actionHistory: []
      },
      {
        id: `sub-android-hist-2`,
        distributionId: distId,
        releaseId: releaseId,
        platform: 'ANDROID',
        storeType: 'PLAY_STORE',
        status: 'CANCELLED',
        version: '3.0.0',
        versionCode: 301,
        rolloutPercentage: 5,
        inAppUpdatePriority: 0,
        releaseNotes: 'Release 3.0.0 - Fixed policy issues',
        submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        submittedBy: 'prince@dream11.com',
        statusUpdatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        isActive: false,
        artifact: { artifactPath: `https://s3.amazonaws.com/builds/android-3.0.0-v2.aab` },
        actionHistory: [{
          action: 'CANCELLED',
          performedBy: 'prince@dream11.com',
          performedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          reason: 'Found critical bug, cancelling to resubmit with fix'
        }]
      },
      {
        id: `sub-android-active`,
        distributionId: distId,
        releaseId: releaseId,
        platform: 'ANDROID',
        storeType: 'PLAY_STORE',
        status: 'LIVE',
        version: '3.0.0',
        versionCode: 302,
        rolloutPercentage: 25,
        inAppUpdatePriority: 0,
        releaseNotes: 'Release 3.0.0 - All issues fixed, rolling out',
        submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        submittedBy: 'prince@dream11.com',
        statusUpdatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        isActive: true,
        artifact: {
          artifactPath: `https://s3.amazonaws.com/builds/android-3.0.0-v3.aab`,
          internalTrackLink: `https://play.google.com/apps/testing/com.app.test`
        },
        actionHistory: []
      }
    );
    
    // iOS: 1 Historical + 1 Active (PAUSED)
    db.submissions.push({
        id: `sub-ios-hist-1`,
        distributionId: distId,
        releaseId: releaseId,
        platform: 'IOS',
        storeType: 'APP_STORE',
        status: 'REJECTED',
        version: '3.0.0',
        releaseType: 'AFTER_APPROVAL',
        phasedRelease: true,
        resetRating: false,
        rolloutPercentage: 0,
        releaseNotes: 'Initial iOS release - rejected',
        submittedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
        submittedBy: 'prince@dream11.com',
        statusUpdatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        isActive: false,
        artifact: { testflightNumber: 1001 },
        actionHistory: []
      },
      {
        id: `sub-ios-active`,
        distributionId: distId,
        releaseId: releaseId,
        platform: 'IOS',
        storeType: 'APP_STORE',
        status: 'PAUSED',
        version: '3.0.0',
        releaseType: 'AFTER_APPROVAL',
        phasedRelease: true,
        resetRating: false,
        rolloutPercentage: 50,
        releaseNotes: 'Release 3.0.0 - Phased release (paused for monitoring)',
        submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        submittedBy: 'prince@dream11.com',
        statusUpdatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        isActive: true,
        artifact: { testflightNumber: 1002 },
        actionHistory: [{
          action: 'PAUSED',
          performedBy: 'prince@dream11.com',
          performedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          reason: 'Monitoring crash reports before continuing rollout'
        }]
      }
    );
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ DETAILED HISTORY: First distribution now has submission history');
    console.log('   Android: 2 historical (REJECTED, CANCELLED) + 1 active (LIVE 25%)');
    console.log('   iOS: 1 historical (REJECTED) + 1 active (PAUSED 50%)');
    console.log('   Navigate to first distribution to test detail page');
    console.log('   Refresh browser to see changes');
  },
  
  /**
   * RESET
   * Restore original db.json from backup
   */
  reset: () => {
    if (!fs.existsSync(backupPath)) {
      console.log('❌ No backup found');
      return;
    }
    
    const backup = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(dbPath, backup);
    console.log('✅ RESET: Restored original db.json');
    console.log('   Refresh browser to see changes');
  },
  
  /**
   * WITH SUBMISSIONS
   * Add platform submissions with rollout progress
   * Result: Progress bars showing rollout percentages
   */
  submissions: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // ✅ Ensure distributions table exists
    if (!db.distributions) {
      db.distributions = [];
    }
    
    // Make first 3 releases visible
    const visibleReleases = db.releases.slice(0, 3);
    visibleReleases.forEach(r => r.status = 'SUBMITTED');
    
    // Hide rest
    db.releases.slice(3).forEach(r => r.status = 'IN_PROGRESS');
    
    // Clear existing distributions and submissions
    db.distributions = [];
    db.submissions = [];
    
    // Add submissions with different rollout stages (✅ 100% API Spec Compliant)
    const rolloutPercentages = [10, 50, 100];
    const distStatuses = ['PARTIALLY_RELEASED', 'SUBMITTED', 'RELEASED'];
    
    visibleReleases.forEach((release, index) => {
      const distId = `dist_${String(index + 1).padStart(3, '0')}`;
      
      // ✅ Add distribution entry
      db.distributions.push({
        id: distId,
        tenantId: 'EkgmIbgGQx',
        releaseId: release.id,
        status: distStatuses[index],
        createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Android submission
      db.submissions.push({
        id: `sub-android-${index}`,
        distributionId: distId,
        platform: 'ANDROID',
        storeType: 'PLAY_STORE',
        status: 'LIVE',
        version: release.platformTargetMappings?.[0]?.version || 'v2.7.0',
        versionCode: 270 + index,
        rolloutPercentage: rolloutPercentages[index],
        inAppUpdatePriority: 0,
        releaseNotes: 'Bug fixes and improvements',
        submittedAt: '2025-12-13T10:00:00.000Z',
        submittedBy: 'test@example.com',
        statusUpdatedAt: '2025-12-13T12:00:00.000Z',
        createdAt: '2025-12-13T10:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z',
        artifact: {
          artifactPath: 'https://s3.amazonaws.com/presigned-url/app-release.aab',
          internalTrackLink: 'https://play.google.com/apps/testing/com.app'
        },
        actionHistory: []
      });
      
      // iOS submission
      db.submissions.push({
        id: `sub-ios-${index}`,
        distributionId: distId,
        platform: 'IOS',
        storeType: 'APP_STORE',
        status: index === 2 ? 'LIVE' : 'IN_REVIEW',
        version: release.platformTargetMappings?.[1]?.version || 'v2.7.0',
        releaseType: 'AFTER_APPROVAL',
        phasedRelease: true,
        resetRating: false,
        rolloutPercentage: index === 2 ? 100 : 0,
        releaseNotes: 'Bug fixes and improvements',
        submittedAt: '2025-12-13T10:00:00.000Z',
        submittedBy: 'test@example.com',
        statusUpdatedAt: '2025-12-13T12:00:00.000Z',
        createdAt: '2025-12-13T10:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z',
        artifact: {
          testflightNumber: 56789 + index
        },
        actionHistory: []
      });
    });
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ WITH SUBMISSIONS: 3 distributions with platform submissions');
    console.log('   Expected: Platform icons with progress bars');
    console.log('   Expected: 10%, 50%, 100% rollout displayed');
    console.log('   Refresh browser to see changes');
  },
};

// Run scenario
const scenario = process.argv[2];

if (!scenario) {
  console.log('');
  console.log('🧪 Distribution UI Testing Scenarios');
  console.log('');
  console.log('Usage: node mock-server/scenarios.js <scenario>');
  console.log('');
  console.log('Available scenarios:');
  console.log('  empty        → No distributions (empty state)');
  console.log('  active       → 2 distributions visible');
  console.log('  five         → 5 distributions (no pagination)');
  console.log('  many         → 20 distributions (pagination test)');
  console.log('  mixed        → Various statuses (visual variety)');
  console.log('  submissions  → With platform submissions & rollout');
  console.log('  reset        → Restore original data');
  console.log('');
  console.log('Recommended testing order:');
  console.log('  1. Test loading state → Use DevTools Network throttling');
  console.log('  2. node mock-server/scenarios.js empty');
  console.log('  3. Stop mock server (Ctrl+C) → Test error state');
  console.log('  4. Restart mock server → node mock-server/scenarios.js five');
  console.log('  5. node mock-server/scenarios.js many');
  console.log('');
  console.log('Example:');
  console.log('  node mock-server/scenarios.js empty');
  console.log('  # Refresh browser to see empty state');
  console.log('');
  process.exit(0);
}

if (scenarios[scenario]) {
  console.log('');
  scenarios[scenario]();
  console.log('');
} else {
  console.log(`❌ Unknown scenario: ${scenario}`);
  console.log('Available: empty, active, many, mixed, submissions, reset');
  process.exit(1);
}

