#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const db = {
  releases: [],
  store_distribution: [],
  android_submission_builds: [],
  ios_submission_builds: []
};

const statuses = ['PENDING', 'PARTIALLY_SUBMITTED', 'SUBMITTED', 'PARTIALLY_RELEASED', 'RELEASED'];
const submissionStatuses = ['PENDING', 'IN_REVIEW', 'APPROVED', 'LIVE'];

// Helper to generate dates
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

// Generate 30 distributions
for (let i = 0; i < 30; i++) {
  const releaseId = `rel_${String(i + 1).padStart(3, '0')}`;
  const distId = `dist_${String(i + 1).padStart(3, '0')}`;
  const version = `3.${i}.0`;
  const versionCode = 300 + i;
  
  // Determine platforms (vary the pattern)
  let platforms = ['ANDROID', 'IOS'];
  if (i % 7 === 1) platforms = ['ANDROID'];
  if (i % 7 === 2) platforms = ['IOS'];
  
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
  
  // Create distribution
  const distStatus = statuses[i % statuses.length];
  db.store_distribution.push({
    id: distId,
    tenantId: 'EkgmIbgGQx',
    releaseId: releaseId,
    status: distStatus,
    createdAt: daysAgo(30 - i),
    updatedAt: daysAgo(Math.max(0, 30 - i - 5))
  });
  
  // Create Android submission if platform includes ANDROID
  if (platforms.includes('ANDROID')) {
    const subStatus = submissionStatuses[i % submissionStatuses.length];
    const rolloutPercentage = subStatus === 'LIVE' ? [5, 10, 25, 50, 75, 100][i % 6] : 0;
    
    db.android_submission_builds.push({
      id: `asb_${String(i + 1).padStart(3, '0')}`,
      distributionId: distId,
      releaseId: releaseId,
      tenantId: 'EkgmIbgGQx',
      storeType: 'PLAY_STORE',
      status: subStatus,
      version: version,
      versionCode: versionCode,
      rolloutPercentage: rolloutPercentage,
      inAppUpdatePriority: i % 6,
      releaseNotes: `Release ${version} - Bug fixes and improvements`,
      artifactPath: `s3://builds/android/${version}/app-release.aab`,
      internalTrackLink: i === 0 ? `https://play.google.com/apps/testing/com.dream11.fantasy` : null,
      submittedAt: subStatus === 'PENDING' ? null : daysAgo(29 - i),
      submittedBy: subStatus === 'PENDING' ? null : 'prince@dream11.com',
      statusUpdatedAt: daysAgo(Math.max(0, 29 - i)),
      isCurrent: true,
      createdAt: daysAgo(30 - i),
      updatedAt: daysAgo(Math.max(0, 29 - i)),
      actionHistory: []
    });
  }
  
  // Create iOS submission if platform includes IOS
  if (platforms.includes('IOS')) {
    const subStatus = submissionStatuses[(i + 1) % submissionStatuses.length];
    const rolloutPercentage = subStatus === 'LIVE' ? [0, 10, 25, 50, 75, 100][i % 6] : 0;
    const phasedRelease = i % 3 !== 0; // 2/3 are phased
    
    db.ios_submission_builds.push({
      id: `isb_${String(i + 1).padStart(3, '0')}`,
      distributionId: distId,
      releaseId: releaseId,
      tenantId: 'EkgmIbgGQx',
      storeType: 'APP_STORE',
      status: subStatus,
      version: version,
      releaseType: 'AFTER_APPROVAL',
      phasedRelease: phasedRelease,
      resetRating: i % 10 === 5,
      rolloutPercentage: rolloutPercentage,
      releaseNotes: `Release ${version} - Bug fixes and improvements`,
      testflightNumber: 50000 + i + 1,
      submittedAt: subStatus === 'PENDING' ? null : daysAgo(29 - i),
      submittedBy: subStatus === 'PENDING' ? null : 'prince@dream11.com',
      statusUpdatedAt: daysAgo(Math.max(0, 29 - i)),
      isCurrent: true,
      createdAt: daysAgo(30 - i),
      updatedAt: daysAgo(Math.max(0, 29 - i)),
      actionHistory: []
    });
  }
}

