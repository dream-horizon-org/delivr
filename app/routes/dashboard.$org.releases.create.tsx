/**
 * Create Release Page
 * Form to create a new release
 */

import { json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate, Form } from '@remix-run/react';
import { useState } from 'react';
import { authenticateLoaderRequest, authenticateActionRequest, ActionMethods } from '~/utils/authenticate';
import { getSetupData } from '~/.server/services/ReleaseManagement/setup';
import { createRelease } from '~/.server/services/ReleaseManagement';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // Get setup data for validation
  const setupData = await getSetupData(org);
  
  return json({
    org,
    user,
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
  const { org } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    ios: true,
    android: true,
    web: false,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/${org}/releases`)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Create New Release</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Form method="post" className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Version */}
          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700">
              Version *
            </label>
            <input
              type="text"
              id="version"
              name="version"
              required
              placeholder="e.g., 1.2.0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Version number for this release (e.g., 1.2.0, 2.0.0)
            </p>
          </div>

          {/* Release Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Release Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                <input
                  type="radio"
                  name="releaseType"
                  value="PLANNED"
                  defaultChecked
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">Planned</span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">Regular scheduled release</span>
                  </span>
                </span>
              </label>

              <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                <input
                  type="radio"
                  name="releaseType"
                  value="HOTFIX"
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">Hotfix</span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">Urgent bug fix</span>
                  </span>
                </span>
              </label>

              <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                <input
                  type="radio"
                  name="releaseType"
                  value="MAJOR"
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">Major</span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">Major version update</span>
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Base Version */}
          <div>
            <label htmlFor="baseVersion" className="block text-sm font-medium text-gray-700">
              Base Version
            </label>
            <input
              type="text"
              id="baseVersion"
              name="baseVersion"
              placeholder="e.g., 1.1.0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Version to branch from (optional)
            </p>
          </div>

          {/* Planned Date */}
          <div>
            <label htmlFor="plannedDate" className="block text-sm font-medium text-gray-700">
              Planned Release Date *
            </label>
            <input
              type="date"
              id="plannedDate"
              name="plannedDate"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Platforms *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="ios"
                  value="true"
                  checked={selectedPlatforms.ios}
                  onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, ios: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">iOS (App Store)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="android"
                  value="true"
                  checked={selectedPlatforms.android}
                  onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, android: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Android (Play Store)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="web"
                  value="true"
                  checked={selectedPlatforms.web}
                  onChange={(e) => setSelectedPlatforms({ ...selectedPlatforms, web: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Web</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="What's new in this release?"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${org}/releases`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Release
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

