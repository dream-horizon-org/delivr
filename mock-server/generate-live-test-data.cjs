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

// Calculate correct distribution status
function calculateDistributionStatus(platforms, androidSub, iosSub) {
  const singlePlatform = platforms.length === 1;
  const isReleased = (sub) => ['APPROVED', 'LIVE', 'PAUSED', 'HALTED'].includes(sub.status);
  
  if (singlePlatform) {
    const sub = androidSub || iosSub;
    if (sub.status === 'PENDING') return 'PENDING';
    if (isReleased(sub)) return 'RELEASED';
    return 'SUBMITTED';
  } else {
    const submissions = [androidSub, iosSub].filter(Boolean);
    if (submissions.every(s => s.status === 'PENDING')) return 'PENDING';
    if (submissions.every(isReleased)) return 'RELEASED';
    if (submissions.some(isReleased)) return 'PARTIALLY_RELEASED';
    if (submissions.every(s => s.status === 'IN_REVIEW')) return 'SUBMITTED';
    return 'PARTIALLY_SUBMITTED';
  }
}

// Test scenarios for LIVE state
const liveScenarios = [
  // Android LIVE - various rollout percentages
  {
    name: '4.1.0 - Android LIVE at 5%',
    platforms: ['ANDROID'],
    android: { status: 'LIVE', rollout: 5 }
  },
  {
    name: '4.2.0 - Android LIVE at 25%',
    platforms: ['ANDROID'],
    android: { status: 'LIVE', rollout: 25 }
  },
  {
    name: '4.3.0 - Android LIVE at 50%',
    platforms: ['ANDROID'],
    android: { status: 'LIVE', rollout: 50 }
  },
  {
    name: '4.4.0 - Android LIVE at 75.5%',
    platforms: ['ANDROID'],
    android: { status: 'LIVE', rollout: 75.5 }
  },
  {
    name: '4.5.0 - Android LIVE at 100%',
    platforms: ['ANDROID'],
    android: { status: 'LIVE', rollout: 100 }
  },
  // iOS Phased Release - various rollout percentages
  {
    name: '4.6.0 - iOS Phased LIVE at 1%',
    platforms: ['IOS'],
    ios: { status: 'LIVE', rollout: 1, phasedRelease: true }
  },
  {
    name: '4.7.0 - iOS Phased LIVE at 15%',
    platforms: ['IOS'],
    ios: { status: 'LIVE', rollout: 15, phasedRelease: true }
  },
  {
    name: '4.8.0 - iOS Phased LIVE at 50%',
    platforms: ['IOS'],
    ios: { status: 'LIVE', rollout: 50, phasedRelease: true }
  },
  {
    name: '4.9.0 - iOS Phased LIVE at 85%',
    platforms: ['IOS'],
    ios: { status: 'LIVE', rollout: 85, phasedRelease: true }
  },
  {
    name: '4.10.0 - iOS Phased Completed Early to 100%',
    platforms: ['IOS'],
    ios: { status: 'LIVE', rollout: 100, phasedRelease: true }
  },
  // iOS Manual Release - always 100%
  {
    name: '4.11.0 - iOS Manual LIVE at 100%',
    platforms: ['IOS'],
    ios: { status: 'LIVE', rollout: 100, phasedRelease: false }
  },
  // Both platforms - various combinations
  {
    name: '4.12.0 - Both LIVE, Android 10%, iOS Phased 25%',
    platforms: ['ANDROID', 'IOS'],
    android: { status: 'LIVE', rollout: 10 },
    ios: { status: 'LIVE', rollout: 25, phasedRelease: true }
  },
  {
    name: '4.13.0 - Both LIVE, Android 50%, iOS Manual 100%',
    platforms: ['ANDROID', 'IOS'],
    android: { status: 'LIVE', rollout: 50 },
    ios: { status: 'LIVE', rollout: 100, phasedRelease: false }
  },
  {
    name: '4.14.0 - Both LIVE at 100%',
    platforms: ['ANDROID', 'IOS'],
    android: { status: 'LIVE', rollout: 100 },
    ios: { status: 'LIVE', rollout: 100, phasedRelease: true }
  },
  // Android HALTED scenario
  {
    name: '4.15.0 - Android HALTED at 35%',
    platforms: ['ANDROID'],
    android: { status: 'HALTED', rollout: 35 }
  },
  // iOS PAUSED scenario
  {
    name: '4.16.0 - iOS Phased PAUSED at 45%',
    platforms: ['IOS'],
    ios: { status: 'PAUSED', rollout: 45, phasedRelease: true }
  },
  // Mixed LIVE statuses
  {
    name: '4.17.0 - Android LIVE 75%, iOS PAUSED 30%',
    platforms: ['ANDROID', 'IOS'],
    android: { status: 'LIVE', rollout: 75 },
    ios: { status: 'PAUSED', rollout: 30, phasedRelease: true }
  },
  {
    name: '4.18.0 - Android HALTED 60%, iOS LIVE 100%',
    platforms: ['ANDROID', 'IOS'],
    android: { status: 'HALTED', rollout: 60 },
    ios: { status: 'LIVE', rollout: 100, phasedRelease: false }
  },
  // Android with decimal rollouts
  {
    name: '4.19.0 - Android LIVE at 12.5%',
    platforms: ['ANDROID'],
    android: { status: 'LIVE', rollout: 12.5 }
  },
  {
    name: '4.20.0 - Android LIVE at 33.3%',
    platforms: ['ANDROID'],
    android: { status: 'LIVE', rollout: 33.3 }
  },
];

