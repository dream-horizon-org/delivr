#!/usr/bin/env node

/**
 * ULTIMATE Distribution Test Data Generator
 * 
 * Creates COMPREHENSIVE test data with:
 * - All status combinations
 * - Rich activity history (state transitions)
 * - Past submissions (rejected/cancelled with resubmissions)
 * - Multiple submission attempts per distribution
 * - Realistic timelines and action logs
 */

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
const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

let distCounter = 1;
let asbCounter = 1;
let isbCounter = 1;

// Calculate distribution status
function calculateDistributionStatus(androidSubs, iosSubs) {
  const currentAndroid = androidSubs?.find(s => s.isCurrent);
  const currentIos = iosSubs?.find(s => s.isCurrent);
  
  const submissions = [currentAndroid, currentIos].filter(Boolean);
  if (submissions.length === 0) return 'PENDING';
  
  const isReleased = (sub) => ['APPROVED', 'LIVE', 'PAUSED', 'HALTED'].includes(sub?.status);
  const allReleased = submissions.every(isReleased);
  const someReleased = submissions.some(isReleased);
  const allPending = submissions.every(s => s?.status === 'PENDING');
  const allInReview = submissions.every(s => s?.status === 'IN_REVIEW');
  
  if (submissions.length === 1) {
    const sub = submissions[0];
    if (sub.status === 'PENDING') return 'PENDING';
    if (isReleased(sub)) return 'RELEASED';
    return 'SUBMITTED';
  }
  
  if (allPending) return 'PENDING';
  if (allReleased) return 'RELEASED';
  if (someReleased) return 'PARTIALLY_RELEASED';
  if (allInReview) return 'SUBMITTED';
  return 'PARTIALLY_SUBMITTED';
}

// Create action history entries
// NOTE: ActionHistory is for MANUAL ACTIONS ONLY (PAUSED, RESUMED, HALTED, UPDATE_ROLLOUT, CANCELLED)
// Automatic transitions (SUBMITTED, APPROVED, WENT_LIVE) are shown in SubmissionHistoryPanel
function createActionHistory(status, rollout, submittedAt, statusUpdatedAt) {
  const history = [];
  
  if (status === 'PENDING' || status === 'IN_REVIEW' || status === 'APPROVED') return [];
  
  // Note: Only track manual actions (PAUSED, RESUMED, HALTED, UPDATE_ROLLOUT, CANCELLED)
  // SUBMITTED, APPROVED, WENT_LIVE are automatic and shown in SubmissionHistoryPanel
  
  // PAUSED action
  if (status === 'PAUSED') {
    history.push({
      action: 'PAUSED',
      createdAt: statusUpdatedAt,
      createdBy: 'prince@dream11.com',
      reason: 'Critical bug detected, investigating'
    });
  }
  
  // HALTED action
  if (status === 'HALTED') {
    history.push({
      action: 'HALTED',
      createdAt: statusUpdatedAt,
      createdBy: 'prince@dream11.com',
      reason: 'Emergency halt - severe crash issue'
    });
  }
  
  // CANCELLED action
  if (status === 'CANCELLED') {
    history.push({
      action: 'CANCELLED',
      createdAt: statusUpdatedAt,
      createdBy: 'dev@dream11.com',
      reason: 'Cancelled by developer - wrong build'
    });
  }
  
  // UPDATE_ROLLOUT actions for higher rollouts
  if (['LIVE', 'PAUSED', 'HALTED'].includes(status)) {
    if (rollout > 20) {
      history.push({
        action: 'UPDATE_ROLLOUT',
        createdAt: new Date(new Date(submittedAt).getTime() + 48 * 3600000).toISOString(),
        createdBy: 'dev@dream11.com',
        reason: 'Gradual rollout increase',
        previousRolloutPercentage: 5,
        newRolloutPercentage: 20
      });
    }
    if (rollout > 50) {
      history.push({
        action: 'UPDATE_ROLLOUT',
        createdAt: new Date(new Date(submittedAt).getTime() + 72 * 3600000).toISOString(),
        createdBy: 'dev@dream11.com',
        reason: 'No issues detected, continuing rollout',
        previousRolloutPercentage: 20,
        newRolloutPercentage: 50
      });
    }
    if (rollout > 75) {
      history.push({
        action: 'UPDATE_ROLLOUT',
        createdAt: new Date(new Date(submittedAt).getTime() + 96 * 3600000).toISOString(),
        createdBy: 'prince@dream11.com',
        reason: 'Metrics look good, increasing to final percentage',
        previousRolloutPercentage: 50,
        newRolloutPercentage: rollout
      });
    }
  }
  
  return history;
}

