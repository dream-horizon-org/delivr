import { run, directoryChange, updateTemplateFileName, revertTemplateFileName, runMaestroTest, deleteTestingDirectory } from '../automate.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process'; 
// Change to project root so all commands run from there
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.resolve(__dirname, '..'));

//Clear logcat so we only capture this test's logs
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

// Run Maestro test to trigger the update flow
const yamlPath = path.resolve('./ui-automation.yaml');
runMaestroTest(yamlPath);

// Wait a bit for the update to complete and logs to flush
console.log('\n⏳ Waiting 5 seconds for update to complete and logs to flush...');
execSync('sleep 5', { stdio: 'inherit' });

// Dump logcat and check CodePush status events appear in order
const rawLog = execSync('adb logcat -d', { encoding: 'utf8' });
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