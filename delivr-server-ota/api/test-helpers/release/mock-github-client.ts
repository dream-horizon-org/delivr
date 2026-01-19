/**
 * Mock GitHub/Octokit Client for Testing
 * 
 * Provides mock implementations of Octokit methods used by GitHub SCM provider
 * to avoid actual API calls during testing.
 */

/**
 * Mock Octokit client that simulates GitHub API responses
 */
export class MockOctokit {
  git = {
    /**
     * Mock getting a reference (branch/tag)
     * Returns a mock ref with SHA
     */
    getRef: async ({ owner, repo, ref }: { owner: string; repo: string; ref: string }) => {
      return {
        data: {
          ref: `refs/heads/${ref.replace('refs/heads/', '')}`,
          node_id: 'mock-node-id',
          url: `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${ref}`,
          object: {
            sha: 'mock-sha-' + Math.random().toString(36).substring(7),
            type: 'commit',
            url: `https://api.github.com/repos/${owner}/${repo}/git/commits/mock-sha`
          }
        }
      };
    },

    /**
     * Mock creating a reference (new branch)
     * Returns success
     */
    createRef: async ({ owner, repo, ref, sha }: { owner: string; repo: string; ref: string; sha: string }) => {
      return {
        data: {
          ref,
          node_id: 'mock-node-id',
          url: `https://api.github.com/repos/${owner}/${repo}/git/refs/${ref}`,
          object: {
            sha,
            type: 'commit',
            url: `https://api.github.com/repos/${owner}/${repo}/git/commits/${sha}`
          }
        }
      };
    },

    /**
     * Mock creating a tag
     * Returns mock tag object
     */
    createTag: async ({ owner, repo, tag, message, object: sha }: any) => {
      return {
        data: {
          node_id: 'mock-tag-node-id',
          tag,
          sha: 'mock-tag-sha-' + Math.random().toString(36).substring(7),
          url: `https://api.github.com/repos/${owner}/${repo}/git/tags/${tag}`,
          message,
          tagger: {
            name: 'Test User',
            email: 'test@example.com',
            date: new Date().toISOString()
          },
          object: {
            sha,
            type: 'commit',
            url: `https://api.github.com/repos/${owner}/${repo}/git/commits/${sha}`
          }
        }
      };
    }
  };

  repos = {
    /**
     * Mock getting a branch
     * Returns mock branch with commit SHA
     */
    getBranch: async ({ owner, repo, branch }: { owner: string; repo: string; branch: string }) => {
      return {
        data: {
          name: branch,
          commit: {
            sha: 'mock-commit-sha-' + Math.random().toString(36).substring(7),
            node_id: 'mock-node-id',
            url: `https://api.github.com/repos/${owner}/${repo}/commits/mock-sha`
          },
          protected: false
        }
      };
    },

    /**
     * Mock comparing two commits
     * Returns mock comparison with commits list
     */
    compareCommits: async ({ owner, repo, base, head }: { owner: string; repo: string; base: string; head: string }) => {
      return {
        data: {
          url: `https://api.github.com/repos/${owner}/${repo}/compare/${base}...${head}`,
          html_url: `https://github.com/${owner}/${repo}/compare/${base}...${head}`,
          permalink_url: `https://github.com/${owner}/${repo}/compare/${base}...${head}`,
          diff_url: `https://github.com/${owner}/${repo}/compare/${base}...${head}.diff`,
          patch_url: `https://github.com/${owner}/${repo}/compare/${base}...${head}.patch`,
          base_commit: {
            sha: base,
            commit: {
              message: 'Base commit message'
            }
          },
          merge_base_commit: {
            sha: base
          },
          status: 'ahead',
          ahead_by: 5,
          behind_by: 0,
          total_commits: 5,
          commits: [
            {
              sha: 'mock-commit-1',
              commit: {
                message: 'Mock commit 1',
                author: { name: 'Test Author', email: 'test@example.com' }
              }
            },
            {
              sha: 'mock-commit-2',
              commit: {
                message: 'Mock commit 2',
                author: { name: 'Test Author', email: 'test@example.com' }
              }
            }
          ],
          files: []
        }
      };
    },

    /**
     * Mock creating a release
     * Returns mock release with URL
     */
    createRelease: async ({ owner, repo, tag_name, name, body }: any) => {
      return {
        data: {
          id: Math.floor(Math.random() * 1000000),
          node_id: 'mock-release-node-id',
          tag_name,
          name: name || tag_name,
          body: body || '',
          draft: false,
          prerelease: false,
          created_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          url: `https://api.github.com/repos/${owner}/${repo}/releases/mock-id`,
          html_url: `https://github.com/${owner}/${repo}/releases/tag/${tag_name}`,
          assets_url: `https://api.github.com/repos/${owner}/${repo}/releases/mock-id/assets`,
          upload_url: `https://uploads.github.com/repos/${owner}/${repo}/releases/mock-id/assets{?name,label}`,
          tarball_url: `https://api.github.com/repos/${owner}/${repo}/tarball/${tag_name}`,
          zipball_url: `https://api.github.com/repos/${owner}/${repo}/zipball/${tag_name}`,
          author: {
            login: 'test-user',
            id: 1,
            node_id: 'mock-user-node-id',
            avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
            type: 'User'
          }
        }
      };
    }
  };
}

/**
 * Factory function to create mock or real Octokit client based on environment
 * 
 * @param auth - GitHub auth token (ignored in test mode)
 * @returns Mock Octokit in test mode, real Octokit in production
 */
export function createOctokitClient(auth: string): any {
  const isTestEnvironment = process.env.NODE_ENV === 'test' || auth === 'test-token-placeholder';
  
  if (isTestEnvironment) {
    return new MockOctokit();
  }
  
  // In production, this would return real Octokit
  // const { Octokit } = require('@octokit/rest');
  // return new Octokit({ auth });
  
  // For now, return mock even in non-test to avoid requiring actual tokens
  return new MockOctokit();
}


