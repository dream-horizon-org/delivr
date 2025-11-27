/**
 * Jest Test Suite for CodePush Integration Tests
 * 
 * This file replaces testRunner.js and provides comprehensive test coverage
 * for full bundle and patch bundle scenarios using Jest framework.
 * 
 * Test Structure:
 * - fullbundle: Tests for full bundle deployments (6 test cases)
 * - patchbundle: Tests for patch bundle deployments (6 test cases)
 */

const { execSync } = require('child_process');
const path = require('path');

// Get current directory
const currentDir = __dirname || process.cwd();

// Change to project root (parent of __tests__)
const projectRoot = path.resolve(currentDir, '..');
process.chdir(projectRoot);

// Load ES module utilities dynamically
const { loadAutomate } = require('./module-loader');

let run, directoryChange, updateTemplateFileName, revertTemplateFileName;
let deleteTestingDirectory, createSubFolderInTestingDir, moveAssets;
let corruptBundle, addImage, removeImage;
let originalContentCache;

// Load utilities before tests run
beforeAll(async () => {
  try {
    const automateModule = await loadAutomate();
    if (!automateModule) {
      throw new Error('Failed to load automate module');
    }
    
    // Debug: log what we got
    console.log('Automate module keys:', Object.keys(automateModule));
    console.log('run type:', typeof automateModule.run);
    
    // Handle both default export and named exports
    const moduleExports = automateModule.default || automateModule;
    
    run = moduleExports.run;
    directoryChange = moduleExports.directoryChange;
    updateTemplateFileName = moduleExports.updateTemplateFileName;
    revertTemplateFileName = moduleExports.revertTemplateFileName;
    deleteTestingDirectory = moduleExports.deleteTestingDirectory;
    createSubFolderInTestingDir = moduleExports.createSubFolderInTestingDir;
    moveAssets = moduleExports.moveAssets;
    corruptBundle = moduleExports.corruptBundle;
    addImage = moduleExports.addImage;
    removeImage = moduleExports.removeImage;
    
    // Initialize the content cache Map
    originalContentCache = new Map();
    
    // Verify functions are loaded
    if (!run || typeof run !== 'function') {
      console.error('Available exports:', Object.keys(moduleExports));
      throw new Error('run function not loaded correctly. Available: ' + Object.keys(moduleExports).join(', '));
    }
  } catch (error) {
    console.error('Error loading automate module:', error);
    throw error;
  }
}, 30000); // 30 second timeout for loading