function createDistribution(version, androidSubs, iosSubs) {
  const releaseId = `rel_${version.replace(/\./g, '_')}`;
  const distId = `dist_${String(distCounter++).padStart(3, '0')}`;
  
  const release = {
    id: releaseId,
    tenantId: 'EkgmIbgGQx',
    version,
    branch: `release/${version}`,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1)
  };
  
  const distribution = {
    id: distId,
    tenantId: 'EkgmIbgGQx',
    releaseId,
    status: calculateDistributionStatus(androidSubs, iosSubs),
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1)
  };
  
  db.releases.push(release);
  db.store_distribution.push(distribution);
  
  // Add Android submissions (can be multiple - historical + current)
  if (androidSubs) {
    androidSubs.forEach((sub, index) => {
      const isLast = index === androidSubs.length - 1;
      db.android_submission_builds.push({
        id: `asb_${String(asbCounter++).padStart(3, '0')}`,
        distributionId: distId,
        version,
        storeType: 'PLAY_STORE', // Android always goes to Play Store
        versionCode: parseInt(version.replace(/\./g, '')) * 100 + index,
        rolloutPercentage: sub.rollout || 0,
        inAppUpdatePriority: sub.priority || 3,
        releaseNotes: sub.notes || `Android ${version} - Attempt ${index + 1}`,
        submittedAt: sub.submittedAt || daysAgo(10 - index * 2),
        submittedBy: sub.submittedBy || 'dev@dream11.com',
        statusUpdatedAt: sub.statusUpdatedAt || daysAgo(8 - index * 2),
        createdAt: daysAgo(15),
        updatedAt: daysAgo(1),
        artifact: {
          artifactPath: `https://s3.amazonaws.com/builds/app-release-${version}-${index}.aab`,
          internalTrackLink: 'https://play.google.com/apps/testing/com.dream11.fantasy'
        },
        actionHistory: createActionHistory(sub.status, sub.rollout, sub.submittedAt || daysAgo(10 - index * 2), sub.statusUpdatedAt || daysAgo(8 - index * 2)),
        isCurrent: isLast && sub.status !== 'REJECTED' && sub.status !== 'CANCELLED',
        status: sub.status,
        ...(sub.rejectionReason && { rejectionReason: sub.rejectionReason })
      });
    });
  }
  
  // Add iOS submissions (can be multiple - historical + current)
  if (iosSubs) {
    iosSubs.forEach((sub, index) => {
      const isLast = index === iosSubs.length - 1;
      db.ios_submission_builds.push({
        id: `isb_${String(isbCounter++).padStart(3, '0')}`,
        distributionId: distId,
        version,
        storeType: 'APP_STORE', // iOS always goes to App Store
        releaseType: sub.releaseType || 'AFTER_APPROVAL',
        phasedRelease: sub.phasedRelease !== false,
        resetRating: false,
        rolloutPercentage: sub.rollout || 0,
        releaseNotes: sub.notes || `iOS ${version} - Attempt ${index + 1}`,
        submittedAt: sub.submittedAt || daysAgo(10 - index * 2),
        submittedBy: sub.submittedBy || 'dev@dream11.com',
        statusUpdatedAt: sub.statusUpdatedAt || daysAgo(8 - index * 2),
        createdAt: daysAgo(15),
        updatedAt: daysAgo(1),
        artifact: {
          testflightBuildNumber: (sub.buildNumber || 1000 + index).toString(),
          testflightLink: 'https://appstoreconnect.apple.com/apps/123456/testflight'
        },
        actionHistory: createActionHistory(sub.status, sub.rollout, sub.submittedAt || daysAgo(10 - index * 2), sub.statusUpdatedAt || daysAgo(8 - index * 2)),
        isCurrent: isLast && sub.status !== 'REJECTED' && sub.status !== 'CANCELLED',
        status: sub.status,
        ...(sub.rejectionReason && { rejectionReason: sub.rejectionReason })
      });
    });
  }
}

