/**
 * Release Management Setup Wizard Route
 * First-time setup for Release Management features
 */

import { json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { authenticateLoaderRequest, authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { getSetupStatus, getSetupData, saveSetupData } from '~/.server/services/ReleaseManagement/setup';
import type { SetupWizardData } from '~/components/ReleaseManagement/SetupWizard/types';

// Import components
import { useSetupWizard } from '~/components/ReleaseManagement/SetupWizard/hooks';
import { StepIndicator } from '~/components/ReleaseManagement/SetupWizard/components';
import {
  GitHubConnectionStep,
  TargetPlatformsStep,
  PlatformCredentialsStep,
  CICDSetupStep,
  SlackIntegrationStep,
} from '~/components/ReleaseManagement/SetupWizard/steps';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Get current setup status and data
  const setupStatus = await getSetupStatus(org);
  const setupData = await getSetupData(org);
  
  // If setup is complete, redirect to releases page
  if (setupStatus.isComplete) {
    return redirect(`/dashboard/${org}/releases`);
  }
  
  return json({
    org,
    user,
    setupStatus,
    setupData,
  });
});

export const action = authenticateActionRequest({
  [ActionMethods.POST]: async ({ request, params, user }) => {
    const { org } = params;
    
    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }
    
    const formData = await request.formData();
    const actionType = formData.get('_action');
    
    if (actionType === 'save') {
      const setupDataJson = formData.get('setupData') as string;
      const setupData = JSON.parse(setupDataJson) as SetupWizardData;
      
      // Save setup data
      await saveSetupData(org, setupData as any);
      
      // Check if setup is now complete
      const setupStatus = await getSetupStatus(org);
      
      if (setupStatus.isComplete) {
        return redirect(`/dashboard/${org}/releases`);
      }
      
      return json({ success: true });
    }
    
    return json({ success: false });
  }
});

export default function ReleaseSetupPage() {
  const data = useLoaderData<typeof loader>();
  const { org, setupData: initialData } = data as any;
  const navigate = useNavigate();
  
  const {
    currentStep,
    currentStepConfig,
    currentStepIndex,
    steps,
    wizardData,
    isSetupComplete,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    canGoToNextStep,
    canGoToPreviousStep,
    isLastStep,
    updateWizardData,
  } = useSetupWizard({
    initialData,
    onComplete: async (data) => {
      // Submit the completed setup
      const formData = new FormData();
      formData.append('_action', 'save');
      formData.append('setupData', JSON.stringify(data));
      
      const response = await fetch(`/dashboard/${org}/releases/setup`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        navigate(`/dashboard/${org}/releases`);
      }
    },
  });
  
  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'github':
        return (
          <GitHubConnectionStep
            initialData={wizardData.github}
            onComplete={(data) => {
              updateWizardData({ github: data });
              goToNextStep();
            }}
          />
        );
        
      case 'targets':
        return (
          <TargetPlatformsStep
            initialData={wizardData.targets}
            onComplete={(data) => {
              updateWizardData({ targets: data });
            }}
          />
        );
        
      case 'platform-credentials':
        return (
          <PlatformCredentialsStep
            targets={wizardData.targets!}
            initialAppStore={wizardData.appStoreConnect}
            initialPlayStore={wizardData.playStoreConnect}
            onAppStoreComplete={(data) => {
              updateWizardData({ appStoreConnect: data });
            }}
            onPlayStoreComplete={(data) => {
              updateWizardData({ playStoreConnect: data });
            }}
          />
        );
        
      case 'cicd':
        return (
          <CICDSetupStep
            initialPipelines={wizardData.cicdPipelines}
            githubRepo={wizardData.github as any}
            onPipelinesChange={(pipelines) => {
              updateWizardData({ cicdPipelines: pipelines });
            }}
          />
        );
        
      case 'slack':
        return (
          <SlackIntegrationStep
            initialData={wizardData.slack}
            onComplete={(data) => {
              updateWizardData({ slack: data });
            }}
          />
        );
        
      case 'review':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">Review & Complete</h2>
              <p className="mt-2 text-sm text-gray-600">
                Review your configuration before completing the setup
              </p>
            </div>
            
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6 space-y-6">
                {/* GitHub */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">GitHub Repository</h3>
                  <div className="bg-gray-50 rounded p-4">
                    <p className="text-sm"><strong>Repository:</strong> {wizardData.github?.repoUrl}</p>
                    <p className="text-sm"><strong>Owner:</strong> {wizardData.github?.owner}</p>
                    <p className="text-sm"><strong>Repo Name:</strong> {wizardData.github?.repoName}</p>
                  </div>
                </div>
                
                {/* Targets */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Target Platforms</h3>
                  <div className="bg-gray-50 rounded p-4">
                    {wizardData.targets?.appStore && <p className="text-sm">✓ App Store</p>}
                    {wizardData.targets?.playStore && <p className="text-sm">✓ Play Store</p>}
                  </div>
                </div>
                
                {/* CI/CD */}
                {wizardData.cicdPipelines && wizardData.cicdPipelines.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">CI/CD Pipelines</h3>
                    <div className="bg-gray-50 rounded p-4 space-y-2">
                      {wizardData.cicdPipelines.map(pipeline => (
                        <p key={pipeline.id} className="text-sm">
                          ✓ {pipeline.name} ({pipeline.type}, {pipeline.platform}, {pipeline.environment})
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Slack */}
                {wizardData.slack && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Slack Integration</h3>
                    <div className="bg-gray-50 rounded p-4 space-y-1">
                      {wizardData.slack.channels.map(channel => (
                        <p key={channel.id} className="text-sm">
                          ✓ #{channel.name} ({channel.purpose})
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Setup Complete Notice */}
                {isSetupComplete && (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          All required steps completed!
                        </h3>
                        <p className="mt-2 text-sm text-green-700">
                          Click "Complete Setup" to start using Release Management.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Release Management Setup</h1>
              <p className="mt-1 text-sm text-gray-500">
                Configure your release management workflow
              </p>
            </div>
            
            {/* Exit Button */}
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${org}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Exit Setup
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={(stepId) => {
              // Allow clicking on completed steps
              const step = steps.find(s => s.id === stepId);
              if (step?.isComplete) {
                goToStep(stepId);
              }
            }}
          />
        </div>
        
        {/* Current Step Content */}
        <div className="bg-white shadow rounded-lg p-6">
          {renderStep()}
          
          {/* Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={!canGoToPreviousStep}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <div className="text-sm text-gray-500">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
            
            {isLastStep && isSetupComplete ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Complete Setup
                <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!canGoToNextStep}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStepConfig?.canSkip && !currentStepConfig.isComplete ? 'Skip' : 'Next'}
                <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

