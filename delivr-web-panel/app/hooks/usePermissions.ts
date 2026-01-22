/**
 * Simple Permission Hook
 * 
 * Reuses existing useGetOrgList() data - no duplicate API calls!
 * React Query handles all caching automatically.
 */

import { useGetOrgList } from '~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList';
import {
  isTenantOwner,
  isTenantEditor,
  isReleasePilot,
  canPerformReleaseAction,
} from '~/utils/permissions';
import { TenantRole, type TenantRoleType } from '~/constants/permissions';

export function usePermissions(tenantId: string | undefined, userId: string) {
  // Reuse existing org list - already cached by React Query!
  const { data: orgs = [], isLoading } = useGetOrgList();

  return {
    isLoading,
    role: tenantId ? (orgs.find((o) => o.id === tenantId)?.role ?? null) : null as TenantRoleType,
    isOwner: tenantId ? isTenantOwner(orgs, tenantId) : false,
    isEditor: tenantId ? isTenantEditor(orgs, tenantId) : false,
    
    // Release checks
    isReleasePilot: (releasePilotAccountId: string | null) =>
      isReleasePilot(releasePilotAccountId, userId),
    
    canPerformReleaseAction: (releasePilotAccountId: string | null) => {
      if (!tenantId) return false;
      return canPerformReleaseAction(orgs, tenantId, userId, releasePilotAccountId);
    },
  };
}

