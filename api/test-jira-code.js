/**
 * Jira Integration Code Validation Test
 * Tests that all Jira-related code can be imported and basic structure is correct
 */

console.log('='.repeat(60));
console.log('JIRA INTEGRATION CODE VALIDATION');
console.log('='.repeat(60));
console.log('');

let allTestsPassed = true;

// Test 1: Import Jira Controllers
console.log('✓ Test 1: Importing Jira Controllers...');
try {
  const jiraControllers = require('./bin/script/controllers/integrations/jira-controllers');
  const expectedFunctions = [
    'createOrUpdateJiraIntegration',
    'getJiraIntegration',
    'deleteJiraIntegration',
    'testJiraConnection',
    'createJiraConfiguration',
    'getJiraConfigurations',
    'getJiraConfigurationById',
    'updateJiraConfiguration',
    'deleteJiraConfiguration',
    'verifyJiraConfiguration',
    'createEpicsForRelease',
    'getEpicsForRelease',
    'getEpicById',
    'updateEpic',
    'deleteEpic',
    'checkEpicStatus'
  ];
  
  for (const fn of expectedFunctions) {
    if (typeof jiraControllers[fn] !== 'function') {
      console.error(`  ✗ Missing or invalid function: ${fn}`);
      allTestsPassed = false;
    }
  }
  
  if (allTestsPassed) {
    console.log(`  ✓ All ${expectedFunctions.length} controller functions found`);
  }
} catch (error) {
  console.error(`  ✗ Failed to import controllers: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Test 2: Import Jira Epic Service
console.log('✓ Test 2: Importing Jira Epic Service...');
try {
  const { JiraEpicService } = require('./bin/script/storage/integrations/jira/jira-epic-service');
  
  if (typeof JiraEpicService !== 'function') {
    console.error('  ✗ JiraEpicService is not a constructor');
    allTestsPassed = false;
  } else {
    console.log('  ✓ JiraEpicService class found');
  }
} catch (error) {
  console.error(`  ✗ Failed to import JiraEpicService: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Test 3: Import Jira Controllers (data layer)
console.log('✓ Test 3: Importing Jira Data Controllers...');
try {
  const jiraController = require('./bin/script/storage/integrations/jira/jira-controller');
  
  if (typeof jiraController.JiraIntegrationController !== 'function') {
    console.error('  ✗ JiraIntegrationController is not a constructor');
    allTestsPassed = false;
  } else {
    console.log('  ✓ JiraIntegrationController class found');
  }
  
  if (typeof jiraController.JiraConfigurationController !== 'function') {
    console.error('  ✗ JiraConfigurationController is not a constructor');
    allTestsPassed = false;
  } else {
    console.log('  ✓ JiraConfigurationController class found');
  }
} catch (error) {
  console.error(`  ✗ Failed to import data controllers: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Test 4: Import Jira Models
console.log('✓ Test 4: Importing Jira Models...');
try {
  const jiraModels = require('./bin/script/storage/integrations/jira/jira-integration-models');
  const expectedModels = [
    'createJiraIntegrationsModel',
    'createJiraConfigurationsModel',
    'createReleaseJiraEpicsModel'
  ];
  
  for (const model of expectedModels) {
    if (typeof jiraModels[model] !== 'function') {
      console.error(`  ✗ Missing or invalid model factory: ${model}`);
      allTestsPassed = false;
    }
  }
  
  if (allTestsPassed) {
    console.log(`  ✓ All ${expectedModels.length} model factories found`);
  }
} catch (error) {
  console.error(`  ✗ Failed to import models: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Test 5: Import Jira Types
console.log('✓ Test 5: Importing Jira Types...');
try {
  const jiraTypes = require('./bin/script/storage/integrations/jira/jira-types');
  
  const expectedEnums = ['JiraIntegrationType', 'JiraVerificationStatus', 'EpicCreationStatus', 'EpicPlatform'];
  for (const enumName of expectedEnums) {
    if (!jiraTypes[enumName]) {
      console.error(`  ✗ Missing enum: ${enumName}`);
      allTestsPassed = false;
    }
  }
  
  if (allTestsPassed) {
    console.log(`  ✓ All ${expectedEnums.length} type enums found`);
  }
} catch (error) {
  console.error(`  ✗ Failed to import types: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Test 6: Import Jira Routes
console.log('✓ Test 6: Importing Jira Routes...');
try {
  const jiraRoutes = require('./bin/script/routes/jira-integrations');
  
  if (typeof jiraRoutes.createJiraIntegrationRoutes !== 'function') {
    console.error('  ✗ createJiraIntegrationRoutes is not a function');
    allTestsPassed = false;
  } else {
    console.log('  ✓ createJiraIntegrationRoutes function found');
  }
} catch (error) {
  console.error(`  ✗ Failed to import routes: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Test 7: Check Database Migration
console.log('✓ Test 7: Checking Jira Migration File...');
try {
  const fs = require('fs');
  const migrationPath = '../migrations/004_jira_epic_management.sql';
  
  if (fs.existsSync(migrationPath)) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const requiredTables = ['jira_integrations', 'jira_configurations', 'release_jira_epics'];
    
    for (const table of requiredTables) {
      if (!migrationContent.includes(table)) {
        console.error(`  ✗ Migration missing table: ${table}`);
        allTestsPassed = false;
      }
    }
    
    if (allTestsPassed) {
      console.log(`  ✓ Migration file contains all ${requiredTables.length} required tables`);
    }
  } else {
    console.error('  ✗ Migration file not found');
    allTestsPassed = false;
  }
} catch (error) {
  console.error(`  ✗ Failed to check migration: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Summary
console.log('='.repeat(60));
if (allTestsPassed) {
  console.log('✅ ALL TESTS PASSED - Jira integration code is valid!');
  console.log('');
  console.log('All Jira-related code successfully compiled and imported:');
  console.log('  • Controllers (16 functions)');
  console.log('  • Services (JiraEpicService)');
  console.log('  • Data Layer (JiraIntegrationController, JiraConfigurationController)');
  console.log('  • Models (3 Sequelize models)');
  console.log('  • Types & Enums (4 enums)');
  console.log('  • Routes (createJiraIntegrationRoutes)');
  console.log('  • Database Migration (004_jira_epic_management.sql)');
  console.log('');
  console.log('✅ Ready for API testing once server is running!');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Please check errors above');
  process.exit(1);
}
console.log('='.repeat(60));

