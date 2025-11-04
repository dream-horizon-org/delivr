#!/usr/bin/env node

/**
 * Quick test script to verify mock server setup and SDK connectivity
 * This script:
 * 1. Checks if mock server is running
 * 2. Verifies pre-configured test data
 * 3. Tests CLI login
 * 4. Verifies deployment key
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOCK_SERVER_URL = 'http://localhost:1080';
const TEST_USER_ID = 'test-user';
const TEST_TENANT = 'testOrg';
const TEST_APP = 'testApp';
const EXPECTED_DEPLOYMENT_KEY = 'deployment-key-1';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function runCommand(command, description, silent = false) {
  try {
    if (!silent) {
      info(`Running: ${description}`);
    }
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: __dirname
    });
    return { success: true, output: result };
  } catch (err) {
    return { 
      success: false, 
      error: err.message,
      output: err.stdout || err.stderr || ''
    };
  }
}

async function checkMockServerRunning() {
  log('\n📡 Checking if mock server is running...', 'blue');
  
  try {
    execSync(`curl -s ${MOCK_SERVER_URL}`, { stdio: 'pipe' });
    success('Mock server is responding');
    return true;
  } catch (err) {
    error('Mock server is not responding');
    warning(`Make sure Docker containers are running:`);
    log(`   cd ../../code-push-server/e2e-mocks`);
    log(`   docker-compose up -d`);
    return false;
  }
}

async function checkDockerContainers() {
  log('\n🐳 Checking Docker containers...', 'blue');
  
  try {
    const result = runCommand(
      'cd ../../code-push-server/e2e-mocks && docker-compose ps',
      'Checking Docker containers',
      true
    );
    
    if (result.success && result.output.includes('Up')) {
      success('Docker containers are running');
      return true;
    } else {
      error('Docker containers may not be running');
      return false;
    }
  } catch (err) {
    error('Could not check Docker containers');
    return false;
  }
}

async function verifyPreconfiguredData() {
  log('\n🔍 Verifying pre-configured test data...', 'blue');
  
  let allChecks = true;
  
  // Check account
  try {
    const result = runCommand(
      `curl -s -X GET "${MOCK_SERVER_URL}/account" -H "Authorization: Bearer ${TEST_USER_ID}"`,
      'Checking test account',
      true
    );
    
    if (result.success && result.output.includes('test-user')) {
      success(`Account '${TEST_USER_ID}' exists`);
    } else {
      error(`Account '${TEST_USER_ID}' not found`);
      allChecks = false;
    }
  } catch (err) {
    error('Could not verify account');
    allChecks = false;
  }
  
  // Check app with tenant
  try {
    const result = runCommand(
      `curl -s -X GET "${MOCK_SERVER_URL}/apps/${TEST_APP}" -H "Authorization: Bearer ${TEST_USER_ID}" -H "tenant: ${TEST_TENANT}"`,
      'Checking test app',
      true
    );
    
    if (result.success && result.output.includes(TEST_APP)) {
      success(`App '${TEST_APP}' exists in tenant '${TEST_TENANT}'`);
    } else {
      error(`App '${TEST_APP}' not found`);
      allChecks = false;
    }
  } catch (err) {
    error('Could not verify app');
    allChecks = false;
  }
  
  // Check deployment key
  try {
    const result = runCommand(
      `curl -s -X GET "${MOCK_SERVER_URL}/apps/${TEST_APP}/deployments/Production" -H "Authorization: Bearer ${TEST_USER_ID}" -H "tenant: ${TEST_TENANT}"`,
      'Checking deployment key',
      true
    );
    
    if (result.success && result.output.includes(EXPECTED_DEPLOYMENT_KEY)) {
      success(`Production deployment key '${EXPECTED_DEPLOYMENT_KEY}' exists`);
    } else {
      error(`Expected deployment key '${EXPECTED_DEPLOYMENT_KEY}' not found`);
      allChecks = false;
    }
  } catch (err) {
    error('Could not verify deployment key');
    allChecks = false;
  }
  
  return allChecks;
}

async function testCLILogin() {
  log('\n🔐 Testing CLI login...', 'blue');
  
  // Try to login - CLI login is optional for SDK tests
  const loginResult = runCommand(
    `yarn code-push-standalone login ${MOCK_SERVER_URL} --accessKey ${TEST_USER_ID}`,
    'Attempting CLI login (optional)',
    true
  );
  
  // Check if login succeeded or already logged in
  if (loginResult.success || loginResult.output.includes('already logged in')) {
    // Try to verify
    const verifyResult = runCommand(
      'yarn code-push-standalone whoami',
      'Verifying login',
      true
    );
    
    if (verifyResult.success) {
      const output = verifyResult.output || '';
      if (output.includes(MOCK_SERVER_URL) || output.includes('localhost:1080') || output.includes('1080')) {
        success('CLI login verified - using mock server');
        return true;
      }
    }
  }
  
  // CLI login is optional - SDK can work without it
  warning('CLI not configured for mock server (this is optional - SDK tests can still run)');
  warning('To configure: yarn code-push-standalone login http://localhost:1080 --accessKey test-user');
  return true; // Return true since this is optional
}

async function verifyAppConfiguration() {
  log('\n📱 Verifying app configuration...', 'blue');
  
  // Check Android strings.xml
  try {
    const fs = await import('fs');
    const stringsPath = path.join(__dirname, 'android/app/src/main/res/values/strings.xml');
    const stringsContent = fs.readFileSync(stringsPath, 'utf8');
    
    if (stringsContent.includes('deployment-key-1') && stringsContent.includes('10.0.2.2:1080')) {
      success('Android configuration is correct');
    } else {
      error('Android configuration may be incorrect');
      return false;
    }
  } catch (err) {
    warning('Could not verify Android configuration');
  }
  
  // Check iOS Info.plist
  try {
    const fs = await import('fs');
    const plistPath = path.join(__dirname, 'ios/MyCodePushApp/Info.plist');
    const plistContent = fs.readFileSync(plistPath, 'utf8');
    
    if (plistContent.includes('deployment-key-1') && plistContent.includes('localhost:1080')) {
      success('iOS configuration is correct');
    } else {
      error('iOS configuration may be incorrect');
      return false;
    }
  } catch (err) {
    warning('Could not verify iOS configuration');
  }
  
  return true;
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Mock Server SDK Test Verification                         ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const results = {
    mockServer: false,
    docker: false,
    testData: false,
    cliLogin: false,
    appConfig: false
  };
  
  // Step 1: Check Docker containers
  results.docker = await checkDockerContainers();
  
  // Step 2: Check if mock server is running
  results.mockServer = await checkMockServerRunning();
  
  if (!results.mockServer) {
    log('\n❌ Mock server is not running. Please start it first:', 'red');
    log('   cd ../../code-push-server/e2e-mocks', 'yellow');
    log('   docker-compose up --build -d', 'yellow');
    log('   sleep 5', 'yellow');
    log('   # Register expectations', 'yellow');
    log('   curl -X PUT "http://localhost:1080/mockserver/clear"', 'yellow');
    log('   for file in expectations/*.json; do', 'yellow');
    log('     curl -s -X PUT "http://localhost:1080/mockserver/expectation" \\', 'yellow');
    log('       -H "Content-Type: application/json" -d @"$file" > /dev/null', 'yellow');
    log('   done', 'yellow');
    process.exit(1);
  }
  
  // Step 3: Verify pre-configured data
  results.testData = await verifyPreconfiguredData();
  
  // Step 4: Test CLI login
  results.cliLogin = await testCLILogin();
  
  // Step 5: Verify app configuration
  results.appConfig = await verifyAppConfiguration();
  
  // Summary
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    Test Summary                                ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
  
  const allPassed = Object.values(results).every(r => r);
  
  Object.entries(results).forEach(([test, passed]) => {
    const testName = test
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    if (passed) {
      success(`${testName}: PASS`);
    } else {
      error(`${testName}: FAIL`);
    }
  });
  
  log('');
  
  if (allPassed) {
    success('🎉 All checks passed! You\'re ready to test the SDK.');
    log('\n📝 Next steps:', 'cyan');
    log('   1. Run a test: node testRunner.js fullbundle', 'yellow');
    log('   2. Or run individual test: node testcases/fullbundle.js', 'yellow');
    log('   3. List all tests: node testRunner.js --list', 'yellow');
  } else {
    error('Some checks failed. Please fix the issues above before running tests.');
    process.exit(1);
  }
}

main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

