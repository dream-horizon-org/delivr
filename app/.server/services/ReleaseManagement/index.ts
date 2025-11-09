// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Release Management Service
 * Mock implementation for frontend development
 * TODO: Replace with actual backend API calls
 */

import {
  Release,
  ReleasesResponse,
  ReleaseDetailsResponse,
  CreateReleaseRequest,
  UpdateReleaseRequest,
  CreateBuildRequest,
  CreateCherryPickRequest,
  ApproveCherryPickRequest,
  TriggerBuildRequest,
  IntegrationsResponse,
  ReleaseCyclesResponse,
  TenantIntegration,
  Build,
  ReleaseTask,
  CherryPick
} from './types';

import {
  mockReleases,
  mockBuilds,
  mockTasks,
  mockCherryPicks,
  mockAnalytics,
  mockIntegrations,
  mockReleaseCycles
} from './mockData';

class ReleaseManagementService {
  private baseDelay = 500; // Simulate network delay

  private delay() {
    return new Promise(resolve => setTimeout(resolve, this.baseDelay));
  }

  // ============================================================================
  // RELEASES
  // ============================================================================

  async getReleases(
    tenantId: string,
    page = 1,
    pageSize = 20,
    filters?: {
      status?: string;
      type?: string;
      search?: string;
    }
  ): Promise<ReleasesResponse> {
    await this.delay();

    let filtered = mockReleases.filter(r => r.tenantId === tenantId);

    if (filters?.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters?.type) {
      filtered = filtered.filter(r => r.type === filters.type);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        r => r.releaseKey.toLowerCase().includes(search) ||
             r.version.toLowerCase().includes(search)
      );
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = filtered.slice(start, end);

    return {
      releases: paginated,
      total: filtered.length,
      page,
      pageSize
    };
  }

  async getReleaseDetails(releaseId: string): Promise<ReleaseDetailsResponse> {
    await this.delay();

    const release = mockReleases.find(r => r.id === releaseId);
    
    if (!release) {
      throw new Error('Release not found');
    }

    const builds = mockBuilds.filter(b => b.releaseId === releaseId);
    const tasks = mockTasks.filter(t => t.releaseId === releaseId);
    const cherryPicks = mockCherryPicks.filter(cp => cp.releaseId === releaseId);

    return {
      release,
      builds,
      tasks,
      cherryPicks,
      analytics: mockAnalytics
    };
  }

