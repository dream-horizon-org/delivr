/**
 * PlatformCredentialsStep - Step 3: Configure App Store & Play Store credentials
 */

import React, { useState } from 'react';
import { WizardStep, FormField } from '../components';
import type { TargetPlatforms, AppStoreCredentials, PlayStoreCredentials } from '../types';

interface PlatformCredentialsStepProps {
  targets: TargetPlatforms;
  initialAppStore?: AppStoreCredentials;
  initialPlayStore?: PlayStoreCredentials;
  onAppStoreComplete?: (data: AppStoreCredentials) => void;
  onPlayStoreComplete?: (data: PlayStoreCredentials) => void;
}

export function PlatformCredentialsStep({
  targets,
  initialAppStore,
  initialPlayStore,
  onAppStoreComplete,
  onPlayStoreComplete,
}: PlatformCredentialsStepProps) {
  const [appStore, setAppStore] = useState<Partial<AppStoreCredentials>>(initialAppStore || {});
  const [playStore, setPlayStore] = useState<Partial<PlayStoreCredentials>>(initialPlayStore || {});
  const [isVerifyingAppStore, setIsVerifyingAppStore] = useState(false);
  const [isVerifyingPlayStore, setIsVerifyingPlayStore] = useState(false);
  const [appStoreError, setAppStoreError] = useState<string | null>(null);
  const [playStoreError, setPlayStoreError] = useState<string | null>(null);
  
  const verifyAppStore = async () => {
    if (!appStore.keyId || !appStore.issuerId || !appStore.privateKey) {
      setAppStoreError('All fields are required');
      return;
    }
    
    setIsVerifyingAppStore(true);
    setAppStoreError(null);
    
    try {
      const response = await fetch('/api/v1/setup/verify-appstore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appStore),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const verified = { ...appStore, isVerified: true } as AppStoreCredentials;
        setAppStore(verified);
        onAppStoreComplete?.(verified);
      } else {
        setAppStoreError(result.error || 'Verification failed');
      }
    } catch (err) {
      setAppStoreError('Failed to verify credentials');
    } finally {
      setIsVerifyingAppStore(false);
    }
  };
  
  const verifyPlayStore = async () => {
    if (!playStore.projectId || !playStore.serviceAccountEmail || !playStore.serviceAccountKey) {
      setPlayStoreError('All fields are required');
      return;
    }
    
    setIsVerifyingPlayStore(true);
    setPlayStoreError(null);
    
    try {
      const response = await fetch('/api/v1/setup/verify-playstore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playStore),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const verified = { ...playStore, isVerified: true } as PlayStoreCredentials;
        setPlayStore(verified);
        onPlayStoreComplete?.(verified);
      } else {
        setPlayStoreError(result.error || 'Verification failed');
      }
    } catch (err) {
      setPlayStoreError('Failed to verify credentials');
    } finally {
      setIsVerifyingPlayStore(false);
    }
  };
  
  return (
    <WizardStep
      title="Platform Credentials"
      description="Configure credentials for your selected deployment platforms"
      isRequired
    >
      <div className="space-y-8">
        {/* App Store Connect */}
        {targets.appStore && (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">App Store Connect</h3>
            </div>
            
            {appStoreError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{appStoreError}</p>
              </div>
            )}
            
            {appStore.isVerified ? (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Credentials Verified</h3>
                    <p className="mt-1 text-sm text-green-700">Key ID: {appStore.keyId}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FormField
                  label="Key ID"
                  name="appStoreKeyId"
                  value={appStore.keyId || ''}
                  onChange={(value) => setAppStore({ ...appStore, keyId: value })}
                  placeholder="ABC123XYZ"
                  required
                />
                
                <FormField
                  label="Issuer ID"
                  name="appStoreIssuerId"
                  value={appStore.issuerId || ''}
                  onChange={(value) => setAppStore({ ...appStore, issuerId: value })}
                  placeholder="abc-123-xyz-456-def"
                  required
                />
                
                <FormField
                  label="Private Key (.p8)"
                  name="appStorePrivateKey"
                  type="textarea"
                  value={appStore.privateKey || ''}
                  onChange={(value) => setAppStore({ ...appStore, privateKey: value })}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  required
                  rows={6}
                />
                
                <button
                  type="button"
                  onClick={verifyAppStore}
                  disabled={isVerifyingAppStore}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isVerifyingAppStore ? 'Verifying...' : 'Verify Credentials'}
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Google Play Store */}
        {targets.playStore && (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35z" />
                <path fill="#34A853" d="M16.81 15.12l-3.12-3.12 3.12-3.12 3.35 1.93c.61.36.98.99.98 1.69s-.37 1.33-.98 1.69l-3.35 1.93z" />
                <path fill="#FBBC04" d="M13.69 12L3.84 2.15C4.25 1.92 4.74 1.84 5.23 2.06l11.58 6.68L13.69 12z" />
                <path fill="#EA4335" d="M13.69 12l3.12 3.12-11.58 6.68c-.49.22-.98.14-1.39-.09L13.69 12z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Google Play Store</h3>
            </div>
            
            {playStoreError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{playStoreError}</p>
              </div>
            )}
            
            {playStore.isVerified ? (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Credentials Verified</h3>
                    <p className="mt-1 text-sm text-green-700">Project: {playStore.projectId}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FormField
                  label="Project ID"
                  name="playStoreProjectId"
                  value={playStore.projectId || ''}
                  onChange={(value) => setPlayStore({ ...playStore, projectId: value })}
                  placeholder="my-app-project-123"
                  required
                />
                
                <FormField
                  label="Service Account Email"
                  name="playStoreEmail"
                  type="email"
                  value={playStore.serviceAccountEmail || ''}
                  onChange={(value) => setPlayStore({ ...playStore, serviceAccountEmail: value })}
                  placeholder="deploy@my-app.iam.gserviceaccount.com"
                  required
                />
                
                <FormField
                  label="Service Account JSON Key"
                  name="playStoreKey"
                  type="textarea"
                  value={playStore.serviceAccountKey || ''}
                  onChange={(value) => setPlayStore({ ...playStore, serviceAccountKey: value })}
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                  required
                  rows={6}
                />
                
                <button
                  type="button"
                  onClick={verifyPlayStore}
                  disabled={isVerifyingPlayStore}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isVerifyingPlayStore ? 'Verifying...' : 'Verify Credentials'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </WizardStep>
  );
}

