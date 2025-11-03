import { run, directoryChange, updateTemplateFileName, revertTemplateFileName, runMaestroTest, deleteTestingDirectory, createSubFolderInTestingDir, moveAssets} from '../automate.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Change to project root so all commands run from there
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.resolve(__dirname, '..'));



run('yarn install', 'Installing dependencies');
//run('yarn code-push-standalone login https://dota-server-delivruat.delivr.live --accessKey=KbzvetDwWBkEG4rl6VBjESU4EC9b41U_kVo6zg  ', 'Logging in to codepush');

run('yarn android --mode=Release', 'Creating base bundle');
directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-base');
updateTemplateFileName('App.tsx', 'AppNew.tsx');
run('yarn android --mode=Release', 'Creating codepush bundle');
directoryChange('.dota-testing', '.dota/android', '.dota-testing/android-cp');

createSubFolderInTestingDir('.codepush');
run('yarn code-push-standalone create-patch .dota-testing/android-base/index.android.bundle .dota-testing/android-cp/index.android.bundle .dota-testing/.codepush');
moveAssets();
run('yarn code-push-standalone release testOrg/testApp .dota-testing/.codepush 1.0.0 -d Production -r 100 --description "Testing new arch" ', 'Creating codepush patch release');

revertTemplateFileName('App.tsx', 'App.tsx');
run('yarn android --mode=Release', 'Creating bundle');


const yamlPath = path.resolve('./ui-automation.yaml');
runMaestroTest(yamlPath);

deleteTestingDirectory('.dota-testing');
run('adb uninstall com.mycodepushapp', 'Uninstalling app');