  async createRelease(request: CreateReleaseRequest): Promise<Release> {
    await this.delay();

    const newRelease: Release = {
      id: `rel_${Date.now()}`,
      tenantId: request.tenantId,
      releaseKey: `R-${new Date().getFullYear()}-${String(mockReleases.length + 1).padStart(2, '0')}`,
      version: request.version,
      type: request.type,
      status: 'PENDING',
      updateType: request.updateType || 'OPTIONAL',
      baseVersion: request.baseVersion,
      baseBranch: request.baseBranch,
      branchRelease: `release/${request.version}`,
      plannedDate: request.plannedDate,
      targetReleaseDate: request.targetReleaseDate,
      kickOffReminderDate: request.kickOffReminderDate,
      isDelayed: false,
      releasePilot: {
        id: request.releasePilotId,
        name: 'Release Pilot',
        email: 'pilot@example.com'
      },
      createdBy: {
        id: 'current_user',
        name: 'Current User',
        email: 'user@example.com'
      },
      lastUpdatedBy: {
        id: 'current_user',
        name: 'Current User',
        email: 'user@example.com'
      },
      parentId: request.parentId,
      userAdoption: {
        ios: 0,
        android: 0,
        web: 0
      },
      autoPilot: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In real implementation, this would be saved to backend
    mockReleases.unshift(newRelease);

    return newRelease;
  }

  async updateRelease(releaseId: string, request: UpdateReleaseRequest): Promise<Release> {
    await this.delay();

    const release = mockReleases.find(r => r.id === releaseId);
    
    if (!release) {
      throw new Error('Release not found');
    }

    // Update release
    Object.assign(release, request, {
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: {
        id: 'current_user',
        name: 'Current User',
        email: 'user@example.com'
      }
    });

    return release;
  }

  async deleteRelease(releaseId: string): Promise<void> {
    await this.delay();

    const index = mockReleases.findIndex(r => r.id === releaseId);
    
    if (index === -1) {
      throw new Error('Release not found');
    }

    mockReleases.splice(index, 1);
  }

  // ============================================================================
  // BUILDS
  // ============================================================================

  async createBuild(request: CreateBuildRequest): Promise<Build> {
    await this.delay();

    const newBuild: Build = {
      id: `build_${Date.now()}`,
      releaseId: request.releaseId,
      platform: request.platform,
      target: request.target,
      buildNumber: request.buildNumber,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    mockBuilds.push(newBuild);

    return newBuild;
  }

  async triggerBuild(request: TriggerBuildRequest): Promise<Build> {
    await this.delay();

    const newBuild: Build = {
      id: `build_${Date.now()}`,
      releaseId: request.releaseId,
      platform: request.platform,
      target: request.target,
      buildNumber: 'auto-generated',
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    mockBuilds.push(newBuild);

    return newBuild;
  }

  // ============================================================================
  // CHERRY PICKS
  // ============================================================================

  async createCherryPick(request: CreateCherryPickRequest): Promise<CherryPick> {
    await this.delay();

    const newCherryPick: CherryPick = {
      id: `cp_${Date.now()}`,
      releaseId: request.releaseId,
      commitId: request.commitId,
      prLink: request.prLink,
      jiraLink: request.jiraLink,
      status: 'PENDING',
      isApprovalRequired: request.isApprovalRequired,
      author: {
        id: 'current_user',
        name: 'Current User',
        email: 'user@example.com'
      },
      approvalStatus: 'REQUESTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockCherryPicks.push(newCherryPick);

    return newCherryPick;
  }

  async approveCherryPick(request: ApproveCherryPickRequest): Promise<CherryPick> {
    await this.delay();

    const cherryPick = mockCherryPicks.find(cp => cp.id === request.cherryPickId);
    
    if (!cherryPick) {
      throw new Error('Cherry pick not found');
    }

    cherryPick.approvalStatus = request.approved ? 'APPROVED' : 'REJECTED';
    cherryPick.status = request.approved ? 'APPROVED' : 'REJECTED';
    cherryPick.approver = {
      id: 'current_user',
      name: 'Current User',
      email: 'user@example.com'
    };
    cherryPick.updatedAt = new Date().toISOString();

    return cherryPick;
  }

  // ============================================================================
  // INTEGRATIONS
  // ============================================================================

  async getTenantIntegrations(tenantId: string): Promise<IntegrationsResponse> {
    await this.delay();

    const integrations = mockIntegrations.filter(i => i.tenantId === tenantId);

    return {
      integrations
    };
  }

  async createIntegration(tenantId: string, integration: Partial<TenantIntegration>): Promise<TenantIntegration> {
    await this.delay();

    const newIntegration: TenantIntegration = {
      id: `int_${Date.now()}`,
      tenantId,
      integrationType: integration.integrationType!,
      isEnabled: integration.isEnabled ?? false,
      isRequired: integration.isRequired ?? false,
      config: integration.config || {},
      verificationStatus: 'NOT_VERIFIED',
      configuredBy: {
        id: 'current_user',
        name: 'Current User',
        email: 'user@example.com'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockIntegrations.push(newIntegration);

    return newIntegration;
  }

  async updateIntegration(integrationId: string, updates: Partial<TenantIntegration>): Promise<TenantIntegration> {
    await this.delay();

    const integration = mockIntegrations.find(i => i.id === integrationId);
    
    if (!integration) {
      throw new Error('Integration not found');
    }

    Object.assign(integration, updates, {
      updatedAt: new Date().toISOString()
    });

    return integration;
  }

  async verifyIntegration(integrationId: string): Promise<{ valid: boolean; message: string }> {
    await this.delay();

    const integration = mockIntegrations.find(i => i.id === integrationId);
    
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Simulate verification
    integration.verificationStatus = 'VALID';
    integration.lastVerifiedAt = new Date().toISOString();

    return {
      valid: true,
      message: 'Integration verified successfully'
    };
  }

  // ============================================================================
  // RELEASE CYCLES
  // ============================================================================

  async getReleaseCycles(tenantId: string): Promise<ReleaseCyclesResponse> {
    await this.delay();

    const cycles = mockReleaseCycles.filter(c => c.tenantId === tenantId);

    return {
      cycles
    };
  }

  async createReleaseCycle(tenantId: string, cycle: any): Promise<any> {
    await this.delay();

    const newCycle = {
      id: `cycle_${Date.now()}`,
      tenantId,
      ...cycle,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockReleaseCycles.push(newCycle);

    return newCycle;
  }

  // ============================================================================
  // TASKS
  // ============================================================================

  async updateTask(taskId: string, updates: Partial<ReleaseTask>): Promise<ReleaseTask> {
    await this.delay();

    const task = mockTasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    Object.assign(task, updates, {
      updatedAt: new Date().toISOString()
    });

    return task;
  }

  async triggerTask(taskId: string): Promise<ReleaseTask> {
    await this.delay();

    const task = mockTasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = 'IN_PROGRESS';
    task.updatedAt = new Date().toISOString();

    return task;
  }
}

const releaseManagementService = new ReleaseManagementService();

// Export named functions for convenience (using arrow functions to maintain context)
export const getReleases = (...args: Parameters<ReleaseManagementService['getReleases']>) => 
  releaseManagementService.getReleases(...args);

export const getReleaseDetails = (...args: Parameters<ReleaseManagementService['getReleaseDetails']>) => 
  releaseManagementService.getReleaseDetails(...args);

export const createRelease = (...args: Parameters<ReleaseManagementService['createRelease']>) => 
  releaseManagementService.createRelease(...args);

export const updateRelease = (...args: Parameters<ReleaseManagementService['updateRelease']>) => 
  releaseManagementService.updateRelease(...args);

export const deleteRelease = (...args: Parameters<ReleaseManagementService['deleteRelease']>) => 
  releaseManagementService.deleteRelease(...args);

export const createBuild = (...args: Parameters<ReleaseManagementService['createBuild']>) => 
  releaseManagementService.createBuild(...args);

export const triggerBuild = (...args: Parameters<ReleaseManagementService['triggerBuild']>) => 
  releaseManagementService.triggerBuild(...args);

export const createCherryPick = (...args: Parameters<ReleaseManagementService['createCherryPick']>) => 
  releaseManagementService.createCherryPick(...args);

export const approveCherryPick = (...args: Parameters<ReleaseManagementService['approveCherryPick']>) => 
  releaseManagementService.approveCherryPick(...args);

export const getTenantIntegrations = (...args: Parameters<ReleaseManagementService['getTenantIntegrations']>) => 
  releaseManagementService.getTenantIntegrations(...args);

export const createIntegration = (...args: Parameters<ReleaseManagementService['createIntegration']>) => 
  releaseManagementService.createIntegration(...args);

export const updateIntegration = (...args: Parameters<ReleaseManagementService['updateIntegration']>) => 
  releaseManagementService.updateIntegration(...args);

export const getReleaseCycles = (...args: Parameters<ReleaseManagementService['getReleaseCycles']>) => 
  releaseManagementService.getReleaseCycles(...args);

export const createReleaseCycle = (...args: Parameters<ReleaseManagementService['createReleaseCycle']>) => 
  releaseManagementService.createReleaseCycle(...args);

export const updateTask = (...args: Parameters<ReleaseManagementService['updateTask']>) => 
  releaseManagementService.updateTask(...args);

export const triggerTask = (...args: Parameters<ReleaseManagementService['triggerTask']>) => 
  releaseManagementService.triggerTask(...args);

export default releaseManagementService;