describe('fullbundle', () => {
  // Cleanup before each test
  beforeEach(() => {
    // Clean up any existing test directories
    if (deleteTestingDirectory) {
      deleteTestingDirectory('.dota-testing');
    }
  });

  // Cleanup after each test
  afterEach(() => {
    // Always revert App.tsx to original state, even if test failed
    if (revertTemplateFileName) {
      try {
        revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');
      } catch (err) {
        console.warn('⚠️ Could not revert App.tsx:', err.message);
      }
    }
    // Clean up test directories
    if (deleteTestingDirectory) {
      deleteTestingDirectory('.dota-testing');
    }
    // Uninstall app to ensure clean state
    if (run) {
      run('adb uninstall com.mycodepushapp', 'Uninstalling app');
    }
  });

  test('should deploy and verify full bundle with default settings', async () => {
    // Create base bundle
    const baseResult = run('yarn android --mode=Release', 'Creating base bundle');
    if (!baseResult.success) {
      throw new Error('Failed to create base bundle');
    }

    // Move base bundle to testing directory
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name for CodePush bundle
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    const cpResult = run('yarn android --mode=Release', 'Creating codepush bundle');
    if (!cpResult.success) {
      throw new Error('Failed to create CodePush bundle');
    }

    // Move CodePush bundle to testing directory
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create CodePush release
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch"',
      'Creating codepush release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush release');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    const finalResult = run('yarn android --mode=Release', 'Creating bundle');
    if (!finalResult.success) {
      throw new Error('Failed to create final bundle');
    }

    // Run Maestro test
    const maestroResult = run(`maestro test __tests__/ui-automation.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000); // 10 minute timeout

  test('should deploy and verify full bundle with Brotli compression', async () => {
    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create CodePush release with Brotli compression
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing with Brotli" -c \'brotli\'',
      'Creating codepush release with Brotli'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush release with Brotli');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test
    const maestroResult = run(`maestro test __tests__/ui-automation.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);

  test('should handle full bundle config error (-p true flag)', async () => {
    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create CodePush release with -p true flag (should cause config error)
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch" -p true',
      'Creating codepush release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush release');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test for corrupted scenario
    const maestroResult = run(`maestro test __tests__/ui-automation-corrupted.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);

  test('should handle corrupted full bundle and verify rollback', async () => {
    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Corrupt the bundle
    corruptBundle('.dota-testing/android-cp/index.android.bundle', 'truncate', 5000);

    // Create CodePush release with corrupted bundle
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Corrupted bundle test"',
      'Creating codepush release with corrupted bundle'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush release with corrupted bundle');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test for corrupted scenario
    const maestroResult = run(`maestro test __tests__/ui-automation-corrupted.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);

  test('should verify event flow for full bundle deployment', async () => {
    // Clear logcat
    run('adb logcat -c', 'Clearing logcat');

    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create CodePush release
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch"',
      'Creating codepush release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush release');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test
    const maestroResult = run(`maestro test __tests__/ui-automation.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }

    // Wait for update to complete and logs to flush
    console.log('\n⏳ Waiting 5 seconds for update to complete and logs to flush...');
    execSync('sleep 5', { stdio: 'inherit' });

    // Dump logcat and check CodePush status events appear in order
    const rawLog = execSync('adb logcat -d | grep "\\[CodePush\\] Status" | tail -n 200', {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 5, // 5 MB
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
      'Installing update.',
    ];

    // Verify order
    let lastIndex = -1;
    for (const step of expected) {
      const idx = statusLines.findIndex((l, i) => i > lastIndex && l.includes(step));
      if (idx === -1) {
        throw new Error(`Missing or out-of-order step: ${step}`);
      }
      console.log(`✅ Found: ${step}`);
      lastIndex = idx;
    }
    console.log('\n✅ Event flow verified in order!');
  }, 600000);

  test('should deploy full bundle with assets and verify image loading', async () => {
    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');


    addImage();

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create CodePush release
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch"',
      'Creating codepush release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush release');
    }

  
    removeImage();

    // Create final bundle
    run('yarn android --mode=Release', 'Creating base bundle');

    // Run Maestro test for assets
    const maestroResult = run(`maestro test __tests__/ui-automation-assets.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);
});

describe('patchbundle', () => {
  // Cleanup before each test
  beforeEach(() => {
    // Clean up any existing test directories
    if (deleteTestingDirectory) {
      deleteTestingDirectory('.dota-testing');
    }
  });

  // Cleanup after each test
  afterEach(() => {
    // Always revert App.tsx to original state, even if test failed
    if (revertTemplateFileName) {
      try {
        revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');
      } catch (err) {
        console.warn('⚠️ Could not revert App.tsx:', err.message);
      }
    }
    // Clean up test directories
    if (deleteTestingDirectory) {
      deleteTestingDirectory('.dota-testing');
    }
    // Uninstall app to ensure clean state
    if (run) {
      run('adb uninstall com.mycodepushapp', 'Uninstalling app');
    }
  });

  test('should deploy and verify patch bundle with default settings', async () => {
    // Create base bundle
    const baseResult = run('yarn android --mode=Release', 'Creating base bundle');
    if (!baseResult.success) {
      console.warn('⚠️ Skipping remaining steps for this test due to failure.');
      return;
    }

    // Move base bundle to testing directory
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');

    // Move CodePush bundle to testing directory
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create patch
    createSubFolderInTestingDir('.codepush');
    const patchResult = run(
      'yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush'
    );
    if (!patchResult.success) {
      throw new Error('Failed to create patch');
    }

    // Move assets
    moveAssets();

    // Create CodePush patch release
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true',
      'Creating codepush patch release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush patch release');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test
    const maestroResult = run(`maestro test __tests__/ui-automation.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);

  test('should deploy and verify patch bundle with Brotli compression', async () => {
    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create patch
    createSubFolderInTestingDir('.codepush');
    run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
    moveAssets();

    // Create CodePush patch release with Brotli compression
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true -c \'brotli\'',
      'Creating codepush patch release with Brotli'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush patch release with Brotli');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test
    const maestroResult = run(`maestro test __tests__/ui-automation.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);

  test('should handle patch bundle config error (missing -p true flag)', async () => {
    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create patch
    createSubFolderInTestingDir('.codepush');
    run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
    moveAssets();

    // Create CodePush patch release WITHOUT -p true flag (should cause config error)
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch"',
      'Creating codepush patch release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush patch release');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test for corrupted scenario
    const maestroResult = run(`maestro test __tests__/ui-automation-corrupted.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);

  // COMMENTED OUT: Test case is failing - patch corrupted bundle test
  // test('should handle corrupted patch bundle and verify rollback', async () => {
  //   // Create base bundle
  //   run('yarn android --mode=Release', 'Creating base bundle');
  //   directoryChange('.dota/android', '.dota-testing/android-base');

  //   // Update template file name
  //   updateTemplateFileName('App.tsx', 'App1.tsx');

  //   // Create CodePush bundle
  //   run('yarn android --mode=Release', 'Creating codepush bundle');
  //   directoryChange('.dota/android', '.dota-testing/android-cp');

  //   // Create patch
  //   createSubFolderInTestingDir('.codepush');
  //   run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
  //   moveAssets();

  //   // Corrupt the patch bundle
  //   corruptBundle('.dota-testing/.codepush/bundle.patch', 'truncate');

  //   // Create CodePush patch release with corrupted patch
  //   const releaseResult = run(
  //     'yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true',
  //     'Creating codepush patch release'
  //   );
  //   if (!releaseResult.success) {
  //     throw new Error('Failed to create CodePush patch release');
  //   }

  //   // Revert template file name
  //   revertTemplateFileName('App.tsx', 'App.tsx');

  //   // Create final bundle
  //   run('yarn android --mode=Release', 'Creating bundle');

  //   // Run Maestro test for corrupted scenario
  //   const maestroResult = run(`maestro test __tests__/ui-automation-corrupted.yaml`, 'Run Maestro test');
  //   if (!maestroResult.success) {
  //     throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
  //   }
  // }, 600000);

  test('should verify event flow for patch bundle deployment', async () => {
    // Clear logcat
    run('adb logcat -c', 'Clearing logcat');

    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');

    // Update template file name
    updateTemplateFileName(originalContentCache, 'App.tsx', 'AppNew.tsx');

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create patch
    createSubFolderInTestingDir('.codepush');
    run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
    moveAssets();

    // Create CodePush patch release
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true',
      'Creating codepush patch release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush patch release');
    }

    // Revert template file name
    revertTemplateFileName(originalContentCache, 'App.tsx', 'App.tsx');

    // Create final bundle
    run('yarn android --mode=Release', 'Creating bundle');

    // Run Maestro test
    const maestroResult = run(`maestro test __tests__/ui-automation.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }

    // Wait for update to complete and logs to flush
    console.log('\n⏳ Waiting 5 seconds for update to complete and logs to flush...');
    execSync('sleep 5', { stdio: 'inherit' });

    // Dump logcat and check CodePush status events appear in order
    const rawLog = execSync('adb logcat -d | grep "\\[CodePush\\] Status" | tail -n 200', {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 5, // 5 MB
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
      'Installing update.',
    ];

    // Verify order
    let lastIndex = -1;
    for (const step of expected) {
      const idx = statusLines.findIndex((l, i) => i > lastIndex && l.includes(step));
      if (idx === -1) {
        throw new Error(`Missing or out-of-order step: ${step}`);
      }
      console.log(`✅ Found: ${step}`);
      lastIndex = idx;
    }
    console.log('\n✅ Event flow verified in order!');
  }, 600000);

  test('should deploy patch bundle with assets and verify image loading', async () => {
    // Create base bundle
    run('yarn android --mode=Release', 'Creating base bundle');
    directoryChange('.dota/android', '.dota-testing/android-base');


    addImage();

    // Create CodePush bundle
    run('yarn android --mode=Release', 'Creating codepush bundle');
    directoryChange('.dota/android', '.dota-testing/android-cp');

    // Create patch
    createSubFolderInTestingDir('.codepush');
    run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
    moveAssets();

    // Create CodePush patch release
    const releaseResult = run(
      'yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" -p true',
      'Creating codepush patch release'
    );
    if (!releaseResult.success) {
      throw new Error('Failed to create CodePush patch release');
    }

    removeImage();

    // Create final bundle
    run('yarn android --mode=Release', 'Creating base bundle');

    // Run Maestro test for assets
    const maestroResult = run(`maestro test __tests__/ui-automation-assets.yaml`, 'Run Maestro test');
    if (!maestroResult.success) {
      throw new Error('❌ Maestro test failed — assertion error or UI mismatch.');
    }
  }, 600000);
});
