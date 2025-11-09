/**
 * CICDSetupStep - Step 4: Configure CI/CD pipelines (optional, multiple allowed)
 */

import React, { useState } from 'react';
import { WizardStep, FormField } from '../components';
import { useCICDPipelines } from '../hooks';
import type { CICDPipeline } from '../types';

interface CICDSetupStepProps {
  initialPipelines?: CICDPipeline[];
  githubRepo?: { owner: string; repoName: string };
  onPipelinesChange: (pipelines: CICDPipeline[]) => void;
}

export function CICDSetupStep({ initialPipelines, githubRepo, onPipelinesChange }: CICDSetupStepProps) {
  const { pipelines, isVerifying, error, addPipeline, removePipeline } = useCICDPipelines({
    initialPipelines,
    onPipelinesChange,
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPipeline, setNewPipeline] = useState<Partial<CICDPipeline>>({
    type: 'GITHUB_ACTIONS',
    platform: 'IOS',
    environment: 'PRODUCTION',
  });
  
  const handleAddPipeline = async () => {
    if (!newPipeline.name || !newPipeline.type || !newPipeline.platform || !newPipeline.environment) {
      return;
    }
    
    const success = await addPipeline(newPipeline as Omit<CICDPipeline, 'id' | 'isVerified' | 'createdAt'>);
    
    if (success) {
      setShowAddForm(false);
      setNewPipeline({
        type: 'GITHUB_ACTIONS',
        platform: 'IOS',
        environment: 'PRODUCTION',
      });
    }
  };
  
  return (
    <WizardStep
      title="CI/CD Setup"
      description="Connect build pipelines (optional - you can add multiple)"
      isRequired={false}
      error={error}
    >
      <div className="space-y-6">
        {/* Existing Pipelines */}
        {pipelines.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Configured Pipelines</h3>
            {pipelines.map((pipeline) => (
              <div key={pipeline.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{pipeline.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        pipeline.type === 'GITHUB_ACTIONS' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {pipeline.type === 'GITHUB_ACTIONS' ? 'GitHub Actions' : 'Jenkins'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {pipeline.platform}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {pipeline.environment}
                      </span>
                    </div>
                    
                    {pipeline.type === 'GITHUB_ACTIONS' && (
                      <p className="mt-1 text-xs text-gray-500">Workflow: {pipeline.workflowPath}</p>
                    )}
                    {pipeline.type === 'JENKINS' && (
                      <p className="mt-1 text-xs text-gray-500">Job: {pipeline.jenkinsJob}</p>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removePipeline(pipeline.id)}
                    className="ml-4 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Add Pipeline Button */}
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Pipeline
          </button>
        )}
        
        {/* Add Pipeline Form */}
        {showAddForm && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Pipeline</h3>
            
            <div className="space-y-4">
              {/* Pipeline Name */}
              <FormField
                label="Pipeline Name"
                name="pipelineName"
                value={newPipeline.name || ''}
                onChange={(value) => setNewPipeline({ ...newPipeline, name: value })}
                placeholder="e.g., iOS Production Build"
                required
                helpText="Give this pipeline a descriptive name"
              />
              
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPipeline({ ...newPipeline, type: 'GITHUB_ACTIONS' })}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      newPipeline.type === 'GITHUB_ACTIONS'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">GitHub Actions</div>
                    <div className="text-xs text-gray-500 mt-1">Use workflow from your repo</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNewPipeline({ ...newPipeline, type: 'JENKINS' })}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      newPipeline.type === 'JENKINS'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">Jenkins</div>
                    <div className="text-xs text-gray-500 mt-1">Connect to Jenkins server</div>
                  </button>
                </div>
              </div>
              
              {/* Platform & Environment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform *</label>
                  <select
                    value={newPipeline.platform}
                    onChange={(e) => setNewPipeline({ ...newPipeline, platform: e.target.value as 'IOS' | 'ANDROID' })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="IOS">iOS</option>
                    <option value="ANDROID">Android</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Environment *</label>
                  <select
                    value={newPipeline.environment}
                    onChange={(e) => setNewPipeline({ ...newPipeline, environment: e.target.value as CICDPipeline['environment'] })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="STAGING">Staging</option>
                    <option value="PRODUCTION">Production</option>
                    <option value="AUTOMATION">Automation</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>
              
              {/* GitHub Actions specific */}
              {newPipeline.type === 'GITHUB_ACTIONS' && (
                <>
                  <FormField
                    label="Workflow Path"
                    name="workflowPath"
                    value={newPipeline.workflowPath || ''}
                    onChange={(value) => setNewPipeline({ ...newPipeline, workflowPath: value })}
                    placeholder=".github/workflows/ios-build.yml"
                    required
                    helpText="Path to the workflow file in your repository"
                  />
                  
                  <FormField
                    label="Branch"
                    name="branch"
                    value={newPipeline.branch || ''}
                    onChange={(value) => setNewPipeline({ ...newPipeline, branch: value })}
                    placeholder="main"
                    required
                  />
                </>
              )}
              
              {/* Jenkins specific */}
              {newPipeline.type === 'JENKINS' && (
                <>
                  <FormField
                    label="Jenkins URL"
                    name="jenkinsUrl"
                    type="url"
                    value={newPipeline.jenkinsUrl || ''}
                    onChange={(value) => setNewPipeline({ ...newPipeline, jenkinsUrl: value })}
                    placeholder="https://jenkins.example.com"
                    required
                  />
                  
                  <FormField
                    label="Jenkins Token"
                    name="jenkinsToken"
                    type="password"
                    value={newPipeline.jenkinsToken || ''}
                    onChange={(value) => setNewPipeline({ ...newPipeline, jenkinsToken: value })}
                    placeholder="••••••••"
                    required
                  />
                  
                  <FormField
                    label="Job Name"
                    name="jenkinsJob"
                    value={newPipeline.jenkinsJob || ''}
                    onChange={(value) => setNewPipeline({ ...newPipeline, jenkinsJob: value })}
                    placeholder="android-build-production"
                    required
                  />
                </>
              )}
              
              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleAddPipeline}
                  disabled={isVerifying}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Add Pipeline'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Info Box */}
        {pipelines.length === 0 && !showAddForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Optional:</strong> You can skip this step and add pipelines later from settings.
              Pipelines allow automated builds when you create releases.
            </p>
          </div>
        )}
      </div>
    </WizardStep>
  );
}

