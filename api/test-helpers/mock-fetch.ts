/**
 * Mock Fetch for Testing
 * 
 * Intercepts fetch calls to JIRA and Checkmate APIs and returns mock responses
 * to avoid actual API calls during testing.
 */

/**
 * Mock response generator for JIRA API calls
 */
function mockJiraResponse(url: string, options?: RequestInit): any {
  const method = options?.method || 'GET';

  // Test connection endpoint
  if (url.includes('/rest/api/') && url.includes('/myself') && method === 'GET') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        self: url,
        accountId: 'mock-jira-account-id',
        emailAddress: 'test@example.com',
        displayName: 'Test User'
      })
    };
  }

  // Create issue endpoint
  if (url.includes('/rest/api/') && url.includes('/issue') && method === 'POST') {
    const body = JSON.parse((options?.body as string) || '{}');
    return {
      ok: true,
      status: 201,
      json: async () => ({
        id: 'mock-issue-' + Math.floor(Math.random() * 10000),
        key: `${body.fields?.project?.key || 'PROJ'}-${Math.floor(Math.random() * 1000)}`,
        self: `${url}/mock-issue-id`
      })
    };
  }

  // Get issue endpoint
  if (url.includes('/rest/api/') && url.includes('/issue/') && method === 'GET') {
    const issueKey = url.split('/issue/')[1]?.split('?')[0];
    return {
      ok: true,
      status: 200,
      json: async () => ({
        key: issueKey,
        id: 'mock-issue-id',
        fields: {
          summary: 'Mock Issue Title',
          status: {
            name: 'Done',
            statusCategory: {
              key: 'done'
            }
          },
          resolution: {
            name: 'Done'
          }
        }
      })
    };
  }

  // Default JIRA response
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true })
  };
}

/**
 * Mock response generator for Checkmate API calls
 */
function mockCheckmateResponse(url: string, options?: RequestInit): any {
  const method = options?.method || 'GET';

  // Get projects endpoint
  if (url.includes('/api/v1/projects') && method === 'GET') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        projects: [
          {
            id: 100,
            name: 'Test Project',
            key: 'TEST'
          }
        ]
      })
    };
  }

  // Get sections endpoint
  if (url.includes('/api/v1/project/sections') && method === 'GET') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        sections: [
          {
            id: 1,
            name: 'Smoke Tests'
          },
          {
            id: 2,
            name: 'Regression Tests'
          }
        ]
      })
    };
  }

  // Get labels endpoint
  if (url.includes('/api/v1/labels') && method === 'GET') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        labels: [
          { id: 1, name: 'P0' },
          { id: 2, name: 'P1' }
        ]
      })
    };
  }

  // Get squads endpoint
  if (url.includes('/api/v1/project/squads') && method === 'GET') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        squads: [
          { id: 1, name: 'QA Team 1' },
          { id: 2, name: 'QA Team 2' }
        ]
      })
    };
  }

  // Create run endpoint
  if (url.includes('/api/v1/run/create') && method === 'POST') {
    const body = JSON.parse((options?.body as string) || '{}');
    return {
      ok: true,
      status: 201,
      json: async () => ({
        runId: 'mock-run-' + Math.floor(Math.random() * 100000),
        message: 'Run created successfully',
        data: {
          tenantId: body.tenantId,
          runName: body.runName || 'Test Run'
        }
      })
    };
  }

  // Get run state/detail endpoint
  if (url.includes('/api/v1/run/state-detail') && method === 'GET') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        runId: url.split('runId=')[1]?.split('&')[0] || 'mock-run-id',
        state: 'completed',
        data: {
          untested: 0,
          inProgress: 0,
          passed: 85,
          failed: 5,
          blocked: 0,
          retest: 0,
          total: 90
        }
      })
    };
  }

  // Reset run endpoint
  if (url.includes('/api/v1/run/reset') && method === 'POST') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        message: 'Run reset successfully'
      })
    };
  }

  // Delete run endpoint
  if (url.includes('/api/v1/run/delete') && method === 'DELETE') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        message: 'Run deleted successfully'
      })
    };
  }

  // Default Checkmate response
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true })
  };
}

/**
 * Mock fetch implementation that intercepts API calls
 */
