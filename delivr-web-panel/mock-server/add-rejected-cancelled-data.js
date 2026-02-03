#!/usr/bin/env node

/**
 * Script to add REJECTED and CANCELLED test distributions to db.json
 * This creates comprehensive test data for the resubmission flow
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Helper to add days to a date
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.setDate(result.getDate() + days));
  return result.toISOString();
};

const baseDate = new Date('2025-12-16T10:00:00.000Z');

// ============================================================================
// SCENARIO 1: Android REJECTED (can resubmit)
// ============================================================================

const rejectedAndroidRelease = {
  id: 'rel_rejected_android',
  appId: 'EkgmIbgGQx',
  version: '5.0.0',
  branch: 'release/5.0.0',
  createdAt: addDays(baseDate, -3),
  updatedAt: addDays(baseDate, -1),
};

const rejectedAndroidDist = {
  id: 'dist_rejected_android',
  appId: 'EkgmIbgGQx',
  releaseId: 'rel_rejected_android',
  status: 'SUBMITTED', // Distribution shows SUBMITTED because submission was rejected
  createdAt: addDays(baseDate, -3),
  updatedAt: addDays(baseDate, -1),
};

const rejectedAndroidSub = {
  id: 'asb_rejected_001',
  distributionId: 'dist_rejected_android',
  version: '5.0.0',
  versionCode: 500,
  rolloutPercentage: 0,
  inAppUpdatePriority: 0,
  releaseNotes: 'Major new features and improvements',
  submittedAt: addDays(baseDate, -2),
  submittedBy: 'dev@dream11.com',
  statusUpdatedAt: addDays(baseDate, -1),
  createdAt: addDays(baseDate, -3),
  updatedAt: addDays(baseDate, -1),
  artifact: {
    artifactPath: 'https://s3.amazonaws.com/builds/app-release-500.aab',
    internalTrackLink: 'https://play.google.com/apps/testing/com.dream11.fantasy',
  },
  actionHistory: [],
  isCurrent: false, // NOT ACTIVE - rejected submission becomes inactive
  status: 'REJECTED',
  rejectionReason: 'The app crashes on launch. Please fix the critical bug and resubmit.',
};

// ============================================================================
// SCENARIO 2: iOS CANCELLED (can resubmit)
// ============================================================================

const cancelledIOSRelease = {
  id: 'rel_cancelled_ios',
  appId: 'EkgmIbgGQx',
  version: '5.1.0',
  branch: 'release/5.1.0',
  createdAt: addDays(baseDate, -5),
  updatedAt: addDays(baseDate, -2),
};

const cancelledIOSDist = {
  id: 'dist_cancelled_ios',
  appId: 'EkgmIbgGQx',
  releaseId: 'rel_cancelled_ios',
  status: 'SUBMITTED', // Distribution shows SUBMITTED because submission was cancelled
  createdAt: addDays(baseDate, -5),
  updatedAt: addDays(baseDate, -2),
};

const cancelledIOSSub = {
  id: 'isb_cancelled_001',
  distributionId: 'dist_cancelled_ios',
  version: '5.1.0',
  releaseType: 'AFTER_APPROVAL',
  phasedRelease: true,
  resetRating: false,
  rolloutPercentage: 0,
  releaseNotes: 'Performance improvements and bug fixes',
  submittedAt: addDays(baseDate, -4),
  submittedBy: 'prince@dream11.com',
  statusUpdatedAt: addDays(baseDate, -2),
  createdAt: addDays(baseDate, -5),
  updatedAt: addDays(baseDate, -2),
  artifact: {
    testflightNumber: 98765,
  },
  actionHistory: [
    {
      action: 'CANCELLED',
      createdAt: addDays(baseDate, -2),
      createdBy: 'prince@dream11.com',
      reason: 'Found a critical bug, need to fix before releasing',
    },
  ],
  isCurrent: false, // NOT ACTIVE - cancelled submission becomes inactive
  status: 'CANCELLED',
};

// ============================================================================
// SCENARIO 3: Both Platforms - Android REJECTED + iOS CANCELLED with resubmit
// ============================================================================

const bothRejectedRelease = {
  id: 'rel_both_rejected',
  appId: 'EkgmIbgGQx',
  version: '5.2.0',
  branch: 'release/5.2.0',
  createdAt: addDays(baseDate, -7),
  updatedAt: addDays(baseDate, 0),
};

const bothRejectedDist = {
  id: 'dist_both_rejected',
  appId: 'EkgmIbgGQx',
  releaseId: 'rel_both_rejected',
  status: 'PARTIALLY_SUBMITTED', // One rejected, one cancelled
  createdAt: addDays(baseDate, -7),
  updatedAt: addDays(baseDate, 0),
};

// Android: First submission was REJECTED (historical, isCurrent: false)
const bothRejectedAndroid_v1 = {
  id: 'asb_both_rejected_v1',
  distributionId: 'dist_both_rejected',
  version: '5.2.0',
  versionCode: 520,
  rolloutPercentage: 0,
  inAppUpdatePriority: 0,
  releaseNotes: 'Critical bug fixes',
  submittedAt: addDays(baseDate, -6),
  submittedBy: 'dev@dream11.com',
  statusUpdatedAt: addDays(baseDate, -4),
  createdAt: addDays(baseDate, -7),
  updatedAt: addDays(baseDate, -4),
  artifact: {
    artifactPath: 'https://s3.amazonaws.com/builds/app-release-520.aab',
    internalTrackLink: 'https://play.google.com/apps/testing/com.dream11.fantasy',
  },
  actionHistory: [],
  isCurrent: false, // Historical - this was rejected
  status: 'REJECTED',
  rejectionReason: 'App violates Google Play policies. Please review and fix.',
};

// iOS: First submission was CANCELLED (historical, isCurrent: false)
const bothRejectedIOS_v1 = {
  id: 'isb_both_rejected_v1',
  distributionId: 'dist_both_rejected',
  version: '5.2.0',
  releaseType: 'AFTER_APPROVAL',
  phasedRelease: true,
  resetRating: false,
  rolloutPercentage: 0,
  releaseNotes: 'Critical bug fixes',
  submittedAt: addDays(baseDate, -6),
  submittedBy: 'dev@dream11.com',
  statusUpdatedAt: addDays(baseDate, -3),
  createdAt: addDays(baseDate, -7),
  updatedAt: addDays(baseDate, -3),
  artifact: {
    testflightNumber: 98766,
  },
  actionHistory: [
    {
      action: 'CANCELLED',
      createdAt: addDays(baseDate, -3),
      createdBy: 'dev@dream11.com',
      reason: 'Need to match Android version after rejection',
    },
  ],
  isCurrent: false, // Historical - this was cancelled
  status: 'CANCELLED',
};

// ============================================================================
// SCENARIO 4: Multiple resubmissions (Android)
// Shows full lifecycle: REJECTED → RESUBMIT → CANCELLED → RESUBMIT → current
// ============================================================================

const multiResubmitRelease = {
  id: 'rel_multi_resubmit',
  appId: 'EkgmIbgGQx',
  version: '5.3.0',
  branch: 'release/5.3.0',
  createdAt: addDays(baseDate, -10),
  updatedAt: addDays(baseDate, 0),
};

const multiResubmitDist = {
  id: 'dist_multi_resubmit',
  appId: 'EkgmIbgGQx',
  releaseId: 'rel_multi_resubmit',
  status: 'SUBMITTED', // Currently in review after 2 resubmissions
  createdAt: addDays(baseDate, -10),
  updatedAt: addDays(baseDate, 0),
};

// v1: REJECTED (historical, isCurrent: false)
const multiResubmitAndroid_v1 = {
  id: 'asb_multi_v1',
  distributionId: 'dist_multi_resubmit',
  version: '5.3.0',
  versionCode: 530,
  rolloutPercentage: 0,
  inAppUpdatePriority: 0,
  releaseNotes: 'New release',
  submittedAt: addDays(baseDate, -9),
  submittedBy: 'dev@dream11.com',
  statusUpdatedAt: addDays(baseDate, -7),
  createdAt: addDays(baseDate, -10),
  updatedAt: addDays(baseDate, -7),
  artifact: {
    artifactPath: 'https://s3.amazonaws.com/builds/app-release-530-v1.aab',
    internalTrackLink: 'https://play.google.com/apps/testing/com.dream11.fantasy',
  },
  actionHistory: [],
  isCurrent: false,
  status: 'REJECTED',
  rejectionReason: 'Missing required permissions declaration',
};

// v2: CANCELLED (historical, isCurrent: false)
const multiResubmitAndroid_v2 = {
  id: 'asb_multi_v2',
  distributionId: 'dist_multi_resubmit',
  version: '5.3.0',
  versionCode: 531,
  rolloutPercentage: 0,
  inAppUpdatePriority: 0,
  releaseNotes: 'Fixed permissions issue',
  submittedAt: addDays(baseDate, -6),
  submittedBy: 'dev@dream11.com',
  statusUpdatedAt: addDays(baseDate, -4),
  createdAt: addDays(baseDate, -7),
  updatedAt: addDays(baseDate, -4),
  artifact: {
    artifactPath: 'https://s3.amazonaws.com/builds/app-release-531-v2.aab',
    internalTrackLink: 'https://play.google.com/apps/testing/com.dream11.fantasy',
  },
  actionHistory: [
    {
      action: 'CANCELLED',
      createdAt: addDays(baseDate, -4),
      createdBy: 'dev@dream11.com',
      reason: 'Found another bug during review, pulling back',
    },
  ],
  isCurrent: false,
  status: 'CANCELLED',
};

// v3: Current submission - IN_REVIEW (active, isCurrent: true)
const multiResubmitAndroid_v3 = {
  id: 'asb_multi_v3_current',
  distributionId: 'dist_multi_resubmit',
  version: '5.3.0',
  versionCode: 532,
  rolloutPercentage: 0,
  inAppUpdatePriority: 0,
  releaseNotes: 'All issues fixed, ready for release',
  submittedAt: addDays(baseDate, -2),
  submittedBy: 'dev@dream11.com',
  statusUpdatedAt: addDays(baseDate, -2),
  createdAt: addDays(baseDate, -3),
  updatedAt: addDays(baseDate, -2),
  artifact: {
    artifactPath: 'https://s3.amazonaws.com/builds/app-release-532-v3.aab',
    internalTrackLink: 'https://play.google.com/apps/testing/com.dream11.fantasy',
  },
  actionHistory: [],
  isCurrent: true, // This is the current active submission
  status: 'IN_REVIEW',
};

// ============================================================================
// Add all data to db
// ============================================================================

// Add releases
db.releases.push(
  rejectedAndroidRelease,
  cancelledIOSRelease,
  bothRejectedRelease,
  multiResubmitRelease
);

// Add distributions
db.store_distribution.push(
  rejectedAndroidDist,
  cancelledIOSDist,
  bothRejectedDist,
  multiResubmitDist
);

// Add Android submissions
db.android_submission_builds.push(
  rejectedAndroidSub,
  bothRejectedAndroid_v1,
  multiResubmitAndroid_v1,
  multiResubmitAndroid_v2,
  multiResubmitAndroid_v3
);

// Add iOS submissions
db.ios_submission_builds.push(
  cancelledIOSSub,
  bothRejectedIOS_v1
);

// Write back to file
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('✅ Added REJECTED and CANCELLED test data to db.json');
console.log('\nTest Distributions Added:');
console.log('  1. dist_rejected_android (Android REJECTED - can resubmit)');
console.log('  2. dist_cancelled_ios (iOS CANCELLED - can resubmit)');
console.log('  3. dist_both_rejected (Both platforms rejected/cancelled)');
console.log('  4. dist_multi_resubmit (Multiple resubmissions: REJECTED → CANCELLED → IN_REVIEW)');
console.log('\nYou can now test these scenarios at:');
console.log('  • /dashboard/EkgmIbgGQx/distributions/dist_rejected_android');
console.log('  • /dashboard/EkgmIbgGQx/distributions/dist_cancelled_ios');
console.log('  • /dashboard/EkgmIbgGQx/distributions/dist_both_rejected');
console.log('  • /dashboard/EkgmIbgGQx/distributions/dist_multi_resubmit');

