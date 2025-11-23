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
// Config loading moved to API - no longer using local storage
import { VerticalStepper, type Step } from '~/components/Common/VerticalStepper/VerticalStepper';
import { ConfigurationSelector } from '~/components/ReleaseCreation/ConfigurationSelector';
import { ReleaseDetailsForm } from '~/components/ReleaseCreation/ReleaseDetailsForm';
import { ReleaseSchedulingPanel } from '~/components/ReleaseCreation/ReleaseSchedulingPanel';
import { ReleaseConfigurePanel } from '~/components/ReleaseCreation/ReleaseConfigurePanel';
import { ReleaseReviewSummary } from '~/components/ReleaseCreation/ReleaseReviewSummary';
import type { ReleaseBasicDetails, ReleaseCustomizations } from '~/types/release-creation';
import type { ReleaseConfiguration } from '~/types/release-config';

const steps: Step[] = [
  {
    id: 'config',
    title: 'Select Configuration',
    description: 'Choose template',
    icon: IconSettings as any,
  },
  {
    id: 'details',
    title: 'Release Details',
    description: 'Version, type & targets',
    icon: IconRocket as any,
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    description: 'Timeline & slots',
    icon: IconArrowRight as any,
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Optional settings',
    icon: IconSettings as any,
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Final check',
    icon: IconRocket as any,
  },
];

