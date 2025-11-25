/**
 * Response type for listing build artifacts
 */
export type BuildListItem = {
  id: string;
  artifactPath: string | null;
  downloadUrl: string | null;
  artifactVersionName: string;
  artifactVersionCode: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS';
  storeType: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE';
  regressionId: string | null;
  ciRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
};


