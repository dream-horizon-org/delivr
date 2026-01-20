#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const db = {
  releases: [],
  store_distribution: [],
  android_submission_builds: [],
  ios_submission_builds: []
};

// Helper to generate dates
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

// Calculate correct distribution status based on submissions
// Key Rules:
// 1. APPROVED, LIVE, PAUSED, HALTED are all considered "released" for distribution status
// 2. Distribution becomes RELEASED once all platforms are "released" and NEVER changes after that
// 3. Single platform: PENDING → SUBMITTED → RELEASED
// 4. Two platforms: PENDING → PARTIALLY_SUBMITTED → SUBMITTED → PARTIALLY_RELEASED → RELEASED
function calculateDistributionStatus(platforms, androidSub, iosSub) {
  const singlePlatform = platforms.length === 1;
  
  // Helper: Check if submission is "released" (APPROVED or beyond)
  const isReleased = (sub) => ['APPROVED', 'LIVE', 'PAUSED', 'HALTED'].includes(sub.status);
  
  if (singlePlatform) {
    // Single platform: PENDING → SUBMITTED → RELEASED (no PARTIALLY_*)
    const sub = androidSub || iosSub;
    
    if (sub.status === 'PENDING') return 'PENDING';
    if (isReleased(sub)) return 'RELEASED'; // APPROVED or beyond = RELEASED
    // IN_REVIEW = SUBMITTED
    return 'SUBMITTED';
  } else {
    // Two platforms: More complex logic
    const submissions = [androidSub, iosSub].filter(Boolean);
    
    // Both PENDING
    if (submissions.every(s => s.status === 'PENDING')) {
      return 'PENDING';
    }
    
    // Both "released" (APPROVED or beyond) → RELEASED (immutable)
    if (submissions.every(isReleased)) {
      return 'RELEASED';
    }
    
    // At least one "released", but not both → PARTIALLY_RELEASED
    if (submissions.some(isReleased)) {
      return 'PARTIALLY_RELEASED';
    }
    
    // Both submitted (IN_REVIEW) but neither "released" yet
    if (submissions.every(s => s.status === 'IN_REVIEW')) {
      return 'SUBMITTED';
    }
    
    // At least one submitted (IN_REVIEW), the other is PENDING → PARTIALLY_SUBMITTED
    if (submissions.some(s => s.status === 'IN_REVIEW') && submissions.some(s => s.status === 'PENDING')) {
      return 'PARTIALLY_SUBMITTED';
    }
    
    return 'PENDING';
  }
}

