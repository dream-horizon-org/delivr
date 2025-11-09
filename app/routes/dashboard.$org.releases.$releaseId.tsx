/**
 * Release Details Page
 * Shows detailed information about a specific release
 */

import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { getReleaseDetails } from '~/.server/services/ReleaseManagement';

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org, releaseId } = params;
  
  if (!org || !releaseId) {
    throw new Response('Not found', { status: 404 });
  }
  
  try {
    const releaseDetails = await getReleaseDetails(releaseId);
    
    return json({
      org,
      user,
      release: releaseDetails.release,
      builds: releaseDetails.builds,
      tasks: releaseDetails.tasks,
      cherryPicks: releaseDetails.cherryPicks,
    });
  } catch (error) {
    throw new Response('Release not found', { status: 404 });
  }
});

export default function ReleaseDetailsPage() {
  const { org, release, builds, tasks, cherryPicks } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                to={`/dashboard/${org}/releases`}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{release.releaseKey}</h1>
                <p className="text-sm text-gray-500">Version {release.version}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                release.status === 'RELEASED' ? 'bg-green-100 text-green-800' :
                release.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                release.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {release.status}
              </span>
              
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Edit Release
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
          
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Release Type</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  release.releaseType === 'HOTFIX' ? 'bg-red-100 text-red-800' :
                  release.releaseType === 'MAJOR' ? 'bg-purple-100 text-purple-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {release.releaseType}
                </span>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Planned Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : 'Not set'}
              </dd>
            </div>
            
            {release.releaseDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Release Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(release.releaseDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            
            {release.releasePilotName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Release Pilot</dt>
                <dd className="mt-1 text-sm text-gray-900">{release.releasePilotName}</dd>
              </div>
            )}
            
            {release.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{release.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Builds */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Builds</h2>
            <button
              type="button"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Trigger Build
            </button>
          </div>
          
          {builds.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No builds yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Build #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {builds.map((build) => (
                    <tr key={build.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{build.platform}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{build.buildNumber}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          build.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                          build.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          build.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {build.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(build.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tasks</h2>
          
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No tasks yet</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.name}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                    task.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cherry Picks */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Cherry Picks</h2>
            <button
              type="button"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Request Cherry Pick
            </button>
          </div>
          
          {cherryPicks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No cherry picks yet</p>
          ) : (
            <div className="space-y-3">
              {cherryPicks.map((cp) => (
                <div key={cp.id} className="flex items-start justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {cp.commitHash.substring(0, 7)} - {cp.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">By {cp.requestedBy.name}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    cp.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    cp.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {cp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