console.log('🔨 Generating comprehensive test data with history...\n');

// =============================================================================
// ANDROID ONLY - WITH HISTORY
// =============================================================================

// Simple cases first
createDistribution('1.0.0', [{ status: 'PENDING', rollout: 0 }], null);
createDistribution('1.1.0', [{ status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(12) }], null);
createDistribution('1.2.0', [{ status: 'APPROVED', rollout: 0, submittedAt: hoursAgo(48) }], null);
createDistribution('1.3.0', [{ status: 'LIVE', rollout: 50, submittedAt: daysAgo(7) }], null);

// Android with REJECTION → RESUBMISSION → SUCCESS
createDistribution('1.4.0', [
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(10), statusUpdatedAt: daysAgo(8), rejectionReason: 'App crashes on startup' },
  { status: 'LIVE', rollout: 100, submittedAt: daysAgo(5), statusUpdatedAt: daysAgo(2) }
], null);

// Android with MULTIPLE REJECTIONS → FINAL SUCCESS
createDistribution('1.5.0', [
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(15), statusUpdatedAt: daysAgo(14), rejectionReason: 'Privacy policy missing' },
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(12), statusUpdatedAt: daysAgo(11), rejectionReason: 'Still missing required permissions' },
  { status: 'LIVE', rollout: 75, submittedAt: daysAgo(8), statusUpdatedAt: daysAgo(3) }
], null);

// Android CANCELLED → RESUBMITTED
createDistribution('1.6.0', [
  { status: 'CANCELLED', rollout: 0, submittedAt: daysAgo(10), statusUpdatedAt: daysAgo(9) },
  { status: 'IN_REVIEW', rollout: 0, submittedAt: daysAgo(6) }
], null);

// Android LIVE → PAUSED (with rollout history)
createDistribution('1.7.0', [
  { status: 'PAUSED', rollout: 35, submittedAt: daysAgo(10), statusUpdatedAt: hoursAgo(2) }
], null);

// Android LIVE → HALTED (emergency stop)
createDistribution('1.8.0', [
  { status: 'HALTED', rollout: 60, submittedAt: daysAgo(8), statusUpdatedAt: hoursAgo(1) }
], null);

// =============================================================================
// iOS ONLY - WITH HISTORY
// =============================================================================

createDistribution('2.0.0', null, [{ status: 'PENDING', rollout: 0 }]);
createDistribution('2.1.0', null, [{ status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(18) }]);
createDistribution('2.2.0', null, [{ status: 'LIVE', rollout: 50, phasedRelease: true, submittedAt: daysAgo(7) }]);

// iOS with REJECTION → RESUBMISSION → SUCCESS (Phased)
createDistribution('2.3.0', null, [
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(12), statusUpdatedAt: daysAgo(10), rejectionReason: 'Guideline 4.3 - Design: Spam' },
  { status: 'LIVE', rollout: 85, phasedRelease: true, submittedAt: daysAgo(7), statusUpdatedAt: daysAgo(2) }
]);

// iOS with MULTIPLE ATTEMPTS
createDistribution('2.4.0', null, [
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(20), statusUpdatedAt: daysAgo(18), rejectionReason: 'Misleading app description' },
  { status: 'CANCELLED', rollout: 0, submittedAt: daysAgo(15), statusUpdatedAt: daysAgo(14) },
  { status: 'LIVE', rollout: 100, phasedRelease: true, submittedAt: daysAgo(10), statusUpdatedAt: daysAgo(3) }
]);

// iOS PAUSED (Phased)
createDistribution('2.5.0', null, [
  { status: 'PAUSED', rollout: 45, phasedRelease: true, submittedAt: daysAgo(9), statusUpdatedAt: hoursAgo(3) }
]);

// iOS Manual Release (not phased)
createDistribution('2.6.0', null, [
  { status: 'LIVE', rollout: 100, phasedRelease: false, submittedAt: daysAgo(5) }
]);

// =============================================================================
// BOTH PLATFORMS - COMPLEX HISTORIES
// =============================================================================

