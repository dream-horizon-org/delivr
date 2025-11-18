/**
 * Create Release Page
 * Multi-step wizard to create a new release with or without configuration
 */

import { json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { Container, Paper, Button, Group } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconRocket, IconSettings } from '@tabler/icons-react';
import { authenticateLoaderRequest, authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { getSetupData } from '~/.server/services/ReleaseManagement/setup';
import { createRelease } from '~/.server/services/ReleaseManagement';
import { loadConfigList, loadConfigById } from '~/utils/release-config-storage';
import { VerticalStepper, type Step } from '~/components/Common/VerticalStepper';
import { ConfigurationSelector } from '~/components/ReleaseCreation/ConfigurationSelector';
import { ReleaseDetailsForm } from '~/components/ReleaseCreation/ReleaseDetailsForm';
import { ReleaseCustomizationPanel } from '~/components/ReleaseCreation/ReleaseCustomizationPanel';
import { ManualConfigurationPanel } from '~/components/ReleaseCreation/ManualConfigurationPanel';
import { ReleaseReviewSummary } from '~/components/ReleaseCreation/ReleaseReviewSummary';
import type { ReleaseBasicDetails, ReleaseCustomizations } from '~/types/release-creation';
import type { ReleaseConfiguration } from '~/types/release-config';

const steps: Step[] = [
  {
    id: 'mode',
    title: 'Choose Mode',
    description: 'Config or Manual',
    icon: IconRocket as any,
  },
  {
    id: 'details',
    title: 'Release Details',
    description: 'Version & dates',
    icon: IconArrowRight as any,
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Settings & options',
    icon: IconSettings as any,
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Final check',
    icon: IconRocket as any,
  },
];

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Get setup data for validation
  const setupData = await getSetupData(org);
  
  // Load available configurations from local storage
  // TODO: Later fetch from server
  const configurations: any[] = []; // Mock for now
  
  return json({
    org,
    user,
    setupData,
    configurations,
  });
});

export const action = authenticateActionRequest({
  [ActionMethods.POST]: async ({ request, params, user }) => {
    const { org } = params;
    
    if (!org) {
      throw new Response('Organization not found', { status: 404 });
    }
    
    const formData = await request.formData();
    
    const releaseData = {
      tenantId: org,
      version: formData.get('version') as string,
      releaseType: formData.get('releaseType') as 'PLANNED' | 'HOTFIX' | 'MAJOR',
      baseVersion: formData.get('baseVersion') as string || undefined,
      plannedDate: formData.get('plannedDate') as string,
      description: formData.get('description') as string || undefined,
      platforms: {
        ios: formData.get('ios') === 'true',
        android: formData.get('android') === 'true',
        web: formData.get('web') === 'true',
      },
    };
    
    const release = await createRelease(releaseData as any);
    
    return redirect(`/dashboard/${org}/releases/${release.id}`);
  }
});

