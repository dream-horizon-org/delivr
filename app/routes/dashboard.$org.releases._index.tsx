/**
 * Release Management Dashboard (Index Route)
 * Analytics and overview page for release management
 * Displayed at: /dashboard/:org/releases
 * 
 * Data Flow:
 * - Parent route (releases.tsx) handles setup validation
 * - Gets org data from root parent route (dashboard.$org)
 * - Fetches releases data for analytics
 * - No setup checks needed here - parent handles all redirects
 */

import { json } from '@remix-run/node';
import { useLoaderData, useRouteLoaderData, Link } from '@remix-run/react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { getReleases } from '~/.server/services/ReleaseManagement';
import type { OrgLayoutLoaderData } from './dashboard.$org';
import { UnconfiguredBanner } from '~/components/ReleaseManagement/UnconfiguredBanner';
import { hasReleaseConfiguration } from '~/utils/check-release-config';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response('Organization not found', { status: 404 });
  }
  
  // NOTE: Setup status is available from parent route - no need to fetch again!
  // We'll access it via useRouteLoaderData in the component
  
  // Fetch releases and analytics from API
  let releases = [];
  let analyticsData = null;
  
  try {
    // Fetch analytics
    const analyticsResponse = await fetch(`http://localhost:3000/api/v1/tenants/${org}/releases?analytics=true`);
    if (analyticsResponse.ok) {
      const data = await analyticsResponse.json();
      analyticsData = data.analytics;
    }
    
    // Fetch actual releases
    const releasesResponse = await fetch(`http://localhost:3000/api/v1/tenants/${org}/releases?recent=10`);
    if (releasesResponse.ok) {
      const releasesData = await releasesResponse.json();
      releases = releasesData.releases || [];
    }
  } catch (error) {
    console.error('[Dashboard] Failed to fetch releases:', error);
  }
  
  // Use analytics from API if available, otherwise calculate from releases
  let totalReleases, activeReleases, completedReleases, upcomingReleases, successRate, avgCycleTime;
  
  if (analyticsData) {
    totalReleases = analyticsData.totalReleases;
    activeReleases = analyticsData.activeReleases;
    completedReleases = analyticsData.completedReleases;
    successRate = analyticsData.successRate;
    avgCycleTime = analyticsData.avgCycleTime;
    upcomingReleases = 0; // TODO: Add to analytics
  } else {
    // Calculate analytics from releases
    totalReleases = releases.length;
    activeReleases = releases.filter((r: any) => 
      r.status === 'IN_PROGRESS' || r.status === 'DRAFT'
    ).length;
    completedReleases = releases.filter((r: any) => r.status === 'COMPLETED').length;
    upcomingReleases = releases.filter((r: any) => r.status === 'DRAFT').length;
    
    // Calculate success rate
    successRate = totalReleases > 0 
      ? Math.round((completedReleases / totalReleases) * 100) 
      : 0;
    
    avgCycleTime = '14 days'; // Mock for now
  }
  
  // Get recent releases (last 5)
  const recentReleases = releases.slice(0, 5);
  
  // Get completed releases for adoption chart
  const completedReleasesForChart = releases
    .filter((r: any) => r.status === 'COMPLETED' && r.userAdoption)
    .slice(0, 5)
    .reverse();
  
  // Prepare chart data
  const adoptionChartData = completedReleasesForChart.map((r: any) => ({
    version: r.version,
    ios: r.userAdoption?.ios || 0,
    android: r.userAdoption?.android || 0,
    web: r.userAdoption?.web || 0,
  }));
  
  return json({
    analytics: {
      totalReleases,
      activeReleases,
      completedReleases,
      upcomingReleases,
      successRate,
      avgCycleTime,
    },
    recentReleases,
    adoptionChartData,
  });
});

