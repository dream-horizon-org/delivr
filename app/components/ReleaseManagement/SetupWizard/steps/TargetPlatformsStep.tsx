/**
 * TargetPlatformsStep - Step 2: Select target deployment platforms
 */

import React, { useState } from 'react';
import { WizardStep } from '../components';
import type { TargetPlatforms } from '~/types/setup-wizard';

interface TargetPlatformsStepProps {
  initialData?: TargetPlatforms;
  onComplete: (data: TargetPlatforms) => void;
}

export function TargetPlatformsStep({ initialData, onComplete }: TargetPlatformsStepProps) {
  const [targets, setTargets] = useState<TargetPlatforms>(
    initialData || { appStore: false, playStore: false }
  );
  
  const handleToggle = (platform: keyof TargetPlatforms) => {
    const newTargets = { ...targets, [platform]: !targets[platform] };
    setTargets(newTargets);
    
    // Auto-save on change
    if (newTargets.appStore || newTargets.playStore) {
      onComplete(newTargets);
    }
  };
  
  const hasSelection = targets.appStore || targets.playStore;
  
  return (
    <WizardStep
      title="Select Target Platforms"
      description="Choose which platforms you want to deploy your releases to"
      isRequired
      error={!hasSelection ? 'Please select at least one platform' : null}
    >
      <div className="space-y-4">
        {/* App Store */}
        <div
          onClick={() => handleToggle('appStore')}
          className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
            targets.appStore
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={targets.appStore}
                onChange={() => handleToggle('appStore')}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center space-x-3">
                {/* Apple Logo */}
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <label className="text-lg font-medium text-gray-900">
                    Apple App Store
                  </label>
                  <p className="text-sm text-gray-500">Deploy iOS apps to the App Store</p>
                </div>
              </div>
              
              {targets.appStore && (
                <div className="mt-3 text-sm text-blue-700 bg-blue-100 rounded p-3">
                  <p className="font-medium">Required in next step:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>App Store Connect API Key ID</li>
                    <li>Issuer ID</li>
                    <li>Private Key (.p8 file)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Google Play Store */}
        <div
          onClick={() => handleToggle('playStore')}
          className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
            targets.playStore
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={targets.playStore}
                onChange={() => handleToggle('playStore')}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center space-x-3">
                {/* Google Play Logo */}
                <svg className="h-8 w-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35z" />
                  <path fill="#34A853" d="M16.81 15.12l-3.12-3.12 3.12-3.12 3.35 1.93c.61.36.98.99.98 1.69s-.37 1.33-.98 1.69l-3.35 1.93z" />
                  <path fill="#FBBC04" d="M13.69 12L3.84 2.15C4.25 1.92 4.74 1.84 5.23 2.06l11.58 6.68L13.69 12z" />
                  <path fill="#EA4335" d="M13.69 12l3.12 3.12-11.58 6.68c-.49.22-.98.14-1.39-.09L13.69 12z" />
                </svg>
                <div>
                  <label className="text-lg font-medium text-gray-900">
                    Google Play Store
                  </label>
                  <p className="text-sm text-gray-500">Deploy Android apps to the Play Store</p>
                </div>
              </div>
              
              {targets.playStore && (
                <div className="mt-3 text-sm text-blue-700 bg-blue-100 rounded p-3">
                  <p className="font-medium">Required in next step:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Google Cloud Project ID</li>
                    <li>Service Account Email</li>
                    <li>Service Account JSON Key</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Summary */}
        {hasSelection && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Platforms Selected</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    You'll be able to deploy to: {' '}
                    {[
                      targets.appStore && 'App Store',
                      targets.playStore && 'Play Store',
                    ].filter(Boolean).join(' and ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </WizardStep>
  );
}

