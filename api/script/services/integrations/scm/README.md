# SCM Integration Service

## Overview

The SCM Integration Service provides a unified interface for interacting with Source Control Management systems (GitHub, GitLab, Bitbucket, etc.). The Release Service uses this to perform SCM operations without needing to know which provider is being used.

## Architecture

### 1. **SCMIntegration Interface** (`scm-integration.interface.ts`)
Defines the contract that all SCM services must implement. This is what the Release Service depends on.

**Key Methods:**
- `checkBranchExists()` - Check if a branch exists
- `forkOutBranch()` - Create a new branch from base branch
- `createReleaseTag()` - Create git tags (RC tags or final tags)
- `createGitHubRelease()` - Create GitHub release with auto-generated notes
- `createReleaseNotes()` - Generate release notes between tags
- `getCommitsDiff()` - Get commit count between branch and tag

### 2. **SCMService** (`scm-service.ts`)
Main implementation of `SCMIntegration` interface. Acts as a **facade** that:
- Implements all interface methods
- Automatically routes calls to the correct provider (GitHub, GitLab, etc.)
- Handles business logic (tag generation, release notes formatting)
- Uses `SCMServiceFactory` to get the right provider instance

### 3. **SCMServiceFactory** (`scm-service-factory.ts`)
Factory pattern for creating provider instances:
- `createForTenant(tenantId)` - Fetches tenant's SCM config and creates appropriate provider
- `create(config)` - Creates provider with explicit configuration
- Returns `GitHubService`, `GitLabService`, etc. based on configuration

### 4. **Provider Implementations**
- **GitHubService** (`github-service.ts`) - GitHub API implementation
- **GitLabService** (future) - GitLab API implementation
- **BitbucketService** (future) - Bitbucket API implementation

## Flow Diagram

```
┌─────────────────┐
│ Release Service │
└────────┬────────┘
         │ Uses SCMIntegration interface
         ▼
┌──────────────────┐
│   SCMService     │ ← Implements SCMIntegration
│  (Facade Layer)  │
└────────┬─────────┘
         │ Routes to provider
         ▼
┌───────────────────┐
│ SCMServiceFactory │ ← Creates provider instance
└────────┬──────────┘
         │ Based on tenant config
         ▼
┌─────────────────────────────┐
│    Provider Instance        │
│  ┌─────────────────────┐   │
│  │  GitHubService      │   │
│  │  GitLabService      │   │
│  │  BitbucketService   │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

## Usage by Release Service

### Example 1: Fork Release Branch

```typescript
import { SCMService, SCMIntegration } from '~/services/integrations/scm';

class ReleaseService {
  private scmService: SCMIntegration = new SCMService();

  async kickoffRelease(release: Release) {
    // Check if base branch exists
    const exists = await this.scmService.checkBranchExists(
      release.tenantId,
      'main'
    );
    
    if (!exists) {
      throw new Error('Base branch does not exist');
    }
    
    // Fork out release branch
    await this.scmService.forkOutBranch(
      release.tenantId,
      `release/${release.version}`,
      'main'
    );
  }
}
```

### Example 2: Create RC Tag

```typescript
async createRCTag(release: Release, rcNumber: number) {
  const tagName = `v${release.version}_rc_${rcNumber}`;
  
  await this.scmService.createReleaseTag(
    release.tenantId,
    `release/${release.version}`,
    tagName // Explicit tag name for RC
  );
  
  // Store tag in release.stageData
  release.stageData.currentTag = tagName;
}
```

### Example 3: Create Final Release

```typescript
async finalizeRelease(release: Release) {
  // Create final tag from targets
  const finalTag = await this.scmService.createReleaseTag(
    release.tenantId,
    `release/${release.version}`,
    undefined, // No explicit tag name
    release.targets, // ['WEB', 'PLAY_STORE', 'APP_STORE']
    release.version // '1.0.0'
  );
  // Result: 'wps_1.0.0'
  
  // Create GitHub release with auto-generated notes
  const releaseUrl = await this.scmService.createGitHubRelease(
    release.tenantId,
    finalTag, // Current tag
    release.parent?.releaseTag, // Previous release tag
    undefined, // Not needed if previousTag provided
    undefined // Not needed if previousTag provided
  );
  
  // Store in release.stageData
  release.stageData.releaseTag = finalTag;
  release.stageData.releaseUrl = releaseUrl;
}
```

### Example 4: Check Cherry Picks

```typescript
async checkCherryPicks(release: Release) {
  const commitCount = await this.scmService.getCommitsDiff(
    release.tenantId,
    `release/${release.version}`, // Current branch
    release.stageData.currentTag // Last RC tag
  );
  
  if (commitCount > 0) {
    // New commits detected, need new RC tag
    const newRCNumber = release.rcCount + 1;
    await this.createRCTag(release, newRCNumber);
  }
}
```

## Tag Generation Logic

### RC Tags (Explicit)
```typescript
// User provides explicit tag name
createReleaseTag(
  tenantId,
  'release/v1.0.0',
  'v1.0.0_rc_0' // Explicit tag name
)
// Result: 'v1.0.0_rc_0'
```

### Final Tags (Generated from Targets)
```typescript
// Service generates tag from targets
createReleaseTag(
  tenantId,
  'release/v1.0.0',
  undefined, // No explicit tag
  ['WEB', 'PLAY_STORE', 'APP_STORE'], // Targets
  '1.0.0' // Version
)
// Result: 'wps_1.0.0'
// WEB → w, PLAY_STORE → ps, APP_STORE → as
```

## Benefits

1. **Separation of Concerns**
   - Release Service doesn't know about GitHub/GitLab specifics
   - Easy to add new SCM providers without changing Release Service

2. **Single Responsibility**
   - SCMService handles business logic (tag generation, etc.)
   - Provider implementations handle API calls

3. **Testability**
   - Release Service can be tested with mock SCMIntegration
   - Provider implementations can be tested independently

4. **Flexibility**
   - Tenant-based provider selection (automatic)
   - Override with customConfig for testing/special cases

5. **Type Safety**
   - Full TypeScript interface ensures compile-time checks
   - Clear method signatures and documentation

## Adding a New Provider (e.g., GitLab)

1. **Create provider implementation**:
   ```typescript
   // gitlab-service.ts
   export class GitLabService {
     async createBranch(...) { /* GitLab API calls */ }
     async createTag(...) { /* GitLab API calls */ }
     // ... implement all required methods
   }
   ```

2. **Update factory**:
   ```typescript
   // scm-service-factory.ts
   switch (config.scmType) {
     case SCMType.GITHUB:
       return new GitHubService(config);
     case SCMType.GITLAB:
       return new GitLabService(config); // NEW
   }
   ```

3. **That's it!** Release Service automatically uses GitLab for tenants with GitLab integration.

## Current Implementation Status

- ✅ **GitHub**: Fully implemented
- 📝 **GitLab**: Coming soon
- 📝 **Bitbucket**: Coming soon
- 📝 **Azure Repos**: Planned

## Testing

```typescript
// Mock for testing
class MockSCMService implements SCMIntegration {
  async checkBranchExists() { return true; }
  async forkOutBranch() { /* no-op */ }
  // ... mock implementations
}

// In tests
const releaseService = new ReleaseService();
releaseService.scmService = new MockSCMService();
```
