/**
 * Release Management Setup - Onboarding Flow
 * Directly renders the onboarding flow for setup
 */

import { useNavigate, useRouteLoaderData } from '@remix-run/react';
import { useEffect, useCallback, useMemo } from 'react';
import type { OrgLayoutLoaderData } from './dashboard.$org';
import { Organization } from '~/.server/services/Codepush/types';
import { useConfig } from '~/contexts/ConfigContext';
import OnboardingFlow from '~/components/ReleaseManagement/SetupWizard/components/OnboardingFlow';

export default function SetupPage() {
  const navigate = useNavigate();
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const { tenantConfig } = useConfig();

  if (!orgData) {
    throw new Error('Organization data not loaded');
  }

  const { tenantId: projectId, organisation }: { tenantId: string; organisation: Organization } = orgData;
  
  // Redirect if setup is already complete
  useEffect(() => {
    if (organisation?.releaseManagement?.setupComplete) {
      navigate(`/dashboard/${projectId}/releases`, { replace: true });
    }
  }, [organisation?.releaseManagement?.setupComplete, projectId, navigate]);

  const setupSteps = organisation?.releaseManagement?.setupSteps || {
    scmIntegration: false,
    targetPlatforms: false,
    pipelines: false,
    communication: false,
  };

  // Check if any steps are completed (not first time)
  const hasAnyCompletedSteps =
    setupSteps.scmIntegration ||
    setupSteps.targetPlatforms ||
    setupSteps.pipelines ||
    setupSteps.communication;

  // Convert new config format to legacy Integration[] format for the setup wizard
  const integrations = useMemo(() => {
    if (!tenantConfig?.releaseManagement?.connectedIntegrations) return [];
    
    const legacyIntegrations: any[] = [];
    const config = tenantConfig.releaseManagement.connectedIntegrations;
    
    // Convert SOURCE_CONTROL integrations
    config.SOURCE_CONTROL.forEach(i => {
      legacyIntegrations.push({
        ...i,
        type: 'scm',
        provider: i.providerId,
        isActive: i.status === 'CONNECTED',
      });
    });
    
    // Convert COMMUNICATION integrations
    config.COMMUNICATION.forEach(i => {
      legacyIntegrations.push({
        ...i,
        type: 'communication',
        provider: i.providerId,
        isActive: i.status === 'CONNECTED',
      });
    });
    
    return legacyIntegrations;
  }, [tenantConfig]);

  const onSetupComplete = useCallback(() => {
    // Navigate to releases page
    // Setup completion is determined at runtime based on connected integrations
    navigate(`/dashboard/${projectId}/releases`, { replace: true });
  }, [projectId, navigate]);

  const onSetupExit = useCallback(() => {
    navigate(`/dashboard/${projectId}/releases`);
  }, [projectId, navigate]);

  return (
    <OnboardingFlow 
      setupStepsInfo={setupSteps} 
      integrationsData={integrations} 
      tenantId={projectId}
      hasAnyCompletedSteps={hasAnyCompletedSteps}
      onSetupComplete={onSetupComplete} 
      onSetupExit={onSetupExit} 
    />
  );
}
