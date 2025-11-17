import { useNavigate } from "@remix-run/react";
import { OnboardingFlowHeader } from "./OnboardingFlowHeader";
import { OnboardingFlowNavigation } from "./OnboardingFlowNavigation";
import { StepIndicator } from '~/components/ReleaseManagement/SetupWizard/components';
import { useSetupWizard } from "../hooks/useSetupWizard";
import { GitHubConnectionStep, ReviewStep } from "../steps";
import { SlackConnectionStep } from "../steps/SlackConnectionStep";
import { SetupStepsInfo } from "~/.server/services/Codepush/types";
import { 
  INTEGRATION_TYPES, 
  COMMUNICATION_TYPES,
  VERIFICATION_STATUS 
} from "~/constants/integrations";


const OnboardingFlow = ({ setupStepsInfo, integrationsData, tenantId, hasAnyCompletedSteps, onSetupComplete, onSetupExit }: { setupStepsInfo:SetupStepsInfo, integrationsData: any, tenantId: string, hasAnyCompletedSteps?: boolean, onSetupComplete: () => void, onSetupExit: () => void }) => { 
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
        setupStepsInfo,
        integrations: integrationsData, // Pass integrations to enable/disable navigation
        onComplete: async () => onSetupComplete(),
    });

  console.log('canGoToNextStep', canGoToNextStep);
  
  // Extract SCM integration data for initialData
  const scmIntegration = integrationsData?.find((int: any) => int.type === INTEGRATION_TYPES.SCM);
  const scmInitialData = scmIntegration ? {
    scmType: scmIntegration.scmType || 'GITHUB',
    owner: scmIntegration.owner,
    repoName: scmIntegration.repo,
    token: '', // Don't send token back to client
    repoUrl: scmIntegration.repositoryUrl,
    isVerified: scmIntegration.verificationStatus === VERIFICATION_STATUS.VALID,
  } : undefined;

  // Extract Slack integration data for initialData
  const slackIntegration = integrationsData?.find(
    (int: any) => int.type === INTEGRATION_TYPES.COMMUNICATION && int.communicationType === COMMUNICATION_TYPES.SLACK
  );
  const slackInitialData = slackIntegration ? {
    botToken: '', // Don't send token back to client
    workspaceId: slackIntegration.workspaceId,
    workspaceName: slackIntegration.workspaceName,
    botUserId: slackIntegration.botUserId,
    selectedChannels: slackIntegration.slackChannels?.map((ch: any) => ch.id) || [],
    isVerified: slackIntegration.verificationStatus === VERIFICATION_STATUS.VALID || slackIntegration.hasValidToken,
  } : undefined;

  const renderStep = () => {
    switch (currentStep) {
      case 'scm':
        return <GitHubConnectionStep 
          initialData={scmInitialData}
          onComplete={(data) => {
            updateWizardData({ github: data });
            goToNextStep();
          }} 
          hasSCMIntegration={setupStepsInfo?.scmIntegration || false} 
        />
      case 'communication':
        return <SlackConnectionStep 
          tenantId={tenantId}
          initialData={slackInitialData}
          hasSlackIntegration={setupStepsInfo?.communication || false}
          onComplete={() => {
            // Integration already saved, just proceed
            goToNextStep();
          }} 
        />
      case 'review':
        return <ReviewStep 
          integrations={integrationsData}
          setupStepsInfo={setupStepsInfo}
        />
      default:
        return null;
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingFlowHeader onSetupExit={onSetupExit} />

      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Step Indicator */}
        <div className="mb-10">
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={(stepId) => {
              const step = steps.find(s => s.id === stepId);
              if (step?.isComplete) {
                goToStep(stepId);
              }
            }}
          />
        </div>
        
        {/* Current Step Content */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          {renderStep()}
          
          <OnboardingFlowNavigation 
            goToPreviousStep={goToPreviousStep}
            canGoToPreviousStep={canGoToPreviousStep}
            currentStepIndex={currentStepIndex}
            steps={steps}
            isLastStep={isLastStep}
            isSetupComplete={isSetupComplete}
            goToNextStep={goToNextStep}
            canGoToNextStep={canGoToNextStep}
            onSetupComplete={onSetupComplete}
            onSetupExit={onSetupExit}
            currentStepConfig={currentStepConfig}
          />
          
        </div>
      </div>
    </div>
  )
}

export default OnboardingFlow;