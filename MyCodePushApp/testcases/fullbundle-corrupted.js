import { run, directoryChange, updateTemplateFileName, revertTemplateFileName, runMaestroTest, deleteTestingDirectory, corruptBundle } from '../automate.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Change to project root so all commands run from there
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.resolve(__dirname, '..'));

run('yarn install', 'Installing dependencies');
run('yarn android --mode=Release', 'Creating base bundle');
directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');


updateTemplateFileName('App.tsx', 'AppNew.tsx');
run('yarn android --mode=Release', 'Creating codepush bundle');
directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');

// Try different corruption types:
// 'truncate' - removes bytes from end (most realistic for incomplete download)
// 'overwrite' - overwrites middle section with zeros
// 'header' - corrupts the JavaScript header
// 'middle' - deletes bytes from middle
corruptBundle('.dota-testing/android-cp/index.android.bundle', 'truncate', 5000);


run('yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Corrupted bundle test"', 'Creating codepush release with corrupted bundle');

revertTemplateFileName('App.tsx', 'App.tsx');
run('yarn android --mode=Release', 'Creating bundle');


console.log('\n🎯 Running Maestro test - expecting rollback behavior...\n');
const yamlPath = path.resolve('./ui-automation-corrupted.yaml');
runMaestroTest(yamlPath);

// Cleanup
deleteTestingDirectory('.dota-testing');
run('adb uninstall com.mycodepushapp', 'Uninstalling app');

console.log('\n✅ Corrupted Bundle Test Complete!\n');