// Generate 30 distributions with correct logic
for (let i = 0; i < 30; i++) {
  const releaseId = `rel_${String(i + 1).padStart(3, '0')}`;
  const distId = `dist_${String(i + 1).padStart(3, '0')}`;
  const version = `3.${i}.0`;
  const versionCode = 300 + i;
  
  // Determine platforms - vary the pattern realistically
  let platforms = ['ANDROID', 'IOS']; // Most are both
  if (i % 8 === 1) platforms = ['ANDROID']; // ~12% Android-only
  if (i % 8 === 2) platforms = ['IOS'];     // ~12% iOS-only
  
  // Create release
  db.releases.push({
    id: releaseId,
    releaseId: `REL-2025-${String(i + 1).padStart(3, '0')}`,
    tenantId: 'EkgmIbgGQx',
    branch: `release/${version}`,
    version: version,
    status: 'SUBMITTED',
    platformTargetMappings: platforms.map(p => ({
      id: `ptm_${i + 1}_${p.toLowerCase()}`,
      releaseId: releaseId,
      platform: p,
      version: version
    })),
    createdAt: daysAgo(30 - i),
    updatedAt: daysAgo(Math.max(0, 30 - i - 5))
  });
  
  // Determine submission statuses based on distribution position
  // Create realistic progression scenarios
  let androidStatus = null;
  let androidRollout = 0;
  let iosStatus = null;
  let iosRollout = 0;
  
  // Generate realistic submission statuses following the action flow:
  // PENDING → submit → IN_REVIEW → approved → APPROVED → release → LIVE
  // LIVE → pause (iOS only) → PAUSED → resume → LIVE
  // LIVE → halt → HALTED (terminal)
  // IN_REVIEW → cancel → CANCELLED → resubmit → new PENDING
  // IN_REVIEW → reject → REJECTED → resubmit → new PENDING
  
  if (i < 3) {
    // Recent distributions - PENDING (not submitted yet)
    androidStatus = 'PENDING';
    iosStatus = 'PENDING';
  } else if (i < 6) {
    // PARTIALLY_SUBMITTED - One platform submitted (IN_REVIEW), one still pending
    androidStatus = i % 2 === 0 ? 'IN_REVIEW' : 'PENDING';
    iosStatus = i % 2 === 0 ? 'PENDING' : 'IN_REVIEW';
  } else if (i < 10) {
    // SUBMITTED - Both platforms in review or approved
    androidStatus = i % 2 === 0 ? 'IN_REVIEW' : 'APPROVED';
    iosStatus = i % 2 === 0 ? 'APPROVED' : 'IN_REVIEW';
  } else if (i < 13) {
    // PARTIALLY_RELEASED - One platform APPROVED, one LIVE
    androidStatus = 'APPROVED';
    iosStatus = 'LIVE';
    iosRollout = [25, 50, 75][i % 3];
  } else if (i < 18) {
    // PARTIALLY_RELEASED - Both LIVE but not both at 100%
    androidStatus = 'LIVE';
    androidRollout = [5, 10, 25, 50, 75][i % 5];
    iosStatus = 'LIVE';
    iosRollout = [10, 25, 50, 75, 5][i % 5];
  } else if (i < 22) {
    // RELEASED - Both APPROVED (considered "released")
    androidStatus = 'APPROVED';
    iosStatus = 'APPROVED';
  } else if (i < 25) {
    // RELEASED - One APPROVED, one LIVE at any %
    androidStatus = 'APPROVED';
    iosStatus = 'LIVE';
    iosRollout = [50, 75, 100][i % 3];
  } else {
    // RELEASED - Both LIVE at 100%
    androidStatus = 'LIVE';
    androidRollout = 100;
    iosStatus = 'LIVE';
    iosRollout = 100;
  }
  
  let androidSub = null;
  let iosSub = null;
  
  // Create Android submission ONLY if platform includes ANDROID
  if (platforms.includes('ANDROID')) {
    androidSub = {
      id: `asb_${String(i + 1).padStart(3, '0')}`,
      distributionId: distId,
      releaseId: releaseId,
      tenantId: 'EkgmIbgGQx',
      storeType: 'PLAY_STORE',
      status: androidStatus,
      version: version,
      versionCode: versionCode,
      rolloutPercentage: androidRollout,
      inAppUpdatePriority: i % 6,
      releaseNotes: androidStatus === 'PENDING' ? '' : `Release ${version} - Android improvements`,
      artifactPath: `s3://builds/android/${version}/app-release.aab`,
      internalTrackLink: `https://play.google.com/apps/testing/com.dream11.fantasy`, // All first submissions have internal track
      submittedAt: androidStatus === 'PENDING' ? null : daysAgo(29 - i),
      submittedBy: androidStatus === 'PENDING' ? null : 'prince@dream11.com',
      statusUpdatedAt: daysAgo(Math.max(0, 29 - i)),
      isCurrent: true,
      createdAt: daysAgo(30 - i),
      updatedAt: daysAgo(Math.max(0, 29 - i)),
      actionHistory: []
    };
    
    db.android_submission_builds.push(androidSub);
  }
  
  // Create iOS submission ONLY if platform includes IOS
  if (platforms.includes('IOS')) {
    // For PENDING submissions, phasedRelease and resetRating should be null (user fills during submit)
    const phasedRelease = iosStatus === 'PENDING' ? null : (i % 3 !== 0); // 2/3 are phased
    const resetRating = iosStatus === 'PENDING' ? null : (i % 10 === 5);
    
    iosSub = {
      id: `isb_${String(i + 1).padStart(3, '0')}`,
      distributionId: distId,
      releaseId: releaseId,
      tenantId: 'EkgmIbgGQx',
      storeType: 'APP_STORE',
      status: iosStatus,
      version: version,
      releaseType: 'AFTER_APPROVAL', // Always AFTER_APPROVAL for iOS (backend default)
      phasedRelease: phasedRelease,
      resetRating: resetRating,
      rolloutPercentage: iosRollout,
      releaseNotes: iosStatus === 'PENDING' ? '' : `Release ${version} - iOS improvements`,
      testflightNumber: 50000 + i + 1,
      submittedAt: iosStatus === 'PENDING' ? null : daysAgo(29 - i),
      submittedBy: iosStatus === 'PENDING' ? null : 'prince@dream11.com',
      statusUpdatedAt: daysAgo(Math.max(0, 29 - i)),
      isCurrent: true,
      createdAt: daysAgo(30 - i),
      updatedAt: daysAgo(Math.max(0, 29 - i)),
      actionHistory: []
    };
    
    db.ios_submission_builds.push(iosSub);
  }
  
  // Calculate correct distribution status
  const distStatus = calculateDistributionStatus(platforms, androidSub, iosSub);
  
  // Create distribution with calculated status
  db.store_distribution.push({
    id: distId,
    tenantId: 'EkgmIbgGQx',
    releaseId: releaseId,
    status: distStatus,
    createdAt: daysAgo(30 - i),
    updatedAt: daysAgo(Math.max(0, 30 - i - 5))
  });
}