// Generate releases and distributions
liveScenarios.forEach((scenario, i) => {
  const index = i + 1;
  const version = `4.${index}.0`;
  const releaseId = `rel_live_${String(index).padStart(3, '0')}`;
  const distId = `dist_live_${String(index).padStart(3, '0')}`;
  
  // Release
  db.releases.push({
    id: releaseId,
    tenantId: 'EkgmIbgGQx',
    version: version,
    branch: `release/${version}`,
    createdAt: daysAgo(25 - i),
    updatedAt: daysAgo(Math.max(0, 24 - i)),
  });
  
  // Distribution
  const androidSub = scenario.android ? {
    status: scenario.android.status,
  } : null;
  
  const iosSub = scenario.ios ? {
    status: scenario.ios.status,
  } : null;
  
  const distributionStatus = calculateDistributionStatus(scenario.platforms, androidSub, iosSub);
  
  db.store_distribution.push({
    id: distId,
    releaseId: releaseId,
    tenantId: 'EkgmIbgGQx',
    status: distributionStatus,
    createdAt: daysAgo(25 - i),
    updatedAt: daysAgo(Math.max(0, 23 - i)),
    statusUpdatedAt: daysAgo(Math.max(0, 23 - i)),
  });
  
  // Android submission
  if (scenario.android) {
    const androidConfig = scenario.android;
    const androidSubmissionId = `asb_live_${String(index).padStart(3, '0')}`;
    
    const actionHistory = [];
    if (androidConfig.status === 'HALTED') {
      actionHistory.push({
        action: 'HALTED',
        createdBy: 'prince@dream11.com',
        createdAt: daysAgo(Math.max(0, 22 - i)),
        reason: 'Critical bug detected in production'
      });
    }
    
    db.android_submission_builds.push({
      id: androidSubmissionId,
      distributionId: distId,
      releaseId: releaseId,
      tenantId: 'EkgmIbgGQx',
      storeType: 'PLAY_STORE',
      status: androidConfig.status,
      version: version,
      versionCode: 400 + index,
      rolloutPercentage: androidConfig.rollout,
      inAppUpdatePriority: Math.min(index % 6, 5),
      releaseNotes: `Release ${version} - ${scenario.name}`,
      artifactPath: `s3://builds/android/${version}/app-release.aab`,
      internalTrackLink: `https://play.google.com/apps/testing/com.dream11.fantasy`,
      submittedAt: daysAgo(24 - i),
      submittedBy: 'prince@dream11.com',
      statusUpdatedAt: daysAgo(Math.max(0, 23 - i)),
      isCurrent: true,
      createdAt: daysAgo(25 - i),
      updatedAt: daysAgo(Math.max(0, 23 - i)),
      actionHistory: JSON.stringify(actionHistory)
    });
  }
  
  // iOS submission
  if (scenario.ios) {
    const iosConfig = scenario.ios;
    const iosSubmissionId = `isb_live_${String(index).padStart(3, '0')}`;
    
    const actionHistory = [];
    if (iosConfig.status === 'PAUSED') {
      actionHistory.push({
        action: 'PAUSED',
        createdBy: 'prince@dream11.com',
        createdAt: daysAgo(Math.max(0, 22 - i)),
        reason: 'Found issue during phased rollout'
      });
    }
    
    db.ios_submission_builds.push({
      id: iosSubmissionId,
      distributionId: distId,
      releaseId: releaseId,
      tenantId: 'EkgmIbgGQx',
      storeType: 'APP_STORE',
      status: iosConfig.status,
      version: version,
      releaseType: 'AFTER_APPROVAL',
      phasedRelease: iosConfig.phasedRelease,
      resetRating: false,
      rolloutPercentage: iosConfig.rollout,
      releaseNotes: `Release ${version} - ${scenario.name}`,
      testflightNumber: 50000 + index,
      submittedAt: daysAgo(24 - i),
      submittedBy: 'prince@dream11.com',
      statusUpdatedAt: daysAgo(Math.max(0, 23 - i)),
      isCurrent: true,
      createdAt: daysAgo(25 - i),
      updatedAt: daysAgo(Math.max(0, 23 - i)),
      actionHistory: JSON.stringify(actionHistory)
    });
  }
});

// Write to file
const outputPath = path.join(__dirname, 'data', 'db.json');
fs.writeFileSync(outputPath, JSON.stringify(db, null, 2));

console.log('✅ Generated LIVE state test data');
console.log(`   - Total distributions: ${db.store_distribution.length}`);
console.log(`   - Android submissions: ${db.android_submission_builds.length}`);
console.log(`   - iOS submissions: ${db.ios_submission_builds.length}`);
console.log('');
console.log('📊 Test Scenarios:');
liveScenarios.forEach((s, i) => console.log(`   ${i+1}. ${s.name}`));
console.log('');
console.log('💡 Restart mock server to see changes: pnpm run mock');