export const loader = authenticateLoaderRequest(async ({ params, user, request }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Get setup data for validation
  const setupData = await getSetupData(org);
  
  // Fetch active configurations from API
  let configurations: any[] = [];
  try {
    const url = new URL(request.url);
    const apiUrl = `${url.protocol}//${url.host}/api/v1/tenants/${org}/release-config?status=ACTIVE`;
    
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      configurations = data.configurations || [];
      console.log(`[CreateRelease] Loaded ${configurations.length} active configurations`);
    }
  } catch (error) {
    console.error('[CreateRelease] Failed to load configurations:', error);
    // Continue with empty array if API fails
  }
  
  // Check if returnTo query param exists (user came back from config creation)
  const returnTo = new URL(request.url).searchParams.get('returnTo');
  
  return json({
    org,
    user,
    setupData,
    configurations,
    hasConfigurations: configurations.length > 0,
    returnTo,
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
  const org = (loaderData as any).org;
  const configurations = (loaderData as any).configurations || [];
  const hasConfigurations = (loaderData as any).hasConfigurations;
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Release creation state - always WITH_CONFIG now
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
  const [selectedConfig, setSelectedConfig] = useState<ReleaseConfiguration | undefined>();
  const [details, setDetails] = useState<Partial<ReleaseBasicDetails>>({
    releaseTargets: { web: false, playStore: false, appStore: false },
    hasRegressionBuilds: false,
    regressionBuildSlots: [],
  });
  const [customizations, setCustomizations] = useState<Partial<ReleaseCustomizations>>({
    enablePreRegressionBuilds: true,
    enableCheckmate: true,
  });
  
  // Select default configuration on load
  useEffect(() => {
    if (configurations.length > 0) {
      const defaultConfig = configurations.find((c: any) => c.isDefault && c.status === 'ACTIVE');
      if (defaultConfig && !selectedConfigId) {
        setSelectedConfigId(defaultConfig.id);
      }
    }
  }, [configurations, selectedConfigId]);
  
  // Load the full configuration when a config is selected
  useEffect(() => {
    if (selectedConfigId) {
      const config = configurations.find((c: any) => c.id === selectedConfigId);
      if (config) {
        setSelectedConfig(config);
      }
    } else {
      setSelectedConfig(undefined);
    }
  }, [selectedConfigId, configurations]);
  
  // Pre-populate details from selected config
  useEffect(() => {
    if (selectedConfig) {
      // Map config release type to form release type (EMERGENCY -> HOTFIX for now)
      const mappedReleaseType = selectedConfig.releaseType === 'EMERGENCY' 
        ? 'HOTFIX' as const
        : selectedConfig.releaseType as 'PLANNED' | 'HOTFIX' | 'PATCH';
      
      setDetails((prevDetails) => ({
        ...prevDetails,
        releaseType: mappedReleaseType,
      }));
    }
  }, [selectedConfig]);
  
  // Handler to create new configuration
  const handleCreateNewConfig = () => {
    // Redirect to config creation with returnTo parameter
    navigate(`/dashboard/${org}/releases/configure?returnTo=create`);
  };
  
  // Handler to clone and edit configuration
  const handleCloneConfig = (configId: string) => {
    // Redirect to config creation with clone parameter
    navigate(`/dashboard/${org}/releases/configure?clone=${configId}&returnTo=create`);
  };
  
  const validateStep = (stepIndex: number): { valid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};
    
    switch (stepIndex) {
      case 0: // Configuration selection
        if (!selectedConfigId) {
          newErrors.config = 'Please select a configuration';
        }
        break;
        
      case 1: // Release details
        if (!details.version) {
          newErrors.version = 'Version is required';
        } else if (!/^v?\d+\.\d+\.\d+$/.test(details.version)) {
          newErrors.version = 'Version must be in format: v1.2.3';
        }
        
        if (!details.releaseType) {
          console.log('details.releaseType', details.releaseType);
          newErrors.releaseType = 'Release type is required';
        }
        
        if (!details.baseBranch) {
          newErrors.baseBranch = 'Base branch is required';
        }
        
        // Check if at least one target is selected
        const hasTarget = details.releaseTargets?.web || 
                          details.releaseTargets?.playStore || 
                          details.releaseTargets?.appStore;
        if (!hasTarget) {
          newErrors.releaseTargets = 'At least one release target must be selected';
        }
        break;
        
      case 2: // Scheduling
        if (!details.releaseDate) {
          newErrors.releaseDate = 'Release date is required';
        } else {
          const rd = new Date(details.releaseDate);
          if (rd < new Date()) {
            newErrors.releaseDate = 'Release date must be in the future';
          }
        }
        
        if (!details.kickoffDate) {
          newErrors.kickoffDate = 'Kickoff date is required';
        } else if (details.releaseDate) {
          const kd = new Date(details.kickoffDate);
          const rd = new Date(details.releaseDate);
          if (kd >= rd) {
            newErrors.kickoffDate = 'Kickoff date must be before release date';
          }
        }
        
        // Validate regression slots if enabled
        if (details.hasRegressionBuilds && (!details.regressionBuildSlots || details.regressionBuildSlots.length === 0)) {
          newErrors.regressionSlots = 'At least one regression slot is required when regression builds are enabled';
        }
        break;
        
      case 3: // Configure
        // Optional step, no validation needed
        break;
        
      case 4: // Review
        // Final validation before submit
        break;
    }
    
    return { valid: Object.keys(newErrors).length === 0, errors: newErrors };
  };
  
  const canProceedFromStep = (stepIndex: number): boolean => {
    const validation = validateStep(stepIndex);
    return validation.valid;
  };
  
  const handleNext = () => {
    const validation = validateStep(currentStep);
    
    if (validation.valid) {
      setErrors({});
      setCompletedSteps(new Set([...completedSteps, currentStep]));
      setCurrentStep(currentStep + 1);
    } else {
      setErrors(validation.errors);
      // Show first error
      const firstError = Object.values(validation.errors)[0];
      if (firstError) {
        alert(firstError);
      }
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmit = async () => {
    // Final validation
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      setErrors(validation.errors);
      alert('Please fix validation errors before submitting');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare complete release data
      const releaseData = {
        tenantId: org,
        configId: selectedConfigId, // Configuration ID (or null for manual)
        
        // Basic details
        basicDetails: {
          version: details.version!,
          releaseType: details.releaseType!,
          baseBranch: details.baseBranch!,
          
          releaseDate: details.releaseDate!,
          releaseTime: details.releaseTime,
          
          kickoffDate: details.kickoffDate!,
          kickoffTime: details.kickoffTime,
          
          hasRegressionBuilds: details.hasRegressionBuilds,
          regressionBuildSlots: details.regressionBuildSlots || [],
          
          releaseTargets: details.releaseTargets!,
          
          description: details.description,
        },
        
        // Customizations (2 toggles)
        customizations: {
          enablePreRegressionBuilds: customizations.enablePreRegressionBuilds ?? true,
          enableCheckmate: customizations.enableCheckmate ?? true,
        },
      };
      
      console.log('[CreateRelease] Submitting release:', releaseData);
      
      // Submit to API
      const response = await fetch(`/api/v1/tenants/${org}/releases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(releaseData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create release');
      }
      
      const result = await response.json();
      console.log('[CreateRelease] Release created:', result);
      
      // Navigate to the release detail page
      if (result.releaseId) {
        navigate(`/dashboard/${org}/releases/${result.releaseId}`);
      } else {
        navigate(`/dashboard/${org}/releases`);
      }
    } catch (error) {
      console.error('[CreateRelease] Failed to create release:', error);
      alert(`Failed to create release: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Configuration selection
        return (
          <ConfigurationSelector
            configurations={configurations}
            selectedMode={'WITH_CONFIG'}
            selectedConfigId={selectedConfigId}
            onModeChange={() => {}} // No-op since mode is fixed
            onConfigSelect={setSelectedConfigId}
            onCreateNew={handleCreateNewConfig}
            onClone={handleCloneConfig}
          />
        );
        
      case 1: // Release details (version, type, targets, branch)
        return (
          <ReleaseDetailsForm
            details={details}
            onChange={setDetails}
            config={selectedConfig}
            latestVersion="v1.0.0" // TODO: Fetch from API
            tenantId={org}
            errors={errors}
          />
        );
        
      case 2: // Scheduling (dates, times, regression slots)
        return (
          <ReleaseSchedulingPanel
            releaseDate={details.releaseDate || ''}
            releaseTime={details.releaseTime}
            kickoffDate={details.kickoffDate || ''}
            kickoffTime={details.kickoffTime}
            hasRegressionBuilds={details.hasRegressionBuilds || false}
            regressionBuildSlots={details.regressionBuildSlots}
            config={selectedConfig}
            onChange={(schedulingData) => setDetails({ ...details, ...schedulingData })}
            errors={errors}
          />
        );
        
      case 3: // Configure (2 toggles)
        return (
          <ReleaseConfigurePanel
            config={selectedConfig}
            customizations={customizations}
            onChange={setCustomizations}
          />
        );
        
      case 4: // Review
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
  
  // If no configurations exist, show banner to create one
  if (!hasConfigurations) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <Container size="lg">
          <Paper shadow="sm" p="xl" radius="md">
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/${org}/releases`)}
                className="text-gray-400 hover:text-gray-600"
              >
                <IconArrowLeft size={20} />
              </button>
              <div>
                <div className="text-lg font-semibold text-gray-700">Create Release</div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <IconSettings className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-medium text-yellow-800">
                    No Release Configuration Found
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      You need to create a release configuration before you can create releases. 
                      Release configurations define the platforms, pipelines, testing phases, and approval workflows for your releases.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button
                      leftSection={<IconSettings size={18} />}
                      onClick={handleCreateNewConfig}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Create Release Configuration
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Paper>
        </Container>
      </div>
    );
  }
  
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

