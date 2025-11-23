# Integration Service Signatures - Clarification

**Date**: 2025-11-22  
**Issue**: Do integration services need `tenantId` if we already have specific ID?  
**Answer**: **YES** - tenantId is needed for security validation

---

## The Answer: YES, tenantId IS Required! ✅

After examining the actual integration service implementations, **ALL services require BOTH `tenantId` AND specific ID** for security validation.

### Why Both Parameters Are Needed

1. **Security Validation** - Prevent cross-tenant attacks
2. **Multi-Step Lookup** - Get integration config from specific ID, then validate tenant ownership
3. **Token/Credentials Resolution** - Services need tenantId to fetch secrets/tokens

---

## Service Signatures (Actual Implementation)

### 1. CI/CD Service ✅

**Signature**:
```typescript
// GitHub Actions Workflow Service
trigger = async (tenantId: string, input: {
  workflowId?: string;
  workflowType?: string;
  platform?: string;
  jobParameters?: Record<string, unknown>;
}): Promise<{ queueLocation: string }>
```

**Why tenantId is needed**:
```typescript
// Security check - validates workflowId belongs to tenantId
let workflow: any;
if (hasWorkflowId) {
  const item = await this.workflowRepository.findById(input.workflowId as string);
  const invalid = !item || item.tenantId !== tenantId || item.providerType !== CICDProviderType.GITHUB_ACTIONS;
  if (invalid) throw new Error(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
  workflow = item;
}

// Token retrieval - needs tenantId
const token = await this.getGithubTokenForTenant(tenantId);
```

**✅ Conclusion**: Needs BOTH `tenantId` + `workflowId`

---

### 2. Project Management (JIRA) Service ✅

**Service Layer Signature**:
```typescript
// ProjectManagementTicketService
async createTickets(request: CreateTicketsRequest): Promise<CreateTicketsResponse>
```

**Provider Interface Signature**:
```typescript
// IProjectManagementProvider
createTicket(
  config: ProjectManagementIntegrationConfig,  // ← Contains tenantId implicitly
  params: CreateTicketParams
): Promise<TicketResult>
```

**How it works**:
```typescript
// 1. Service gets config by configId
const config = await this.configRepo.findById(request.configId);

// 2. Service gets integration (validates tenant ownership)
const integration = await this.integrationRepo.findById(config.integrationId);

// 3. Provider receives full config (includes tenantId implicitly)
const ticket = await provider.createTicket(integration.config, {
  projectKey: platformConfig.parameters.projectKey,
  title: ticketRequest.title,
  // ...
});
```

**✅ Conclusion**: Service layer handles tenantId validation via `configId` → config → integration lookup

**Note**: Provider doesn't see tenantId directly, but service validates before calling provider

---

### 3. Test Management Service ✅

**Service Signature**:
```typescript
// TestManagementRunService
async createTestRuns(request: CreateTestRunsRequest): Promise<CreateTestRunsResponse>
```

**Request Type**:
```typescript
type CreateTestRunsRequest = {
  testManagementConfigId: string;
  platforms?: TestPlatform[];  // Optional filter
}
```

**Provider Signature**:
```typescript
// ITestManagementProvider
createTestRun(
  config: TenantTestManagementIntegrationConfig,  // ← Contains tenantId
  parameters: PlatformTestParameters
): Promise<TestRunResult>
```

**How it works**:
```typescript
// 1. Get test management config
const config = await this.configRepo.findById(testManagementConfigId);
if (!config) {
  throw new Error(`Test management config not found: ${testManagementConfigId}`);
}

// 2. Get integration (credentials) - validates tenant ownership
const integration = await this.integrationRepo.findById(config.integrationId);
if (!integration) {
  throw new Error(`Integration not found: ${config.integrationId}`);
}

// 3. Provider receives full config (includes tenantId)
const provider = ProviderFactory.getProvider(integration.providerType);
```

**✅ Conclusion**: Service validates tenant ownership via config lookup, provider receives config with tenantId

---

### 4. SCM Service ✅

**Service Signature**:
```typescript
// SCMService
async forkOutBranch(tenantId: string, releaseBranch: string, baseBranch: string): Promise<void>
```

**Provider Signature**:
```typescript
// GitHubProvider
async forkOutBranch(tenantId: string, releaseBranch: string, baseBranch: string): Promise<void> {
  const { client, owner, repo } = await this.getClientAndRepo(tenantId);  // ← Uses tenantId
  const baseRef = await client.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
  const baseSha = baseRef.data.object.sha;
  await client.git.createRef({ owner, repo, ref: `refs/heads/${releaseBranch}`, sha: baseSha });
}
```

**How it works**:
```typescript
// Private helper - resolves integration from tenantId
private async getProviderForTenant(tenantId: string) {
  const storage = getStorage();
  const integration = await storage.scmController.findActiveByTenantWithTokens(tenantId);
  const integrationMissing = !integration;
  if (integrationMissing) {
    throw new Error(SCM_ERROR_MESSAGES.ACTIVE_INTEGRATION_NOT_FOUND);
  }
  const provider = SCMProviderFactory.getProvider(integration.scmType);
  return provider;
}
```

**✅ Conclusion**: SCM uses `tenantId` directly (no specific ID needed) - simpler pattern

---

## Updated TaskExecutor Pattern

### ❌ WRONG (What MERGE_PLAN.md Currently Says)

```typescript
// Phase 6 - Step 6.4 (INCORRECT)
const config = await this.getReleaseConfig(release.releaseConfigId);
const workflowId = config.ciConfigId;

await this.cicdService.triggerWorkflow(
  release.tenantId,
  workflowId,  // ← This signature is wrong!
  params
);
```

### ✅ CORRECT (Updated Pattern)

