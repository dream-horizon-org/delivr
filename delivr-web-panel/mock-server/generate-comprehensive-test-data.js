#!/usr/bin/env node

/**
 * Comprehensive Distribution Test Data Generator
 * Creates ALL possible status combinations and edge cases for manual testing
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

let distCounter = 1;
let asbCounter = 1;
let isbCounter = 1;

// Calculate correct distribution status
function calculateDistributionStatus(androidSub, iosSub) {
  const submissions = [androidSub, iosSub].filter(Boolean);
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
    if (sub.status === 'REJECTED' || sub.status === 'CANCELLED') return 'SUBMITTED';
    return 'SUBMITTED';
  }
  
  if (allPending) return 'PENDING';
  if (allReleased) return 'RELEASED';
  if (someReleased) return 'PARTIALLY_RELEASED';
  if (allInReview) return 'SUBMITTED';
  return 'PARTIALLY_SUBMITTED';
}

function createDistribution(version, androidSub, iosSub) {
  const releaseId = `rel_${version.replace(/\./g, '_')}`;
  const distId = `dist_${String(distCounter++).padStart(3, '0')}`;
  
  const release = {
    id: releaseId,
    appId: 'EkgmIbgGQx',
    version,
    branch: `release/${version}`,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1)
  };
  
  const distribution = {
    id: distId,
    appId: 'EkgmIbgGQx',
    releaseId,
    status: calculateDistributionStatus(androidSub, iosSub),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1)
  };
  
  db.releases.push(release);
  db.store_distribution.push(distribution);
  
  if (androidSub) {
    db.android_submission_builds.push({
      id: `asb_${String(asbCounter++).padStart(3, '0')}`,
      distributionId: distId,
      version,
      versionCode: parseInt(version.replace(/\./g, '')) * 100,
      rolloutPercentage: androidSub.rollout || 0,
      inAppUpdatePriority: androidSub.priority || 3,
      releaseNotes: androidSub.notes || `Android ${version} release`,
      submittedAt: androidSub.submittedAt || daysAgo(5),
      submittedBy: 'dev@dream11.com',
      statusUpdatedAt: androidSub.statusUpdatedAt || daysAgo(2),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
      artifact: {
        artifactPath: `https://s3.amazonaws.com/builds/app-release-${version}.aab`,
        internalTrackLink: 'https://play.google.com/apps/testing/com.dream11.fantasy'
      },
      actionHistory: androidSub.history || [],
      isCurrent: androidSub.isCurrent !== false,
      status: androidSub.status,
      ...(androidSub.rejectionReason && { rejectionReason: androidSub.rejectionReason })
    });
  }
  
  if (iosSub) {
    db.ios_submission_builds.push({
      id: `isb_${String(isbCounter++).padStart(3, '0')}`,
      distributionId: distId,
      version,
      releaseType: iosSub.releaseType || 'AFTER_APPROVAL',
      phasedRelease: iosSub.phasedRelease !== false,
      resetRating: false,
      rolloutPercentage: iosSub.rollout || 0,
      releaseNotes: iosSub.notes || `iOS ${version} release`,
      submittedAt: iosSub.submittedAt || daysAgo(5),
      submittedBy: 'dev@dream11.com',
      statusUpdatedAt: iosSub.statusUpdatedAt || daysAgo(2),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
      artifact: {
        testflightBuildNumber: iosSub.buildNumber || '1234',
        testflightLink: 'https://appstoreconnect.apple.com/apps/123456/testflight'
      },
      actionHistory: iosSub.history || [],
      isCurrent: iosSub.isCurrent !== false,
      status: iosSub.status,
      ...(iosSub.rejectionReason && { rejectionReason: iosSub.rejectionReason })
    });
  }
}

// =============================================================================
// ANDROID ONLY - ALL STATUSES
// =============================================================================

// PENDING
createDistribution('1.0.0', { status: 'PENDING', rollout: 0 }, null);

// IN_REVIEW
createDistribution('1.1.0', { status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(12) }, null);

// APPROVED (ready to go live)
createDistribution('1.2.0', { status: 'APPROVED', rollout: 0, submittedAt: hoursAgo(24) }, null);

// LIVE - Various rollout percentages
createDistribution('1.3.0', { status: 'LIVE', rollout: 5 }, null);
createDistribution('1.4.0', { status: 'LIVE', rollout: 20 }, null);
createDistribution('1.5.0', { status: 'LIVE', rollout: 50 }, null);
createDistribution('1.6.0', { status: 'LIVE', rollout: 75.5 }, null);
createDistribution('1.7.0', { status: 'LIVE', rollout: 100 }, null);

// PAUSED
createDistribution('1.8.0', { status: 'PAUSED', rollout: 35 }, null);

// HALTED
createDistribution('1.9.0', { status: 'HALTED', rollout: 60 }, null);

// REJECTED
createDistribution('1.10.0', {
  status: 'REJECTED',
  rollout: 0,
  isCurrent: false,
  rejectionReason: 'App crashes on launch. Please fix critical bugs.'
}, null);

// CANCELLED
createDistribution('1.11.0', {
  status: 'CANCELLED',
  rollout: 0,
  isCurrent: false
}, null);

// =============================================================================
// iOS ONLY - ALL STATUSES
// =============================================================================

// PENDING
createDistribution('2.0.0', null, { status: 'PENDING', rollout: 0 });

// IN_REVIEW
createDistribution('2.1.0', null, { status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(18) });

// APPROVED (ready to release)
createDistribution('2.2.0', null, { status: 'APPROVED', rollout: 0, submittedAt: hoursAgo(36) });

// LIVE - Phased Release (various days)
createDistribution('2.3.0', null, { status: 'LIVE', rollout: 1, phasedRelease: true }); // Day 1
createDistribution('2.4.0', null, { status: 'LIVE', rollout: 10, phasedRelease: true }); // Day 2
createDistribution('2.5.0', null, { status: 'LIVE', rollout: 50, phasedRelease: true }); // Day 4-5
createDistribution('2.6.0', null, { status: 'LIVE', rollout: 85, phasedRelease: true }); // Day 6-7
createDistribution('2.7.0', null, { status: 'LIVE', rollout: 100, phasedRelease: true }); // Completed early

// LIVE - Manual Release (always 100%)
createDistribution('2.8.0', null, { status: 'LIVE', rollout: 100, phasedRelease: false });

// PAUSED
createDistribution('2.9.0', null, { status: 'PAUSED', rollout: 45, phasedRelease: true });

// HALTED
createDistribution('2.10.0', null, { status: 'HALTED', rollout: 25, phasedRelease: true });

// REJECTED
createDistribution('2.11.0', null, {
  status: 'REJECTED',
  rollout: 0,
  isCurrent: false,
  rejectionReason: 'Guideline violation: App contains misleading content.'
});

// CANCELLED
createDistribution('2.12.0', null, {
  status: 'CANCELLED',
  rollout: 0,
  isCurrent: false
});

// =============================================================================
// BOTH PLATFORMS - ALL COMBINATIONS
// =============================================================================

// Both PENDING
createDistribution('3.0.0',
  { status: 'PENDING', rollout: 0 },
  { status: 'PENDING', rollout: 0 }
);

// Both IN_REVIEW
createDistribution('3.1.0',
  { status: 'IN_REVIEW', rollout: 0 },
  { status: 'IN_REVIEW', rollout: 0 }
);

// Both APPROVED
createDistribution('3.2.0',
  { status: 'APPROVED', rollout: 0 },
  { status: 'APPROVED', rollout: 0 }
);

// Both LIVE - Low rollout
createDistribution('3.3.0',
  { status: 'LIVE', rollout: 10 },
  { status: 'LIVE', rollout: 15, phasedRelease: true }
);

// Both LIVE - Mid rollout
createDistribution('3.4.0',
  { status: 'LIVE', rollout: 50 },
  { status: 'LIVE', rollout: 50, phasedRelease: true }
);

// Both LIVE - High rollout
createDistribution('3.5.0',
  { status: 'LIVE', rollout: 90 },
  { status: 'LIVE', rollout: 85, phasedRelease: true }
);

// Both LIVE - Complete (100%)
createDistribution('3.6.0',
  { status: 'LIVE', rollout: 100 },
  { status: 'LIVE', rollout: 100, phasedRelease: true }
);

// Android LIVE, iOS PAUSED
createDistribution('3.7.0',
  { status: 'LIVE', rollout: 75 },
  { status: 'PAUSED', rollout: 30, phasedRelease: true }
);

// Android PAUSED, iOS LIVE
createDistribution('3.8.0',
  { status: 'PAUSED', rollout: 40 },
  { status: 'LIVE', rollout: 60, phasedRelease: true }
);

// Android HALTED, iOS LIVE
createDistribution('3.9.0',
  { status: 'HALTED', rollout: 55 },
  { status: 'LIVE', rollout: 100, phasedRelease: true }
);

// Android LIVE, iOS HALTED
createDistribution('3.10.0',
  { status: 'LIVE', rollout: 100 },
  { status: 'HALTED', rollout: 20, phasedRelease: true }
);

// Both PAUSED
createDistribution('3.11.0',
  { status: 'PAUSED', rollout: 25 },
  { status: 'PAUSED', rollout: 35, phasedRelease: true }
);

// Both HALTED
createDistribution('3.12.0',
  { status: 'HALTED', rollout: 45 },
  { status: 'HALTED', rollout: 40, phasedRelease: true }
);

// Android REJECTED, iOS LIVE
createDistribution('3.13.0',
  { status: 'REJECTED', rollout: 0, isCurrent: false, rejectionReason: 'Privacy policy issues' },
  { status: 'LIVE', rollout: 100, phasedRelease: false }
);

// Android LIVE, iOS REJECTED
createDistribution('3.14.0',
  { status: 'LIVE', rollout: 100 },
  { status: 'REJECTED', rollout: 0, isCurrent: false, rejectionReason: 'Metadata issues' }
);

// Both REJECTED
createDistribution('3.15.0',
  { status: 'REJECTED', rollout: 0, isCurrent: false, rejectionReason: 'Android: Crash on startup' },
  { status: 'REJECTED', rollout: 0, isCurrent: false, rejectionReason: 'iOS: Design guideline violation' }
);

// Android IN_REVIEW, iOS LIVE
createDistribution('3.16.0',
  { status: 'IN_REVIEW', rollout: 0 },
  { status: 'LIVE', rollout: 50, phasedRelease: true }
);

// Android LIVE, iOS IN_REVIEW
createDistribution('3.17.0',
  { status: 'LIVE', rollout: 50 },
  { status: 'IN_REVIEW', rollout: 0 }
);

// Android PENDING, iOS LIVE
createDistribution('3.18.0',
  { status: 'PENDING', rollout: 0 },
  { status: 'LIVE', rollout: 100, phasedRelease: false }
);

// Android LIVE, iOS PENDING
createDistribution('3.19.0',
  { status: 'LIVE', rollout: 100 },
  { status: 'PENDING', rollout: 0 }
);

// Android CANCELLED, iOS LIVE
createDistribution('3.20.0',
  { status: 'CANCELLED', rollout: 0, isCurrent: false },
  { status: 'LIVE', rollout: 100, phasedRelease: false }
);

// Android LIVE, iOS CANCELLED
createDistribution('3.21.0',
  { status: 'LIVE', rollout: 100 },
  { status: 'CANCELLED', rollout: 0, isCurrent: false }
);

// Both CANCELLED
createDistribution('3.22.0',
  { status: 'CANCELLED', rollout: 0, isCurrent: false },
  { status: 'CANCELLED', rollout: 0, isCurrent: false }
);

// =============================================================================
// EDGE CASES
// =============================================================================

// Decimal rollout percentages
createDistribution('4.0.0', { status: 'LIVE', rollout: 12.5 }, null);
createDistribution('4.1.0', { status: 'LIVE', rollout: 33.3 }, null);
createDistribution('4.2.0', { status: 'LIVE', rollout: 66.7 }, null);

// iOS Manual vs Phased side by side
createDistribution('4.3.0', null, { status: 'LIVE', rollout: 100, phasedRelease: false });
createDistribution('4.4.0', null, { status: 'LIVE', rollout: 50, phasedRelease: true });

// Recent submission (hours ago)
createDistribution('4.5.0',
  { status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(2) },
  { status: 'IN_REVIEW', rollout: 0, submittedAt: hoursAgo(3) }
);

// Old submission (weeks ago)
createDistribution('4.6.0',
  { status: 'LIVE', rollout: 100, submittedAt: daysAgo(30) },
  { status: 'LIVE', rollout: 100, submittedAt: daysAgo(28), phasedRelease: true }
);

// =============================================================================
// WRITE TO FILE
// =============================================================================

const outputPath = path.join(__dirname, 'data', 'db.json');
fs.writeFileSync(outputPath, JSON.stringify(db, null, 2));

console.log('✅ Comprehensive test data generated!');
console.log('');
console.log(`📊 Statistics:`);
console.log(`   - Total Distributions: ${db.store_distribution.length}`);
console.log(`   - Android Submissions: ${db.android_submission_builds.length}`);
console.log(`   - iOS Submissions: ${db.ios_submission_builds.length}`);
console.log('');
console.log('📋 Coverage:');
console.log('   ✅ All Android statuses: PENDING, IN_REVIEW, APPROVED, LIVE (various %), PAUSED, HALTED, REJECTED, CANCELLED');
console.log('   ✅ All iOS statuses: PENDING, IN_REVIEW, APPROVED, LIVE (phased & manual), PAUSED, HALTED, REJECTED, CANCELLED');
console.log('   ✅ All multi-platform combinations');
console.log('   ✅ Edge cases: decimals, recent/old submissions, manual vs phased');
console.log('');
console.log('💡 Restart mock server to load: pkill -f mock-server && pnpm run dev:mock');

