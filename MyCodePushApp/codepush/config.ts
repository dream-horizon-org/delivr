import { CodePushConfig } from './withCodePush';
import codePush from '@d11/dota';

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

  if (env === 'staging') {
    return {
      ...commonConfig,
      serverUrl: 'https://dota-server-delivruat.delivr.live/',
    };
  }

  return {
    ...commonConfig,
    serverUrl: 'https://dota-server-delivruat.delivr.live/',
  };
};