/**
 * App-related type definitions
 * Separated for type safety and reusability
 */

import type { AppPlatformTargetAttributes } from './app-platform-target.types';

export interface AppAttributes {
  id: string;
  name: string;
  organizationId: string | null;
  displayName?: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppRequest {
  name: string;
  displayName?: string;
  description?: string;
  organizationId: string;
}

export interface UpdateAppRequest {
  name?: string;
  displayName?: string;
  description?: string;
}

export interface AppWithPlatformTargets extends AppAttributes {
  platformTargets?: AppPlatformTargetAttributes[];
}
