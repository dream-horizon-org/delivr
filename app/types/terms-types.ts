import type { ReactNode } from 'react';
import type { OwnerTermsStatusResponse } from '~/.server/services/Codepush/types';

// Configuration types
export type TermsCheckTrigger = 'mount' | 'manual' | 'route-change';

export interface TermsTriggerConditions {
  requireOwner?: boolean;
  requireAcceptance?: boolean;
  requireCurrentVersion?: boolean;
  customCondition?: (status: OwnerTermsStatusResponse) => boolean;
}

export interface TermsCheckActions {
  checkTerms: () => void;
  acceptTerms: (version: string) => Promise<void>;
  dismissModal: () => void;
}

// Utility types
export type TermsConditionChecker = (
  status: OwnerTermsStatusResponse,
  conditions: TermsTriggerConditions
) => boolean;

export type TermsEventHandler = (status: OwnerTermsStatusResponse) => void;

// Error types
export interface TermsError extends Error {
  code?: string;
  details?: unknown;
}
