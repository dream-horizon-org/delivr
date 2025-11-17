/**
 * ReviewStep - Final review before completing setup
 */

import { WizardStep } from '../components';
import type { Integration, SCMIntegration, CommunicationIntegration } from '~/.server/services/Codepush/types';
import { INTEGRATION_TYPES, COMMUNICATION_TYPES } from '~/constants/integrations';

interface ReviewStepProps {
  integrations: Integration[];
  setupStepsInfo: any;
}

export function ReviewStep({ integrations, setupStepsInfo }: ReviewStepProps) {
  const scmIntegration = integrations.find((int: any) => int.type === INTEGRATION_TYPES.SCM) as SCMIntegration | undefined;
  
  // Type for Slack integration with extended fields (from API response)
  type SlackIntegrationExtended = CommunicationIntegration & {
    workspaceId?: string;
    workspaceName?: string;
    botUserId?: string;
    slackChannels?: Array<{ id: string; name: string }>;
    verificationStatus?: string;
  };
  
  const slackIntegration = integrations.find(
    (int: any) => int.type === INTEGRATION_TYPES.COMMUNICATION && int.communicationType === COMMUNICATION_TYPES.SLACK
  ) as SlackIntegrationExtended | undefined;

  return (
    <WizardStep
      title="Review & Complete"
      description="Review your configuration before completing the setup"
      isRequired
      error={null}
    >
      <div className="space-y-6">
        {/* Success Banner */}
        {/* <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Setup Complete!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  You've successfully configured your release management workflow. Review the details below and click "Complete Setup" to get started.
                </p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Configuration Summary */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Summary</h3>

          {/* Source Control */}
          {scmIntegration && (
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                    <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">Source Control</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Type:</span> {scmIntegration.scmType}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Repository:</span>{' '}
                      {scmIntegration.owner}/{scmIntegration.repo}
                    </p>
                    {scmIntegration.repositoryUrl && (
                      <a
                        href={scmIntegration.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                      >
                        View Repository
                        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Connected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Communication */}
          {slackIntegration && (
            <div className="pb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-100">
                    <svg className="h-6 w-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">Communication</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Platform:</span> Slack
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Workspace:</span> {slackIntegration.workspaceName}
                    </p>
                    {slackIntegration.slackChannels && slackIntegration.slackChannels.length > 0 && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Channels:</span> {slackIntegration.slackChannels.length} configured
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Connected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Slack Integration */}
          {!slackIntegration && (
            <div className="pb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100">
                    <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">Communication</h4>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Slack integration not configured (optional)</p>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Skipped
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">What's Next?</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Create your first release</li>
                  <li>Configure release workflows and approvals</li>
                  <li>Set up automated release notifications</li>
                  <li>Invite team members to collaborate</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>
    </WizardStep>
  );
}