// Both PENDING
createDistribution('3.0.0',
  [{ status: 'PENDING', rollout: 0 }],
  [{ status: 'PENDING', rollout: 0 }]
);

// Both IN_REVIEW
createDistribution('3.1.0',
  [{ status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(10) }],
  [{ status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(8) }]
);

// Android SUCCESS, iOS REJECTED → RESUBMITTED
createDistribution('3.2.0',
  [{ status: 'LIVE', rollout: 100, submittedAt: daysAgo(10) }],
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(10), statusUpdatedAt: daysAgo(7), rejectionReason: 'Binary was invalid' },
    { status: 'LIVE', rollout: 50, phasedRelease: true, submittedAt: daysAgo(5) }
  ]
);

// iOS SUCCESS, Android REJECTED → RESUBMITTED
createDistribution('3.3.0',
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(12), statusUpdatedAt: daysAgo(10), rejectionReason: 'Security vulnerabilities found' },
    { status: 'LIVE', rollout: 75, submittedAt: daysAgo(7) }
  ],
  [{ status: 'LIVE', rollout: 100, phasedRelease: true, submittedAt: daysAgo(12) }]
);

// Both had MULTIPLE ATTEMPTS
createDistribution('3.4.0',
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(20), statusUpdatedAt: daysAgo(18), rejectionReason: 'Copyrighted content' },
    { status: 'CANCELLED', rollout: 0, submittedAt: daysAgo(15), statusUpdatedAt: daysAgo(14) },
    { status: 'LIVE', rollout: 100, submittedAt: daysAgo(10) }
  ],
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(20), statusUpdatedAt: daysAgo(17), rejectionReason: 'Minimum functionality' },
    { status: 'LIVE', rollout: 100, phasedRelease: false, submittedAt: daysAgo(12) }
  ]
);

// Both LIVE, complex rollout history
createDistribution('3.5.0',
  [{ status: 'LIVE', rollout: 90, submittedAt: daysAgo(14), statusUpdatedAt: daysAgo(1) }],
  [{ status: 'LIVE', rollout: 85, phasedRelease: true, submittedAt: daysAgo(14), statusUpdatedAt: daysAgo(2) }]
);

// Android PAUSED, iOS LIVE
createDistribution('3.6.0',
  [{ status: 'PAUSED', rollout: 40, submittedAt: daysAgo(8), statusUpdatedAt: hoursAgo(5) }],
  [{ status: 'LIVE', rollout: 100, phasedRelease: true, submittedAt: daysAgo(8) }]
);

// Android LIVE, iOS PAUSED
createDistribution('3.7.0',
  [{ status: 'LIVE', rollout: 100, submittedAt: daysAgo(10) }],
  [{ status: 'PAUSED', rollout: 30, phasedRelease: true, submittedAt: daysAgo(10), statusUpdatedAt: hoursAgo(4) }]
);

// Android HALTED, iOS continues LIVE
createDistribution('3.8.0',
  [{ status: 'HALTED', rollout: 55, submittedAt: daysAgo(12), statusUpdatedAt: minutesAgo(30) }],
  [{ status: 'LIVE', rollout: 100, phasedRelease: true, submittedAt: daysAgo(12) }]
);

// Both platforms REJECTED on first try → Both succeeded on retry
createDistribution('3.9.0',
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(15), statusUpdatedAt: daysAgo(13), rejectionReason: 'Target API level too low' },
    { status: 'LIVE', rollout: 50, submittedAt: daysAgo(10) }
  ],
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(15), statusUpdatedAt: daysAgo(12), rejectionReason: 'Missing required features' },
    { status: 'LIVE', rollout: 50, phasedRelease: true, submittedAt: daysAgo(9) }
  ]
);

// =============================================================================
// EDGE CASES WITH RICH HISTORY
// =============================================================================

// Decimal rollouts with progression
createDistribution('4.0.0',
  [{ status: 'LIVE', rollout: 33.3, submittedAt: daysAgo(8) }],
  null
);

// Very recent submission (minutes ago)
createDistribution('4.1.0',
  [{ status: 'IN_REVIEW', rollout: 0, submittedAt: minutesAgo(15) }],
  [{ status: 'IN_REVIEW', rollout: 0, submittedAt: minutesAgo(10) }]
);

