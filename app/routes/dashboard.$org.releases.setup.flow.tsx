/**
 * Release Management Setup Wizard Route
 * First-time setup for Release Management features
 */

import { json, redirect } from '@remix-run/node';
import { useNavigate, useRouteLoaderData } from '@remix-run/react';
import { authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { CodepushService } from '~/.server/services/Codepush';
import type { SetupWizardData } from '~/components/ReleaseManagement/SetupWizard/types';
import type { OrgLayoutLoaderData } from './dashboard.$org';

// Import components
import { useSetupWizard } from '~/components/ReleaseManagement/SetupWizard/hooks';

import {
  GitHubConnectionStep,
  TargetPlatformsStep,
  PlatformCredentialsStep,
  CICDSetupStep,
  SlackIntegrationStep,
} from '~/components/ReleaseManagement/SetupWizard/steps';
import OnboardingFlow from '~/components/ReleaseManagement/SetupWizard/components/OnboardingFlow';
import { useCallback } from 'react';
import { Organization } from '~/.server/services/Codepush/types';

export const action = authenticateActionRequest({
  [ActionMethods.POST]: async ({ request, params, user }) => {
    const { org } = params;
    
    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }
    
    const formData = await request.formData();
    const actionType = formData.get('_action');
    
    if (actionType === 'save') {
      // Note: Setup data is saved via individual API calls (SCM integration, etc.)
      // This action just checks if setup is complete and redirects
      
      // Fetch latest tenant info to check completion
      const response = await CodepushService.getTenantInfo({ 
        tenantId: org,
        userId: user.user.id 
      });
      const organisation = response.data.organisation;
      
      if (organisation.releaseManagement?.setupComplete) {
        return redirect(`/dashboard/${org}/releases`);
      }
      
      return json({ success: true });
    }
    
    return json({ success: false });
  }
});

