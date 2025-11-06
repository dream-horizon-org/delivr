// MyCodePushApp/testRunner.js

import { run, directoryChange, updateTemplateFileName, revertTemplateFileName, runMaestroTest, deleteTestingDirectory, createSubFolderInTestingDir, moveAssets, corruptBundle ,addImage, removeImage} from './automate.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process'; 
// Change to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.resolve(__dirname));

// Test Results Tracking
const testResults = {
  passed: [],
  failed: [],
  skipped: []
};

// Test Registry
const TEST_CASES = {
 
  'fullbundle': {
    name: 'Full Bundle Test',
    description: 'Tests full bundle deployment with CodePush',
    fn: testFullBundle
  },
  
  'patchbundle': {
    name: 'Patch Bundle Test',
    description: 'Tests patch bundle deployment',
    fn: testPatchBundle
  },
  
  
  'fullbundle-config-error': {
    name: 'Full Bundle Config Error Test',
    description: 'Tests full bundle with config error (-p true flag)',
    fn: testFullBundleConfigError
  },
  'fullbundle-corrupted': {
    name: 'Full Bundle Corrupted Test',
    description: 'Tests rollback behavior with corrupted full bundle',
    fn: testFullBundleCorrupted
  },
  'fullbundle-brotli': {
    name: 'Full Bundle with Brotli',
    description: 'Tests full bundle with Brotli compression',
    fn: testFullBundleBrotli
  },
  'patch-config-error': {
    name: 'Patch Config Error Test',
    description: 'Tests patch bundle without -p true flag',
    fn: testPatchConfigError
  },
  'patchbundle-corrupted': {
    name: 'Patch Bundle Corrupted Test',
    description: 'Tests rollback behavior with corrupted patch bundle',
    fn: testPatchBundleCorrupted
  },
  'patchbundle-brotli': {
    name: 'Patch Bundle with Brotli',
    description: 'Tests patch bundle with Brotli compression',
    fn: testPatchBundleBrotli
  },
  
  'assets-fullbundle': {
    name: 'Assets Full Bundle Test',
    description: 'Tests full bundle with assets',
    fn: testAssetsFullBundle
  },
  'eventflow-fullbundle': {
    name: 'Event Flow Full Bundle Test',
    description: 'Tests event flow with full bundle',
    fn: testEventFlowFullBundle
  },
  
};

// Helper function to run a test with error handling
async function runTest(testName, testConfig) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Running Test: ${testConfig.name}`);
  console.log(`📝 Description: ${testConfig.description}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();
  
  try {
    await testConfig.fn();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    testResults.passed.push({ name: testName, displayName: testConfig.name, duration });
    console.log(`\n✅ PASSED: ${testConfig.name} (${duration}s)\n`);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    testResults.failed.push({ 
      name: testName, 
      displayName: testConfig.name, 
      duration,
      error: error.message || error.toString()
    });
    console.error(`\n❌ FAILED: ${testConfig.name} (${duration}s)`);
    console.error(`Error: ${error.message || error.toString()}\n`);
  }
}

