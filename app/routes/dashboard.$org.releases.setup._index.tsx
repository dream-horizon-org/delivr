/**
 * Release Management Setup - Landing Page
 * Shows "Start Setup" or "Continue Setup" before entering the onboarding flow
 */

import { useNavigate, useRouteLoaderData } from '@remix-run/react';
import type { OrgLayoutLoaderData } from '../dashboard.$org';
import { Organization } from '~/.server/services/Codepush/types';
import { useEffect } from 'react';

export default function SetupLandingPage() {
  const navigate = useNavigate();
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');

  if (!orgData) {
    throw new Error('Organization data not loaded');
  }

  const { tenantId: projectId, organisation }: { tenantId: string; organisation: Organization } = orgData;
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

  // Redirect if setup is already complete
  useEffect(() => {
    if (organisation?.releaseManagement?.setupComplete) {
      navigate(`/dashboard/${projectId}/releases`, { replace: true });
    }
  }, [organisation?.releaseManagement?.setupComplete, projectId, navigate]);

  const handleStartSetup = () => {
    navigate(`/dashboard/${projectId}/releases/setup/flow`);
  };

  const handleExitSetup = () => {
    navigate(`/dashboard/${projectId}`);
  };

  // Calculate progress
  const completedSteps = [
    setupSteps.scmIntegration,
    setupSteps.communication,
  ].filter(Boolean).length;
  const totalRequiredSteps = 1; // Only SCM is required
  const totalOptionalSteps = 1; // Communication is optional
  const progressPercentage = Math.round((completedSteps / (totalRequiredSteps + totalOptionalSteps)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Release Management Setup</h1>
                <p className="text-sm text-gray-500">Configure your release workflow</p>
              </div>
            </div>
            <button
              onClick={handleExitSetup}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Exit Setup
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {hasAnyCompletedSteps ? (
            // Continue Setup View
            <div>
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back!</h2>
                <p className="text-blue-100 text-lg">
                  You've made great progress on your setup. Let's finish configuring your release workflow.
                </p>
              </div>

              {/* Progress Section */}
              <div className="px-8 py-8">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                    <span className="text-sm font-semibold text-blue-600">{progressPercentage}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Completed Steps */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900">Completed Steps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {setupSteps.scmIntegration && (
                      <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Source Control Connected</p>
                          <p className="text-xs text-green-700">GitHub repository linked</p>
                        </div>
                      </div>
                    )}

                    {setupSteps.communication && (
                      <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Communication Setup</p>
                          <p className="text-xs text-green-700">Slack integration configured</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remaining Steps */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900">Remaining Steps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!setupSteps.scmIntegration && (
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">1</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Connect Source Control</p>
                          <p className="text-xs text-gray-600">Link your GitHub repository</p>
                        </div>
                      </div>
                    )}

                    {!setupSteps.communication && (
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">2</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Communication Channels</p>
                          <p className="text-xs text-gray-600">Optional: Set up Slack notifications</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleStartSetup}
                  className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Continue Setup
                  <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            // Start Setup View (First Time)
            <div>
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-4xl font-bold text-white mb-3">Welcome to Release Management</h2>
                <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                  Let's get you set up in just a few steps. Connect your tools and start managing releases like a pro.
                </p>
              </div>

              {/* Features Section */}
              <div className="px-8 py-10">
                <div className="mb-10">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">What You'll Set Up</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* SCM */}
                    <div className="flex items-start space-x-4 p-6 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">Source Control</h4>
                        <p className="text-sm text-gray-600">Connect your GitHub repository to track releases</p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Required
                        </span>
                      </div>
                    </div>

                    {/* Communication */}
                    <div className="flex items-start space-x-4 p-6 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-600">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">Communication</h4>
                        <p className="text-sm text-gray-600">Set up Slack for release notifications</p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                          Optional
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">What You'll Get</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">Automated release tracking from your repository</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">Real-time notifications for your team</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">Comprehensive release analytics and insights</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">Streamlined release workflows and approvals</span>
                    </li>
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleStartSetup}
                  className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Start Setup
                  <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">Setup takes about 5 minutes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

