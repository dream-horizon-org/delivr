import { CodePushConfig } from './withCodePush';
import codePush from '@d11/dota';
import { Platform } from 'react-native';

export const getCodePushConfig = (env: 'staging' | 'production'): CodePushConfig => {
  const commonConfig: CodePushConfig = {
    checkFrequency: codePush.CheckFrequency.ON_APP_START,
    installMode: codePush.InstallMode.IMMEDIATE,
    updateDialog: {
      title: 'Update available',
      optionalUpdateMessage: 'A new version of the app is available. Would you like to update?',
      optionalInstallButtonLabel: 'Install',
      optionalIgnoreButtonLabel: 'Later',
      mandatoryUpdateMessage: 'A new version of the app is available and must be installed.',
      mandatoryContinueButtonLabel: 'Install',
    },
  };

  // For Android emulator, use 10.0.2.2 instead of localhost to reach host machine
  // For iOS simulator, localhost works
  // The native config (strings.xml/Info.plist) should also be set, but JS config can override
  const serverUrl = 'http://localhost:1080/';

  if (env === 'staging') {
    return {
      ...commonConfig,
      serverUrl: serverUrl,
    };
  }

  return {
    ...commonConfig,
    serverUrl: serverUrl,
  };
};