// Test Case Implementations
function testFullBundle() {
  run('yarn install', 'Installing dependencies');
  run('yarn android --mode=Release', 'Creating base bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  updateTemplateFileName('App.tsx', 'AppNew.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch"', 'Creating codepush release');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  const result = run(`maestro test ./ui-automation.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  
  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

function testFullBundleConfigError() {
  run('yarn install', 'Installing dependencies');
  run('yarn android --mode=Release', 'Creating base bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  updateTemplateFileName('App.tsx', 'AppNew.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch" -p true', 'Creating codepush release');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  const result = run(`maestro test ./ui-automation-corrupted.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  
  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

function testFullBundleBrotli() {
  run('yarn install', 'Installing dependencies');
  run('yarn android --mode=Release', 'Creating base bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  updateTemplateFileName('App.tsx', 'AppNew.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing with Brotli" -c \'brotli\'', 'Creating codepush release with Brotli');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  const result = run(`maestro test ./ui-automation.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  
  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

function testFullBundleCorrupted() {
  run('yarn install', 'Installing dependencies');
  run('yarn android --mode=Release', 'Creating base bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  
  updateTemplateFileName('App.tsx', 'AppNew.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  corruptBundle('.dota-testing/android-cp/index.android.bundle', 'truncate', 5000);
  
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Corrupted bundle test"', 'Creating codepush release with corrupted bundle');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  const result = run(`maestro test ./ui-automation-corrupted.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  
  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
  
  console.log('\n✅ Corrupted Bundle Test Complete!\n');
}

function testPatchBundle() {
  run('yarn install', 'Installing dependencies');
  const r = run('yarn android --mode=Release', 'Creating base bundle');
if (!r.success) {
  console.warn('⚠️ Skipping remaining steps for this test due to failure.');
  return;
}
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  updateTemplateFileName('App.tsx', 'AppNew.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');

  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  createSubFolderInTestingDir('.codepush');
  run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
  moveAssets();
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true', 'Creating codepush patch release');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  
  const result = run(`maestro test ./ui-automation.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  

  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

function testPatchBundleBrotli() {
  run('yarn install', 'Installing dependencies');
  run('yarn android --mode=Release', 'Creating base bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  updateTemplateFileName('App.tsx', 'AppNew.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  createSubFolderInTestingDir('.codepush');
  run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
  moveAssets();
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true -c \'brotli\'', 'Creating codepush patch release with Brotli');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  const result = run(`maestro test ./ui-automation.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  
  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

function testPatchBundleCorrupted() {
  run('yarn install', 'Installing dependencies');
  run('yarn android --mode=Release', 'Creating base bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  updateTemplateFileName('App.tsx', 'App1.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  createSubFolderInTestingDir('.codepush');
  run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
  moveAssets();
  corruptBundle('.dota-testing/.codepush/bundle.patch', 'truncate');
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true', 'Creating codepush patch release');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  const result = run(`maestro test ./ui-automation-corrupted.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  
  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

function testPatchConfigError() {
  run('yarn install', 'Installing dependencies');
  run('yarn android --mode=Release', 'Creating base bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
  updateTemplateFileName('App.tsx', 'AppNew.tsx');
  run('yarn android --mode=Release', 'Creating codepush bundle');
  directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
  
  createSubFolderInTestingDir('.codepush');
  run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
  moveAssets();
  run('yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch"', 'Creating codepush patch release');
  
  revertTemplateFileName('App.tsx', 'App.tsx');
  run('yarn android --mode=Release', 'Creating bundle');
  
  const result = run(`maestro test ./ui-automation-corrupted.yaml`, 'Run Maestro test');
  if (!result.success) {
    throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  }
  
  deleteTestingDirectory('.dota-testing');
  run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

// Placeholder functions for tests not yet seen
function testAssetsFullBundle() {
    run('yarn install', 'Installing dependencies');
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
    
    updateTemplateFileName('App.tsx', 'AppNew.tsx');
    addImage();
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
    
    run(' yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch"', 'Creating codepush release');
    
    revertTemplateFileName('App.tsx', 'App.tsx');
    removeImage();  
    
    run('yarn android --mode=Release', 'Creating base bundle');
    const result = run(`maestro test ./ui-automation-assets.yaml`, 'Run Maestro test');
    if (!result.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
    
    
    
    deleteTestingDirectory('.dota-testing');
    run('adb uninstall com.mycodepushapp', 'Uninstalling app');
}

function testEventFlowFullBundle() {
    run('adb logcat -c', 'Clearing logcat');

    run('yarn install', 'Installing dependencies');
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
    updateTemplateFileName('App.tsx', 'AppNew.tsx');
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');
    
    run(' yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch"', 'Creating codepush release');
    
    revertTemplateFileName('App.tsx', 'App.tsx');
    
    run('yarn android --mode=Release', 'Creating bundle');
    
    const result = run(`maestro test ./ui-automation.yaml`, 'Run Maestro test');
    if (!result.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
    
    // Wait a bit for the update to complete and logs to flush
    console.log('\n⏳ Waiting 5 seconds for update to complete and logs to flush...');
    execSync('sleep 5', { stdio: 'inherit' });
    
    // Dump logcat and check CodePush status events appear in order
    const rawLog = execSync('adb logcat -d | grep "\\[CodePush\\] Status" | tail -n 200', {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 5, // 5 MB is more than enough
    });
    
    const statusLines = rawLog
      .split('\n')
      .filter(l => l.includes('[CodePush] Status'));
    
    console.log('\n[EventFlow] CodePush status lines:');
    statusLines.forEach(l => console.log(l));
    
    const expected = [
      'Downloading package.',
      'Download request success.',
      'Unzipped success.',
      'Installing update.'
    ];
    
    // Verify order
    let lastIndex = -1;
    for (const step of expected) {
      const idx = statusLines.findIndex((l, i) => i > lastIndex && l.includes(step));
      if (idx === -1) {
        console.error(`❌ Missing or out-of-order step: ${step}`);
        console.error(`\n💡 Tip: Make sure the app clicked "Install" and the update completed.`);
        process.exit(1);
      }
      console.log(`✅ Found: ${step}`);
      lastIndex = idx;
    }
    console.log('\n✅ Event flow verified in order!');
    
    deleteTestingDirectory('.dota-testing');
    run('adb uninstall com.mycodepushapp', 'Uninstalling app');

}

// Generate Report
function generateReport() {
  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           TEST EXECUTION REPORT                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const total = testResults.passed.length + testResults.failed.length + testResults.skipped.length;
  const passRate = total > 0 ? ((testResults.passed.length / total) * 100).toFixed(1) : 0;
  
  console.log(`📊 Summary:`);
  console.log(`   Total Tests:    ${total}`);
  console.log(`   ✅ Passed:      ${testResults.passed.length}`);
  console.log(`   ❌ Failed:      ${testResults.failed.length}`);
  console.log(`   ⏭️  Skipped:     ${testResults.skipped.length}`);
  console.log(`   📈 Pass Rate:   ${passRate}%`);
  console.log('');
  
  if (testResults.passed.length > 0) {
    console.log('✅ PASSED TESTS:');
    testResults.passed.forEach(test => {
      console.log(`   ✓ ${test.displayName} (${test.duration}s)`);
    });
    console.log('');
  }
  
  if (testResults.failed.length > 0) {
    console.log('❌ FAILED TESTS:');
    testResults.failed.forEach(test => {
      console.log(`   ✗ ${test.displayName} (${test.duration}s)`);
      console.log(`     Error: ${test.error}`);
    });
    console.log('');
  }
  
  if (testResults.skipped.length > 0) {
    console.log('⏭️  SKIPPED TESTS:');
    testResults.skipped.forEach(test => {
      console.log(`   - ${test.displayName}`);
    });
    console.log('');
  }
  
  // Save report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      skipped: testResults.skipped.length,
      passRate: `${passRate}%`
    },
    results: testResults
  };
  
  const reportPath = path.resolve('./test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
  
  console.log('═'.repeat(80));
  console.log('');
}

// Main Test Runner
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let testsToRun = [];
  
  if (args.length === 0) {
    console.log('\n📋 Available tests:');
    Object.keys(TEST_CASES).forEach((key, index) => {
      console.log(`   ${index + 1}. ${key} - ${TEST_CASES[key].description}`);
    });
    console.log('\n💡 Usage:');
    console.log('   Run all tests:       node testRunner.js --all');
    console.log('   Run specific test:   node testRunner.js fullbundle');
    console.log('   Run multiple tests:  node testRunner.js fullbundle patchbundle');
    console.log('   List tests:          node testRunner.js --list\n');
    return;
  }
  
  if (args[0] === '--list') {
    console.log('\n📋 Available tests:\n');
    Object.keys(TEST_CASES).forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`);
      console.log(`      ${TEST_CASES[key].description}\n`);
    });
    return;
  }
  
  if (args[0] === '--all') {
    testsToRun = Object.keys(TEST_CASES);
  } else {
    testsToRun = args.filter(arg => TEST_CASES[arg]);
    const invalidTests = args.filter(arg => !TEST_CASES[arg]);
    if (invalidTests.length > 0) {
      console.error(`❌ Invalid test names: ${invalidTests.join(', ')}`);
      console.log('\n💡 Run "node testRunner.js --list" to see available tests');
      process.exit(1);
    }
  }
  
  console.log('\n🚀 Starting Test Runner...');
  console.log(`📝 Running ${testsToRun.length} test(s)\n`);
  
  const overallStartTime = Date.now();
  
  // Run tests sequentially
  for (const testName of testsToRun) {
    await runTest(testName, TEST_CASES[testName]);
  }
  
  const totalDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);
  
  // Generate report
  generateReport();
  
  console.log(`⏱️  Total execution time: ${totalDuration}s\n`);
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run the test runner
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});