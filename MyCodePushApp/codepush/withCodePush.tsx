import codePush, { CodePushOptions } from '@d11/dota';
import React from 'react';

export interface CodePushConfig extends CodePushOptions {
  serverUrl?: string;
}

export const withCodePush = (config: Partial<CodePushConfig> = {}) => {
  return (WrappedComponent: React.ComponentType<any>) => {
    const defaultConfig: CodePushConfig = {
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
      ...config,
    };

    codePush.sync({
      ...defaultConfig,
    }, (status) => {
      // Use only above mentioned statuses
      switch (status) {
        case codePush.SyncStatus.UP_TO_DATE:
          console.log('Codepush Event: Up to date');
          break;
        case codePush.SyncStatus.DOWNLOADING_PACKAGE:
          console.log('Codepush Event: Downloading package');
          break;
        case codePush.SyncStatus.INSTALLING_UPDATE:
          console.log('Codepush Event: Installing update');
          break;
        case codePush.SyncStatus.UPDATE_INSTALLED:
          console.log('Codepush Event: Update installed');
          break;
        case codePush.SyncStatus.UPDATE_IGNORED:
          console.log('Codepush Event: Update ignored');
          break;
        case codePush.SyncStatus.UNKNOWN_ERROR:
          console.log('Codepush Event: Unknown error');
            break;
        case codePush.SyncStatus.SYNC_IN_PROGRESS:
          console.log('Codepush Event: Sync in progress');
          break;
        case codePush.SyncStatus.CHECKING_FOR_UPDATE:
          console.log('Codepush Event: Checking for update');
          break;
        case codePush.SyncStatus.AWAITING_USER_ACTION:
          console.log('Codepush Event: Awaiting user action');
          break;
        case codePush.SyncStatus.PATCH_APPLIED_SUCCESS:
          console.log('Codepush Event: Patch applied success');
          break;
        case codePush.SyncStatus.DOWNLOAD_REQUEST_SUCCESS:
          console.log('Codepush Event: Download request success');
          break;
        case codePush.SyncStatus.UNZIPPED_SUCCESS:
          console.log('Codepush Event: Unzipped success');
          break;
        case codePush.SyncStatus.UPDATE_AVAILABLE:
          console.log('Codepush Event: Update available');
          break;
        case codePush.SyncStatus.UPDATE_IGNORED_ROLLBACK:
          console.log('Codepush Event: Update available ignored rollback');
          break;
        case codePush.SyncStatus.DECOMPRESSED_SUCCESS:
          console.log('Codepush Event: Decompressed success');
          break;
        default:
          console.log('Codepush Event: Unknown status', status);
          break;
      }
      }, (downloadProgress) => {
      console.log('Codepush Event: Download progress', downloadProgress);
    }).then((update) => {
      console.log('Codepush Event: Then Debugging', update);
    }).catch((error) => {
      console.log('Codepush Event: Catch debugging', error.message);
    });

    return codePush(defaultConfig)(WrappedComponent);
  };
};