export default function ReleaseSetupFlowPage() {
  // Get shared tenant data from parent layout (no redundant API call!)
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const navigate = useNavigate();

  if (!orgData) {
    throw new Error('Organization data not loaded');
  }

  const { tenantId: projectId, organisation } : {tenantId: string, organisation: Organization}= orgData;
  const integrations = organisation?.releaseManagement?.integrations || [];
  const setupSteps = organisation?.releaseManagement?.setupSteps || {
    scmIntegration: false,
    targetPlatforms: false,
    pipelines: false,
    communication: false
  };

  // Check if any steps are completed (not first time)
  const hasAnyCompletedSteps = setupSteps.scmIntegration || 
                                setupSteps.targetPlatforms || 
                                setupSteps.pipelines || 
                                setupSteps.communication;

  const onSetupComplete = useCallback(async () => {
    // Optimistically navigate to releases page immediately
    navigate(`/dashboard/${projectId}/releases`, { replace: true });
    
    // Mark setup as complete in the background (fire and forget)
    try {
      await fetch(`/api/v1/tenants/${projectId}/release-management/complete-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setupComplete: true }),
      });
    } catch (error) {
      // Silently handle errors - user is already on the dashboard
      // The setup completion is determined by backend based on integrations anyway
      console.error('Failed to mark setup as complete:', error);
    }
  }, [projectId, navigate]);

  const onSetupExit = useCallback(() => {
    navigate(`/dashboard/${projectId}/releases/setup`);
  }, [projectId, navigate]);
  
  // Render current step
  // const renderStep = () => {
  //   switch (currentStep) {
  //     case 'github':
  //       return (

  //           <GitHubConnectionStep
  //             initialData={wizardData.github}
  //             onComplete={(data) => {
  //               updateWizardData({ github: data });
  //               goToNextStep();
  //             }}
  //             hasSCMIntegration={hasSCMIntegration || false}
  //           />

  //       );
        
  //     case 'targets':
  //       return (
  //         <TargetPlatformsStep
  //           initialData={wizardData.targets}
  //           onComplete={(data) => {
  //             updateWizardData({ targets: data });
  //           }}
  //         />
  //       );
        
  //     case 'platform-credentials':
  //       return (
  //         <PlatformCredentialsStep
  //           targets={wizardData.targets!}
  //           initialAppStore={wizardData.appStoreConnect}
  //           initialPlayStore={wizardData.playStoreConnect}
  //           onAppStoreComplete={(data) => {
  //             updateWizardData({ appStoreConnect: data });
  //           }}
  //           onPlayStoreComplete={(data) => {
  //             updateWizardData({ playStoreConnect: data });
  //           }}
  //         />
  //       );
        
  //     case 'cicd':
  //       return (
  //         <CICDSetupStep
  //           initialPipelines={wizardData.cicdPipelines}
  //           githubRepo={wizardData.github as any}
  //           onPipelinesChange={(pipelines) => {
  //             updateWizardData({ cicdPipelines: pipelines });
  //           }}
  //         />
  //       );
        
  //     case 'slack':
  //       return (
  //         <SlackIntegrationStep
  //           initialData={wizardData.slack}
  //           onComplete={(data) => {
  //             updateWizardData({ slack: data });
  //           }}
  //         />
  //       );
        
  //     case 'review':
  //       return (
  //         <div className="space-y-6">
  //           <div className="border-b border-gray-200 pb-4">
  //             <h2 className="text-2xl font-bold text-gray-900">Review & Complete</h2>
  //             <p className="mt-2 text-sm text-gray-600">
  //               Review your configuration before completing the setup
  //             </p>
  //           </div>
            
  //           <div className="bg-white shadow sm:rounded-lg">
  //             <div className="px-4 py-5 sm:p-6 space-y-6">
  //               {/* GitHub */}
  //               <div>
  //                 <h3 className="text-lg font-medium text-gray-900 mb-2">GitHub Repository</h3>
  //                 <div className="bg-gray-50 rounded p-4">
  //                   <p className="text-sm"><strong>Repository:</strong> {wizardData.github?.repoUrl}</p>
  //                   <p className="text-sm"><strong>Owner:</strong> {wizardData.github?.owner}</p>
  //                   <p className="text-sm"><strong>Repo Name:</strong> {wizardData.github?.repoName}</p>
  //                 </div>
  //               </div>
                
  //               {/* Targets */}
  //               <div>
  //                 <h3 className="text-lg font-medium text-gray-900 mb-2">Target Platforms</h3>
  //                 <div className="bg-gray-50 rounded p-4">
  //                   {wizardData.targets?.appStore && <p className="text-sm">✓ App Store</p>}
  //                   {wizardData.targets?.playStore && <p className="text-sm">✓ Play Store</p>}
  //                 </div>
  //               </div>
                
  //               {/* CI/CD */}
  //               {wizardData.cicdPipelines && wizardData.cicdPipelines.length > 0 && (
  //                 <div>
  //                   <h3 className="text-lg font-medium text-gray-900 mb-2">CI/CD Pipelines</h3>
  //                   <div className="bg-gray-50 rounded p-4 space-y-2">
  //                     {wizardData.cicdPipelines.map(pipeline => (
  //                       <p key={pipeline.id} className="text-sm">
  //                         ✓ {pipeline.name} ({pipeline.type}, {pipeline.platform}, {pipeline.environment})
  //                       </p>
  //                     ))}
  //                   </div>
  //                 </div>
  //               )}
                
  //               {/* Slack */}
  //               {wizardData.slack && (
  //                 <div>
  //                   <h3 className="text-lg font-medium text-gray-900 mb-2">Slack Integration</h3>
  //                   <div className="bg-gray-50 rounded p-4 space-y-1">
  //                     {wizardData.slack.channels.map(channel => (
  //                       <p key={channel.id} className="text-sm">
  //                         ✓ #{channel.name} ({channel.purpose})
  //                       </p>
  //                     ))}
  //                   </div>
  //                 </div>
  //               )}
                
  //               {/* Setup Complete Notice */}
  //               {isSetupComplete && (
  //                 <div className="rounded-md bg-green-50 p-4">
  //                   <div className="flex">
  //                     <div className="flex-shrink-0">
  //                       <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
  //                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  //                       </svg>
  //                     </div>
  //                     <div className="ml-3">
  //                       <h3 className="text-sm font-medium text-green-800">
  //                         All required steps completed!
  //                       </h3>
  //                       <p className="mt-2 text-sm text-green-700">
  //                         Click "Complete Setup" to start using Release Management.
  //                       </p>
  //                     </div>
  //                   </div>
  //                 </div>
  //               )}
  //             </div>
  //           </div>
  //         </div>
  //       );
        
  //     default:
  //       return null;
  //   }
  // };

  return (
    <OnboardingFlow 
      setupStepsInfo={setupSteps} 
      integrationsData={integrations} 
      tenantId={projectId}
      hasAnyCompletedSteps={hasAnyCompletedSteps}
      onSetupComplete={onSetupComplete} 
      onSetupExit={onSetupExit} 
    />
  )
  
}