// Add special scenarios

// dist_004 - Multiple rejection/resubmission history (only if it has Android)
const dist004 = db.store_distribution.find(d => d.id === 'dist_004');
const dist004Release = db.releases.find(r => r.id === dist004.releaseId);
if (dist004 && dist004Release.platformTargetMappings.some(p => p.platform === 'ANDROID')) {
  const dist004AndroidIndex = db.android_submission_builds.findIndex(s => s.distributionId === 'dist_004');
  if (dist004AndroidIndex !== -1) {
    const current = db.android_submission_builds[dist004AndroidIndex];
    
    // Add rejected submission (historical)
    db.android_submission_builds.push({
      ...current,
      id: 'asb_004_v1_rejected',
      status: 'REJECTED',
      versionCode: 303,
      rolloutPercentage: 0,
      isCurrent: false,
      releaseNotes: 'First attempt - rejected',
      artifactPath: 's3://builds/android/3.3.0-v1/app-release.aab',
      submittedAt: daysAgo(27),
      statusUpdatedAt: daysAgo(26),
      updatedAt: daysAgo(26),
      actionHistory: []
    });
    
    // Add cancelled submission (historical)
    db.android_submission_builds.push({
      ...current,
      id: 'asb_004_v2_cancelled',
      status: 'CANCELLED',
      versionCode: 304,
      rolloutPercentage: 0,
      isCurrent: false,
      releaseNotes: 'Second attempt - cancelled',
      artifactPath: 's3://builds/android/3.3.0-v2/app-release.aab',
      submittedAt: daysAgo(25),
      statusUpdatedAt: daysAgo(24),
      updatedAt: daysAgo(24),
      actionHistory: [{
        action: 'CANCELLED',
        createdBy: 'prince@dream11.com',
        createdAt: daysAgo(24),
        reason: 'Found critical bug'
      }]
    });
    
    // Update current to v3
    current.id = 'asb_004_v3_current';
    current.versionCode = 305;
    current.releaseNotes = 'Third attempt - current submission';
  }
}

// dist_014 - HALTED Android (only if it has Android and is LIVE)
// Rule: Can only HALT a LIVE submission
const dist014AndroidIndex = db.android_submission_builds.findIndex(s => s.distributionId === 'dist_014' && s.status === 'LIVE');
if (dist014AndroidIndex !== -1) {
  db.android_submission_builds[dist014AndroidIndex].status = 'HALTED';
  db.android_submission_builds[dist014AndroidIndex].rolloutPercentage = 35.5;
  db.android_submission_builds[dist014AndroidIndex].actionHistory = [{
    action: 'HALTED',
    createdBy: 'prince@dream11.com',
    createdAt: daysAgo(3),
    reason: 'Critical security vulnerability discovered'
  }];
  
  // Recalculate distribution status for dist_014
  // Note: HALTED is considered "released" so distribution stays RELEASED
  const dist014 = db.store_distribution.find(d => d.id === 'dist_014');
  const dist014Release = db.releases.find(r => r.id === dist014.releaseId);
  const dist014Android = db.android_submission_builds.find(s => s.distributionId === 'dist_014' && s.isCurrent);
  const dist014Ios = db.ios_submission_builds.find(s => s.distributionId === 'dist_014' && s.isCurrent);
  dist014.status = calculateDistributionStatus(
    dist014Release.platformTargetMappings.map(p => p.platform),
    dist014Android,
    dist014Ios
  );
}