export default function ReleaseDashboardPage() {
  const loaderData = useLoaderData<typeof loader>();
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  
  if (!orgData) {
    throw new Error('Organization data not found');
  }
  
  const { tenantId: org } = orgData;
  
  // Extract data (guaranteed to exist as loader always returns this structure)
  const { analytics, recentReleases, adoptionChartData } = loaderData as {
    analytics: {
      totalReleases: number;
      activeReleases: number;
      completedReleases: number;
      upcomingReleases: number;
      successRate: number;
      avgCycleTime: string;
    };
    recentReleases: any[];
    adoptionChartData: any[];
  };
  
  // Check if release configuration exists
  const hasConfig = hasReleaseConfiguration(org);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Release Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Overview and analytics for your release management
              </p>
            </div>
            
            <div className="flex space-x-3">
              {hasConfig && (
                <Link
                  to={`/dashboard/${org}/settings/release-config`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  title="Manage release configurations"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Manage Configs
                </Link>
              )}
              
              <Link
                to={`/dashboard/${org}/releases/configure`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {hasConfig ? 'New Config' : 'Configure Release'}
              </Link>
              
              <Link
                to={`/dashboard/${org}/releases/list`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View All Releases
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
        {/* Unconfigured Banner - Show if no configuration exists */}
        {!hasConfig && <UnconfiguredBanner organizationId={org} />}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Releases */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Releases</dt>
                    <dd className="text-3xl font-semibold text-gray-900">{analytics.totalReleases}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Releases */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Releases</dt>
                    <dd className="text-3xl font-semibold text-gray-900">{analytics.activeReleases}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Completed Releases */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-3xl font-semibold text-gray-900">{analytics.completedReleases}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                    <dd className="text-3xl font-semibold text-gray-900">{analytics.successRate}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Adoption Chart */}
        {adoptionChartData && adoptionChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Adoption Trend Chart */}
            <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">User Adoption by Release</h2>
              <div className="h-64">
                <div className="flex items-end justify-between h-full space-x-2">
                  {adoptionChartData.map((data: any, index: number) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      {/* Bars */}
                      <div className="w-full flex space-x-1 items-end h-48">
                        {/* iOS Bar */}
                        <div className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                            style={{ height: `${data.ios}%` }}
                            title={`iOS: ${data.ios}%`}
                          ></div>
                        </div>
                        {/* Android Bar */}
                        <div className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                            style={{ height: `${data.android}%` }}
                            title={`Android: ${data.android}%`}
                          ></div>
                        </div>
                        {/* Web Bar */}
                        <div className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-600"
                            style={{ height: `${data.web}%` }}
                            title={`Web: ${data.web}%`}
                          ></div>
                        </div>
                      </div>
                      {/* Version Label */}
                      <div className="text-xs text-gray-600 mt-2 text-center truncate w-full">
                        v{data.version}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-sm text-gray-600">iOS</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-600">Android</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-sm text-gray-600">Web</span>
                </div>
              </div>
            </div>

            {/* Latest Release Adoption */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Latest Release Adoption</h3>
              {adoptionChartData.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Version {adoptionChartData[adoptionChartData.length - 1].version}</span>
                    </div>
                  </div>
                  
                  {/* iOS Adoption */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">iOS</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {adoptionChartData[adoptionChartData.length - 1].ios}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${adoptionChartData[adoptionChartData.length - 1].ios}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Android Adoption */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Android</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {adoptionChartData[adoptionChartData.length - 1].android}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${adoptionChartData[adoptionChartData.length - 1].android}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Web Adoption */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Web</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {adoptionChartData[adoptionChartData.length - 1].web}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${adoptionChartData[adoptionChartData.length - 1].web}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Average */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Average Adoption</span>
                      <span className="text-lg font-bold text-gray-900">
                        {Math.round(
                          (adoptionChartData[adoptionChartData.length - 1].ios +
                           adoptionChartData[adoptionChartData.length - 1].android +
                           adoptionChartData[adoptionChartData.length - 1].web) / 3
                        )}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Releases */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Releases</h2>
              <Link
                to={`/dashboard/${org}/releases/list`}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all →
              </Link>
            </div>
            
            {recentReleases && recentReleases.length > 0 ? (
              <div className="space-y-3">
                {recentReleases.map((release: any) => (
                  <Link
                    key={release.id}
                    to={`/dashboard/${org}/releases/${release.id}`}
                    className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-semibold text-gray-900">{release.releaseKey}</h3>
                          <span className="text-sm text-gray-500">v{release.version}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            release.releaseType === 'HOTFIX' ? 'bg-red-100 text-red-800' :
                            release.releaseType === 'MAJOR' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {release.releaseType}
                          </span>
                        </div>
                        {release.releasePilot && (
                          <p className="text-xs text-gray-500 mt-1">
                            Pilot: {release.releasePilot.name}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {release.plannedDate && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Planned</p>
                            <p className="text-xs font-medium text-gray-900">
                              {new Date(release.plannedDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        
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
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No releases yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Release Timeline */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Release Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Upcoming Releases</span>
                <span className="text-sm font-semibold text-gray-900">{analytics.upcomingReleases}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="text-sm font-semibold text-gray-900">{analytics.activeReleases}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Cycle Time</span>
                <span className="text-sm font-semibold text-gray-900">{analytics.avgCycleTime}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to={`/dashboard/${org}/releases/create`}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
              >
                Create New Release
              </Link>
              <Link
                to={`/dashboard/${org}/releases/list?tab=active`}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
              >
                View Active Releases
              </Link>
              <Link
                to={`/dashboard/${org}/releases/settings`}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
              >
                Release Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