export default function CreateReleasePage() {
  const loaderData = useLoaderData<typeof loader>();
  const org = loaderData.org;
  const configurations = loaderData.configurations || [];
  const navigate = useNavigate();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Release creation state
  const [mode, setMode] = useState<'WITH_CONFIG' | 'MANUAL'>('WITH_CONFIG');
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
  const [selectedConfig, setSelectedConfig] = useState<ReleaseConfiguration | undefined>();
  const [details, setDetails] = useState<Partial<ReleaseBasicDetails>>({});
  const [customizations, setCustomizations] = useState<Partial<ReleaseCustomizations>>({});
  
  // Load configurations from local storage on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const configs = loadConfigList(org) as any[];
      const activeConfigs = configs.filter((c: any) => c.status === 'ACTIVE');
      const defaultConfig = activeConfigs.find((c: any) => c.isDefault);
      
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.id);
      }
    }
  }, [org]);
  
  // Load the full configuration when a config is selected
  useEffect(() => {
    if (selectedConfigId) {
      const config = loadConfigById(org, selectedConfigId);
      if (config) {
        setSelectedConfig(config);
      }
    } else {
      setSelectedConfig(undefined);
    }
  }, [org, selectedConfigId]);
  
  // Pre-populate details from selected config
  useEffect(() => {
    if (selectedConfig) {
      setDetails((prevDetails) => ({
        ...prevDetails,
        releaseType: selectedConfig.releaseType,
      }));
    }
  }, [selectedConfig]);
  
  const canProceedFromStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Mode selection
        return mode === 'MANUAL' || (mode === 'WITH_CONFIG' && !!selectedConfigId);
        
      case 1: // Release details
        return !!(
          details.version &&
          details.kickoffDate &&
          details.releaseDate
        );
        
      case 2: // Customization or Manual Configuration
        // For manual mode, require at least one platform
        if (mode === 'MANUAL') {
          const platforms = customizations.platforms;
          return !!(platforms && (platforms.web || platforms.playStore || platforms.appStore));
        }
        // For config mode, customization is optional
        return true;
        
      case 3: // Review
        return true;
        
      default:
        return false;
    }
  };
  
  const handleNext = () => {
    if (canProceedFromStep(currentStep)) {
      setCompletedSteps(new Set([...completedSteps, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmit = async () => {
    // TODO: Implement actual release creation with API call
    console.log('Creating release:', {
      mode,
      configId: selectedConfigId,
      details,
      customizations,
    });
    
    // For now, just navigate back
    navigate(`/dashboard/${org}/releases`);
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Mode selection
        return (
          <ConfigurationSelector
            configurations={configurations}
            selectedMode={mode}
            selectedConfigId={selectedConfigId}
            onModeChange={setMode}
            onConfigSelect={setSelectedConfigId}
          />
        );
        
      case 1: // Release details
        return (
          <ReleaseDetailsForm
            details={details}
            onChange={setDetails}
            prePopulated={mode === 'WITH_CONFIG'}
          />
        );
        
      case 2: // Customization or Configuration
        return mode === 'MANUAL' ? (
          <ManualConfigurationPanel
            customizations={customizations}
            onChange={setCustomizations}
          />
        ) : (
          <ReleaseCustomizationPanel
            config={selectedConfig}
            customizations={customizations}
            onChange={setCustomizations}
          />
        );
        
      case 3: // Review
        return (
          <ReleaseReviewSummary
            config={selectedConfig}
            details={details}
            customizations={customizations}
          />
        );
        
      default:
        return null;
    }
  };
  
  const isLastStep = currentStep === steps.length - 1;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container size="xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Vertical Stepper - Left Side */}
          <div className="col-span-3">
            <Paper shadow="sm" p="lg" radius="md" className="sticky top-8" style={{ minHeight: '500px' }}>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/${org}/releases`)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IconArrowLeft size={20} />
                </button>
                <div>
                  <div className="text-sm font-semibold text-gray-700">Create Release</div>
                  <div className="text-xs text-gray-500">Step-by-step wizard</div>
                </div>
              </div>
              
              <VerticalStepper
                steps={steps}
                currentStep={currentStep}
                completedSteps={completedSteps}
                allowNavigation={false}
              />
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>
            </Paper>
          </div>
          
          {/* Main Content - Right Side */}
          <div className="col-span-9">
            <Paper shadow="sm" p="xl" radius="md">
              <div className="min-h-[600px] mb-6 px-4">
                {renderStepContent()}
              </div>
              
              <div className="px-4 pt-4 border-t border-gray-200">
                <Group justify="apart">
                  <Button
                    variant="subtle"
                    leftSection={<IconArrowLeft size={18} />}
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                  >
                    Previous
                  </Button>
                  
                  {!isLastStep ? (
                    <Button
                      variant="filled"
                      rightSection={<IconArrowRight size={18} />}
                      onClick={handleNext}
                      disabled={!canProceedFromStep(currentStep)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      variant="filled"
                      leftSection={<IconRocket size={18} />}
                      onClick={handleSubmit}
                      disabled={!canProceedFromStep(currentStep)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Create Release
                    </Button>
                  )}
                </Group>
              </div>
            </Paper>
          </div>
        </div>
      </Container>
    </div>
  );
}

