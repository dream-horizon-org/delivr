#!/usr/bin/env node

/**
 * Quick UI Testing Scenarios Toggle
 * 
 * Usage:
 *   node mock-server/scenarios.js empty   → Test empty state
 *   node mock-server/scenarios.js active  → Test with 2 distributions
 *   node mock-server/scenarios.js many    → Test pagination (20 items)
 *   node mock-server/scenarios.js mixed   → Test mixed statuses
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
   * 20+ distributions
   * Result: Pagination controls appear
   */
  many: () => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Distribution statuses that mock server accepts
    const distStatuses = ['PENDING', 'PARTIALLY_RELEASED', 'COMPLETED'];
    
    // Make all existing releases visible with distribution statuses
    db.releases.forEach((r, i) => {
      r.status = distStatuses[i % distStatuses.length];
    });
    
    // Clone first release multiple times to create 20 total
    const baseRelease = db.releases[0];
    while (db.releases.length < 20) {
      const clone = JSON.parse(JSON.stringify(baseRelease));
      const index = db.releases.length;
      
      // Update IDs to be unique
      clone.id = `test-release-${index}`;
      clone.releaseId = `REL-TEST-${String(index).padStart(3, '0')}`;
      clone.status = distStatuses[index % distStatuses.length]; // ✅ Use distribution statuses
      
      // Update version in platformTargetMappings
      if (clone.platformTargetMappings) {
        clone.platformTargetMappings.forEach(pt => {
          pt.id = `pt-${index}-${pt.platform}`;
          pt.releaseId = clone.id;
          pt.version = `v3.${index}.0`;
        });
      }
      
      clone.branch = `release/3.${index}.0`;
      
      db.releases.push(clone);
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`✅ MANY ITEMS: ${db.releases.length} distributions`);
    console.log('   Expected: Pagination controls at bottom');
    console.log('   Expected: "Showing 1-10 of 20" text');
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
    
    // Make first 3 releases visible
    const visibleReleases = db.releases.slice(0, 3);
    visibleReleases.forEach(r => r.status = 'SUBMITTED');
    
    // Hide rest
    db.releases.slice(3).forEach(r => r.status = 'IN_PROGRESS');
    
    // Clear existing submissions
    db.submissions = [];
    
    // Add submissions with different rollout stages
    const rolloutPercentages = [10, 50, 100];
    
    visibleReleases.forEach((release, index) => {
      // Android submission
      db.submissions.push({
        id: `sub-android-${index}`,
        releaseId: release.id,
        platform: 'ANDROID',
        submissionStatus: 'LIVE',
        exposurePercent: rolloutPercentages[index],
        storeSubmissionId: `play-${Date.now()}-${index}`,
        trackName: 'production',
        releaseNotes: {
          'en-US': 'Bug fixes and improvements'
        },
        createdAt: '2025-12-13T10:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z'
      });
      
      // iOS submission
      db.submissions.push({
        id: `sub-ios-${index}`,
        releaseId: release.id,
        platform: 'IOS',
        submissionStatus: index === 2 ? 'LIVE' : 'IN_REVIEW',
        exposurePercent: index === 2 ? 100 : 0,
        storeSubmissionId: `testflight-${Date.now()}-${index}`,
        releaseNotes: {
          'en-US': 'Bug fixes and improvements'
        },
        createdAt: '2025-12-13T10:00:00.000Z',
        updatedAt: '2025-12-13T12:00:00.000Z'
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