// dist_016 - PAUSED iOS (force it to have iOS LIVE with phasedRelease, then PAUSE it)
// Rule: Can only PAUSE iOS LIVE submissions with phasedRelease
const dist016IosIndex = db.ios_submission_builds.findIndex(s => s.distributionId === 'dist_016');
if (dist016IosIndex !== -1) {
  // First, ensure it's LIVE with phasedRelease
  db.ios_submission_builds[dist016IosIndex].status = 'PAUSED';
  db.ios_submission_builds[dist016IosIndex].phasedRelease = true;
  db.ios_submission_builds[dist016IosIndex].rolloutPercentage = 50;
  db.ios_submission_builds[dist016IosIndex].actionHistory = [{
    action: 'PAUSED',
    createdBy: 'prince@dream11.com',
    createdAt: daysAgo(2),
    reason: 'UI bug detected during phased rollout'
  }];
  
  // Recalculate distribution status
  // Note: PAUSED is considered "released" so distribution stays RELEASED
  const dist016 = db.store_distribution.find(d => d.id === 'dist_016');
  const dist016Release = db.releases.find(r => r.id === dist016.releaseId);
  const dist016Android = db.android_submission_builds.find(s => s.distributionId === 'dist_016' && s.isCurrent);
  const dist016Ios = db.ios_submission_builds.find(s => s.distributionId === 'dist_016' && s.isCurrent);
  dist016.status = calculateDistributionStatus(
    dist016Release.platformTargetMappings.map(p => p.platform),
    dist016Android,
    dist016Ios
  );
}

// dist_024 - iOS with PAUSE/RESUME history (now back to LIVE)
// Rule: LIVE → PAUSE → RESUME → LIVE (iOS only, phasedRelease)
const dist024IosIndex = db.ios_submission_builds.findIndex(s => s.distributionId === 'dist_024');
if (dist024IosIndex !== -1) {
  // Ensure it's LIVE with phasedRelease and has PAUSE/RESUME history
  db.ios_submission_builds[dist024IosIndex].status = 'LIVE';
  db.ios_submission_builds[dist024IosIndex].phasedRelease = true;
  db.ios_submission_builds[dist024IosIndex].rolloutPercentage = 75;
  db.ios_submission_builds[dist024IosIndex].actionHistory = [
    {
      action: 'PAUSED',
      createdBy: 'prince@dream11.com',
      createdAt: daysAgo(8),
      reason: 'Investigating crash reports'
    },
    {
      action: 'RESUMED',
      createdBy: 'prince@dream11.com',
      createdAt: daysAgo(6),
      reason: 'Issue resolved, continuing rollout'
    }
  ];
}

// Add some decimal rollout percentages to Android LIVE submissions
[6, 13, 19, 24].forEach(idx => {
  const distId = `dist_${String(idx).padStart(3, '0')}`;
  const sub = db.android_submission_builds.find(s => s.distributionId === distId && s.status === 'LIVE' && s.isCurrent);
  if (sub) {
    sub.rolloutPercentage = [27.5, 5.5, 99.5, 15.3][idx % 4];
  }
});

const dbPath = path.join(__dirname, 'data', 'db.json');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`✅ Generated ${db.store_distribution.length} distributions`);
console.log(`   - Android submissions: ${db.android_submission_builds.length}`);
console.log(`   - iOS submissions: ${db.ios_submission_builds.length}`);
console.log(`   - Total submissions: ${db.android_submission_builds.length + db.ios_submission_builds.length}`);

// Count by platform distribution
const bothPlatforms = db.releases.filter(r => r.platformTargetMappings.length === 2).length;
const androidOnly = db.releases.filter(r => r.platformTargetMappings.length === 1 && r.platformTargetMappings[0].platform === 'ANDROID').length;
const iosOnly = db.releases.filter(r => r.platformTargetMappings.length === 1 && r.platformTargetMappings[0].platform === 'IOS').length;
console.log(`   - Both platforms: ${bothPlatforms}, Android-only: ${androidOnly}, iOS-only: ${iosOnly}`);

// Count by distribution status
const statusCounts = db.store_distribution.reduce((acc, d) => {
  acc[d.status] = (acc[d.status] || 0) + 1;
  return acc;
}, {});
console.log(`   - Status distribution:`, statusCounts);

console.log(`\n💡 Refresh browser to see changes`);
