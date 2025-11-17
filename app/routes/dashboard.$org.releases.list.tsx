/**
 * Release Management - Main Releases Page
 * Shows list of releases with guard to check setup completion
 */

import { json, redirect } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { useState, useMemo } from 'react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { getSetupStatus } from '~/.server/services/ReleaseManagement/setup';
import { getReleases } from '~/.server/services/ReleaseManagement';
import type { Release } from '~/.server/services/ReleaseManagement/integrations/types';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // **ROUTE GUARD**: Check if setup is complete
  const setupStatus = await getSetupStatus(org);
  
  if (!setupStatus.isComplete) {
    // Redirect to setup wizard
    return redirect(`/dashboard/${org}/releases/setup`);
  }
  
  // Fetch releases
  const releasesResponse = await getReleases(org);
  
  return json({
    org,
    user,
    releases: releasesResponse.releases,
    total: releasesResponse.total,
    setupStatus,
  });
});

type TabType = 'upcoming' | 'active' | 'completed';

// Helper function to categorize releases
function categorizeRelease(release: any): TabType {
  const status = release.status;
  
  // Completed: Released or Cancelled
  if (status === 'RELEASED' || status === 'CANCELLED') {
    return 'completed';
  }
  
  // Upcoming: Kickoff pending or not started
  if (status === 'KICKOFF_PENDING') {
    return 'upcoming';
  }
  
  // Active: Everything else
  return 'active';
}

export default function ReleasesPage() {
  const data = useLoaderData<typeof loader>();
  const { org, releases } = data as any;
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'active');
  
  // Filter releases by tab
  const filteredReleases = useMemo(() => {
    return releases.filter((release: any) => categorizeRelease(release) === activeTab);
  }, [releases, activeTab]);
  
  // Count releases per tab
  const releaseCounts = useMemo(() => {
    return {
      upcoming: releases.filter((r: any) => categorizeRelease(r) === 'upcoming').length,
      active: releases.filter((r: any) => categorizeRelease(r) === 'active').length,
      completed: releases.filter((r: any) => categorizeRelease(r) === 'completed').length,
    };
  }, [releases]);
  
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Release Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage and track your app releases
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Link
                to={`/dashboard/${org}/releases/settings`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
              
              <Link
                to={`/dashboard/${org}/releases/create`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Release
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('upcoming')}
                className={`${
                  activeTab === 'upcoming'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                Upcoming
                <span className={`${
                  activeTab === 'upcoming'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-900'
                } ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium`}>
                  {releaseCounts.upcoming}
                </span>
              </button>

              <button
                onClick={() => handleTabChange('active')}
                className={`${
                  activeTab === 'active'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                Active
                <span className={`${
                  activeTab === 'active'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-900'
                } ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium`}>
                  {releaseCounts.active}
                </span>
              </button>

              <button
                onClick={() => handleTabChange('completed')}
                className={`${
                  activeTab === 'completed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                Completed
                <span className={`${
                  activeTab === 'completed'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-900'
                } ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium`}>
                  {releaseCounts.completed}
                </span>
              </button>
            </nav>
          </div>
        </div>
        
        {/* Releases Content */}
        {filteredReleases.length === 0 ? (
          // Empty State
          <div className="text-center bg-white rounded-lg shadow p-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No {activeTab} releases</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'upcoming' && 'No upcoming releases scheduled.'}
              {activeTab === 'active' && 'No releases currently in progress.'}
              {activeTab === 'completed' && 'No completed releases yet.'}
            </p>
            {activeTab === 'upcoming' && (
              <div className="mt-6">
                <Link
                  to={`/dashboard/${org}/releases/create`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Release
                </Link>
              </div>
            )}
          </div>
        ) : (
          // Releases List (Card View)
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredReleases.map((release: any) => (
              <Link
                key={release.id}
                to={`/dashboard/${org}/releases/${release.id}`}
                className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Release Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{release.releaseKey}</h3>
                    <p className="text-sm text-gray-500 mt-1">Version {release.version}</p>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      release.releaseType === 'HOTFIX' ? 'bg-red-100 text-red-800' :
                      release.releaseType === 'MAJOR' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {release.releaseType}
                    </span>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      release.status === 'RELEASED' ? 'bg-green-100 text-green-800' :
                      release.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                      release.status === 'KICKOFF_PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {release.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                
                {/* Release Info */}
                <div className="space-y-2 text-sm">
                  {release.releasePilot && (
                    <div className="flex items-center text-gray-600">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">Pilot:</span>
                      <span className="ml-1">{release.releasePilot.name}</span>
                    </div>
                  )}
                  
                  {release.plannedDate && (
                    <div className="flex items-center text-gray-600">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Planned:</span>
                      <span className="ml-1">{new Date(release.plannedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {release.releaseDate && (
                    <div className="flex items-center text-gray-600">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Released:</span>
                      <span className="ml-1">{new Date(release.releaseDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {release.finalBuildNumbers && (
                    <div className="flex items-center text-gray-600">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="font-medium">Builds:</span>
                      <span className="ml-1 text-xs">
                        {release.finalBuildNumbers.ios && `iOS: ${release.finalBuildNumbers.ios} `}
                        {release.finalBuildNumbers.android && `Android: ${release.finalBuildNumbers.android}`}
                      </span>
                    </div>
                  )}
                  
                  {release.userAdoption && activeTab === 'completed' && (
                    <div className="flex items-center text-gray-600">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="font-medium">Adoption:</span>
                      <span className="ml-1 text-xs">
                        iOS: {release.userAdoption.ios}% | Android: {release.userAdoption.android}%
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