export function mockFetch(url: string | URL | Request, options?: RequestInit): Promise<Response> {
  const urlString = url.toString();
  const method = options?.method || 'GET';

  // Mock JIRA API calls
  if (urlString.includes('atlassian.net') || urlString.includes('jira')) {
    return Promise.resolve(mockJiraResponse(urlString, options) as Response);
  }

  // Mock Checkmate API calls
  if (urlString.includes('checkmate') || urlString.includes('/api/v1/')) {
    return Promise.resolve(mockCheckmateResponse(urlString, options) as Response);
  }

  // Mock GitHub Actions workflow dispatch (POST to /dispatches endpoint)
  if (urlString.includes('api.github.com') && urlString.includes('/dispatches') && method === 'POST') {
    return Promise.resolve({
      ok: true,
      status: 204, // GitHub Actions dispatch returns 204 No Content
      statusText: 'No Content',
      json: async () => { throw new Error('No content'); }, // 204 has no body
      text: async () => '',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: urlString,
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData()
    } as Response);
  }

  // Mock GitHub Actions workflow runs query (GET to /runs endpoint)
  if (urlString.includes('api.github.com') && urlString.includes('/runs') && method === 'GET') {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        total_count: 1,
        workflow_runs: [{
          id: 'mock-run-' + Math.floor(Math.random() * 100000),
          html_url: `https://github.com/test-owner/test-repo/actions/runs/mock-run-id`,
          status: 'queued',
          conclusion: null
        }]
      }),
      text: async () => JSON.stringify({ total_count: 1 }),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: urlString,
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData()
    } as Response);
  }

  // Mock GitHub API: Create/Get Reference (branches, tags)
  if (urlString.includes('api.github.com') && urlString.includes('/git/refs') && (method === 'GET' || method === 'POST')) {
    return Promise.resolve({
      ok: true,
      status: method === 'POST' ? 201 : 200,
      statusText: method === 'POST' ? 'Created' : 'OK',
      json: async () => ({
        ref: 'refs/heads/release/v1.0.0',
        node_id: 'mock-node-id',
        url: `https://api.github.com/repos/test-owner/test-repo/git/refs/heads/release/v1.0.0`,
        object: {
          sha: 'mock-sha-' + Math.floor(Math.random() * 100000),
          type: 'commit',
          url: 'https://api.github.com/repos/test-owner/test-repo/git/commits/mock-sha'
        }
      }),
      text: async () => JSON.stringify({ ref: 'refs/heads/release/v1.0.0' }),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: urlString,
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData()
    } as Response);
  }

  // Mock GitHub API: Create Release
  if (urlString.includes('api.github.com') && urlString.includes('/releases') && method === 'POST') {
    const body = JSON.parse((options?.body as string) || '{}');
    return Promise.resolve({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({
        id: Math.floor(Math.random() * 100000),
        tag_name: body.tag_name || 'v1.0.0',
        name: body.name || 'Release v1.0.0',
        body: body.body || 'Release notes',
        html_url: `https://github.com/test-owner/test-repo/releases/tag/${body.tag_name || 'v1.0.0'}`,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString()
      }),
      text: async () => JSON.stringify({ tag_name: body.tag_name }),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: urlString,
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData()
    } as Response);
  }

  // Mock GitHub API: Get/Create Tags
  if (urlString.includes('api.github.com') && urlString.includes('/git/tags') && (method === 'GET' || method === 'POST')) {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    return Promise.resolve({
      ok: true,
      status: method === 'POST' ? 201 : 200,
      statusText: method === 'POST' ? 'Created' : 'OK',
      json: async () => ({
        node_id: 'mock-tag-node-id',
        tag: body.tag || 'v1.0.0-rc1',
        sha: 'mock-tag-sha-' + Math.floor(Math.random() * 100000),
        url: `https://api.github.com/repos/test-owner/test-repo/git/tags/mock-tag-sha`,
        tagger: {
          name: 'Test User',
          email: 'test@example.com',
          date: new Date().toISOString()
        },
        object: {
          sha: 'mock-commit-sha',
          type: 'commit',
          url: 'https://api.github.com/repos/test-owner/test-repo/git/commits/mock-commit-sha'
        },
        message: body.message || 'Release candidate tag',
        verification: {
          verified: false,
          reason: 'unsigned'
        }
      }),
      text: async () => JSON.stringify({ tag: body.tag || 'v1.0.0-rc1' }),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: urlString,
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData()
    } as Response);
  }

  // Mock GitHub API: Get Commits (for branch HEAD lookup)
  if (urlString.includes('api.github.com') && urlString.includes('/commits') && method === 'GET') {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        sha: 'mock-commit-sha-' + Math.floor(Math.random() * 100000),
        commit: {
          message: 'Mock commit message',
          author: {
            name: 'Test User',
            email: 'test@example.com',
            date: new Date().toISOString()
          }
        },
        html_url: 'https://github.com/test-owner/test-repo/commit/mock-commit-sha'
      }),
      text: async () => JSON.stringify({ sha: 'mock-commit-sha' }),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: urlString,
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData()
    } as Response);
  }

  // For other URLs, return a generic success response
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ success: true }),
    text: async () => 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: urlString,
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData()
  } as Response);
}

/**
 * Setup global fetch mock for testing
 * Call this at the beginning of test files to intercept all fetch calls
 */
export function setupFetchMock(): void {
  // @ts-ignore - Override global fetch for testing
  global.fetch = mockFetch;
}

/**
 * Restore original fetch implementation
 * Call this after tests to clean up
 */
export function restoreFetch(): void {
  // @ts-ignore - Restore original fetch
  delete global.fetch;
}