```typescript
// CI/CD Pattern (needs both tenantId + workflowId)
const config = await this.getReleaseConfig(release.releaseConfigId);
const workflowId = config.ciConfigId;

if (!workflowId) {
  throw new Error('CI/CD integration not configured for this release');
}

await this.cicdService.trigger(
  release.tenantId,  // ← tenantId for security validation
  {
    workflowId: workflowId,  // ← workflowId to identify which workflow
    jobParameters: {
      platform: platformName,
      version: release.version,
      branch: release.branchRelease
    }
  }
);
```

```typescript
// Project Management Pattern (configId maps to integration)
const config = await this.getReleaseConfig(release.releaseConfigId);
const pmConfigId = config.projectManagementConfigId;

if (!pmConfigId) {
  throw new Error('Project management not configured for this release');
}

await this.pmTicketService.createTickets({
  configId: pmConfigId,  // ← Service validates tenant ownership via config lookup
  tickets: [{
    platform: 'IOS',
    title: `Release ${release.version}`,
    description: `Release ${release.version} planned for ${release.targetReleaseDate}`
  }]
});
```

```typescript
// Test Management Pattern (configId maps to integration)
const config = await this.getReleaseConfig(release.releaseConfigId);
const testConfigId = config.testManagementConfigId;

if (!testConfigId) {
  throw new Error('Test management not configured for this release');
}

await this.testRunService.createTestRuns({
  testManagementConfigId: testConfigId,  // ← Service validates tenant ownership
  platforms: ['IOS', 'ANDROID']
});
```

```typescript
// SCM Pattern (just tenantId - no specific ID needed)
await this.scmService.forkOutBranch(
  release.tenantId,  // ← Only parameter needed
  releaseBranch,
  baseBranch
);
```

---

## Security Model: Why tenantId Is Critical

### Attack Scenario Without tenantId Validation

```typescript
// ❌ UNSAFE: If service only accepts workflowId
async triggerWorkflow(workflowId: string, params: any) {
  const workflow = await this.workflowRepo.findById(workflowId);  // No tenant check!
  return await this.githubClient.trigger(workflow);  // ← Attacker triggers another tenant's workflow!
}

// Attacker's malicious request:
POST /api/releases
{
  "releaseConfigId": "attacker-config",
  // attacker-config points to victim's workflowId!
}
```

### ✅ SAFE: With tenantId Validation

```typescript
// ✅ SAFE: Service validates tenant ownership
async trigger(tenantId: string, input: { workflowId: string }) {
  const workflow = await this.workflowRepo.findById(input.workflowId);
  
  // CRITICAL SECURITY CHECK
  if (workflow.tenantId !== tenantId) {
    throw new Error('Workflow not found');  // Don't leak that workflow exists!
  }
  
  return await this.githubClient.trigger(workflow);
}
```

**Benefits**:
1. ✅ **Prevents cross-tenant attacks**
2. ✅ **Prevents ID enumeration attacks**
3. ✅ **Validates ownership** before execution
4. ✅ **Audit trail** (who triggered what)

---

## Summary: What TaskExecutor Must Do

| Integration | TaskExecutor Lookup | Service Call Parameters | Security Model |
|-------------|---------------------|------------------------|----------------|
| **SCM** | None | `tenantId, branchName, baseBranch` | Service validates tenant has active SCM integration |
| **CI/CD** | Extract `ciConfigId` from ReleaseConfiguration | `tenantId, { workflowId, jobParameters }` | Service validates workflowId belongs to tenantId |
| **Project Mgmt** | Extract `projectManagementConfigId` | `{ configId, tickets }` | Service validates configId → integration → tenantId |
| **Test Mgmt** | Extract `testManagementConfigId` | `{ testManagementConfigId, platforms }` | Service validates configId → integration → tenantId |
| **Notifications** | Extract `commsConfigId` | `{ channelConfigId, message }` | Service validates channelId → integration → tenantId |

**Key Pattern**:
- **SCM**: Direct tenantId validation (no config lookup)
- **CI/CD**: tenantId + workflowId validation (both required)
- **Others**: configId → validates via lookup chain (tenantId implicit)

---

## Action Items for MERGE_PLAN.md

### Phase 6 Updates Needed

1. **Step 6.4 (CI/CD Calls)** - Update to use correct signature:
   ```typescript
   await this.cicdService.trigger(
     release.tenantId,
     {
       workflowId: config.ciConfigId,
       jobParameters: { ... }
     }
   );
   ```

2. **Step 6.5 (Project Management)** - Update to use configId:
   ```typescript
   await this.pmTicketService.createTickets({
     configId: config.projectManagementConfigId,
     tickets: [...]
   });
   ```

3. **Step 6.6 (Test Management)** - Update to use configId:
   ```typescript
   await this.testRunService.createTestRuns({
     testManagementConfigId: config.testManagementConfigId,
     platforms: [...]
   });
   ```

4. **Step 6.7 (Notifications)** - Update to use channelConfigId:
   ```typescript
   await this.notificationService.sendMessage({
     channelConfigId: config.commsConfigId,
     message: { ... }
   });
   ```

---

## Conclusion

**YES, tenantId IS required** - it's a critical security parameter that prevents cross-tenant attacks.

**Pattern**:
- **SCM**: Uses `tenantId` directly
- **CI/CD**: Uses `tenantId` + `workflowId` (both required for validation)
- **Others**: Use `configId` (service validates tenant ownership via lookup chain)

**Next Step**: Update MERGE_PLAN.md Phase 6 with correct service signatures before proceeding with merge.

---

**Document Status**: Complete  
**Impact**: Phase 6 implementation needs signature updates  
**Risk Level**: Low (just parameter structure changes)  
**Estimated Additional Time**: +10 minutes (for Phase 6 signature updates)