// Add special scenarios to specific distributions

// dist_004 - Multiple rejection/resubmission history
const dist004AndroidIndex = db.android_submission_builds.findIndex(s => s.distributionId === 'dist_004');
if (dist004AndroidIndex !== -1) {
  const current = db.android_submission_builds[dist004AndroidIndex];
  
  // Add rejected submission (historical)
  db.android_submission_builds.push({
    ...current,
    id: 'asb_004_v1_rejected',
    status: 'REJECTED',
    versionCode: 330,
    rolloutPercentage: 0,
    isCurrent: false,
    releaseNotes: 'First attempt - rejected',
    artifactPath: 's3://builds/android/3.3.0-v1/app-release.aab',
    submittedAt: daysAgo(27),
    statusUpdatedAt: daysAgo(26),
    updatedAt: daysAgo(26)
  });
  
  // Add cancelled submission (historical)
  db.android_submission_builds.push({
    ...current,
    id: 'asb_004_v2_cancelled',
    status: 'CANCELLED',
    versionCode: 331,
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
  current.versionCode = 332;
  current.releaseNotes = 'Third attempt - in review';
}

// dist_010 - HALTED Android
const dist010Index = db.android_submission_builds.findIndex(s => s.distributionId === 'dist_010');
if (dist010Index !== -1) {
  db.android_submission_builds[dist010Index].status = 'HALTED';
  db.android_submission_builds[dist010Index].rolloutPercentage = 15.5;
  db.android_submission_builds[dist010Index].actionHistory = [{
    action: 'HALTED',
    createdBy: 'prince@dream11.com',
    createdAt: daysAgo(3),
    reason: 'Critical security vulnerability'
  }];
}

// dist_015 - PAUSED iOS
const dist015IosIndex = db.ios_submission_builds.findIndex(s => s.distributionId === 'dist_015');
if (dist015IosIndex !== -1) {
  db.ios_submission_builds[dist015IosIndex].status = 'PAUSED';
  db.ios_submission_builds[dist015IosIndex].rolloutPercentage = 50;
  db.ios_submission_builds[dist015IosIndex].phasedRelease = true;
  db.ios_submission_builds[dist015IosIndex].actionHistory = [{
    action: 'PAUSED',
    createdBy: 'prince@dream11.com',
    createdAt: daysAgo(2),
    reason: 'UI bug detected'
  }];
}

// dist_020 - iOS with PAUSE/RESUME history
const dist020IosIndex = db.ios_submission_builds.findIndex(s => s.distributionId === 'dist_020');
if (dist020IosIndex !== -1) {
  db.ios_submission_builds[dist020IosIndex].status = 'LIVE';
  db.ios_submission_builds[dist020IosIndex].rolloutPercentage = 75;
  db.ios_submission_builds[dist020IosIndex].phasedRelease = true;
  db.ios_submission_builds[dist020IosIndex].actionHistory = [
    {
      action: 'PAUSED',
      createdBy: 'prince@dream11.com',
      createdAt: daysAgo(5),
      reason: 'Investigating crash reports'
    },
    {
      action: 'RESUMED',
      createdBy: 'prince@dream11.com',
      createdAt: daysAgo(3),
      reason: 'Issue resolved'
    }
  ];
}

// Add some decimal rollout percentages
[5, 12, 18, 25].forEach(idx => {
  const sub = db.android_submission_builds.find(s => s.distributionId === `dist_${String(idx).padStart(3, '0')}`);
  if (sub && sub.status === 'LIVE') {
    sub.rolloutPercentage = [27.5, 5.5, 99.5, 15.3][idx % 4];
  }
});

const dbPath = path.join(__dirname, 'data', 'db.json');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`✅ Generated ${db.store_distribution.length} distributions`);
console.log(`   - Android submissions: ${db.android_submission_builds.length}`);
console.log(`   - iOS submissions: ${db.ios_submission_builds.length}`);
console.log(`   - Total submissions: ${db.android_submission_builds.length + db.ios_submission_builds.length}`);
console.log(`   - Distribution statuses: ${[...new Set(db.store_distribution.map(d => d.status))].join(', ')}`);
console.log(`\n💡 Refresh browser to see changes`);