// Old release with complete history
createDistribution('4.2.0',
  [{ status: 'LIVE', rollout: 100, submittedAt: daysAgo(60), statusUpdatedAt: daysAgo(45) }],
  [{ status: 'LIVE', rollout: 100, phasedRelease: true, submittedAt: daysAgo(60), statusUpdatedAt: daysAgo(50) }]
);

// Currently REJECTED (awaiting fix)
createDistribution('4.3.0',
  [{ status: 'REJECTED', rollout: 0, submittedAt: daysAgo(3), statusUpdatedAt: daysAgo(1), rejectionReason: 'App violates data collection policies' }],
  null
);

// Currently CANCELLED (developer changed mind)
createDistribution('4.4.0',
  null,
  [{ status: 'CANCELLED', rollout: 0, submittedAt: daysAgo(2), statusUpdatedAt: hoursAgo(12) }]
);

// Android at 12.5%, iOS Manual at 100%
createDistribution('4.5.0',
  [{ status: 'LIVE', rollout: 12.5, submittedAt: daysAgo(6) }],
  [{ status: 'LIVE', rollout: 100, phasedRelease: false, submittedAt: daysAgo(6) }]
);

// =============================================================================
// EXTREME EDGE CASES
// =============================================================================

// 5 ATTEMPTS before success (Android)
createDistribution('5.0.0', [
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(30), statusUpdatedAt: daysAgo(29), rejectionReason: 'Issue 1' },
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(25), statusUpdatedAt: daysAgo(24), rejectionReason: 'Issue 2' },
  { status: 'CANCELLED', rollout: 0, submittedAt: daysAgo(20), statusUpdatedAt: daysAgo(19) },
  { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(15), statusUpdatedAt: daysAgo(14), rejectionReason: 'Issue 3' },
  { status: 'LIVE', rollout: 100, submittedAt: daysAgo(10) }
], null);

// Long phased rollout history (iOS)
createDistribution('5.1.0', null, [
  { status: 'LIVE', rollout: 100, phasedRelease: true, submittedAt: daysAgo(10), notes: 'Started at 1%, gradually increased to 100%' }
]);

// Both rejected, Android resubmitted but iOS still pending fix
createDistribution('5.2.0',
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(8), statusUpdatedAt: daysAgo(6), rejectionReason: 'Permissions issue' },
    { status: 'LIVE', rollout: 25, submittedAt: daysAgo(3) }
  ],
  [
    { status: 'REJECTED', rollout: 0, submittedAt: daysAgo(8), statusUpdatedAt: daysAgo(6), rejectionReason: 'UI issue' }
  ]
);

// =============================================================================
// WRITE TO FILE
// =============================================================================

const outputPath = path.join(__dirname, 'data', 'db.json');
fs.writeFileSync(outputPath, JSON.stringify(db, null, 2));

console.log('✅ ULTIMATE comprehensive test data generated!\n');
console.log(`📊 Statistics:`);
console.log(`   - Total Distributions: ${db.store_distribution.length}`);
console.log(`   - Android Submissions: ${db.android_submission_builds.length}`);
console.log(`   - iOS Submissions: ${db.ios_submission_builds.length}`);
console.log(`   - Historical Submissions: ${db.android_submission_builds.filter(s => !s.isCurrent).length + db.ios_submission_builds.filter(s => !s.isCurrent).length}`);
console.log(`   - Submissions with Action History: ${db.android_submission_builds.filter(s => s.actionHistory.length > 0).length + db.ios_submission_builds.filter(s => s.actionHistory.length > 0).length}`);
console.log('');
console.log('📋 Coverage:');
console.log('   ✅ All statuses: PENDING, IN_REVIEW, APPROVED, LIVE, PAUSED, HALTED, REJECTED, CANCELLED');
console.log('   ✅ Rich activity history with state transitions');
console.log('   ✅ Past submissions (rejected/cancelled attempts)');
console.log('   ✅ Multiple resubmission scenarios');
console.log('   ✅ Rollout progression history');
console.log('   ✅ Complex multi-platform scenarios');
console.log('   ✅ Edge cases: decimals, timing, extreme attempts');
console.log('');
console.log('💡 Restart servers: pkill -f mock-server && pkill -f "remix vite" && pnpm run dev:mock');

