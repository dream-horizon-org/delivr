import { run, directoryChange, updateTemplateFileName, revertTemplateFileName, runMaestroTest, deleteTestingDirectory, addImage, removeImage } from '../automate.js';
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
addImage();
run('yarn android --mode=Release', 'Creating codepush bundle');
directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');

run(' yarn code-push-standalone release testOrg/testApp .dota-testing/android-cp 1.0.0 -d Production -r 100 --description "Testing new arch"', 'Creating codepush release');

revertTemplateFileName('App.tsx', 'App.tsx');
removeImage();  

run('yarn android --mode=Release', 'Creating base bundle');
const yamlPath = path.resolve('./ui-automation-assests.yaml');
runMaestroTest(yamlPath);



deleteTestingDirectory('.dota-testing');
run('adb uninstall com.mycodepushapp', 'Uninstalling app');
