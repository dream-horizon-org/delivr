/**
 * Simple Permission Hook
 * 
 * Reuses existing useGetAppList() data - no duplicate API calls!
 * React Query handles all caching automatically.
 */

import { useGetAppList } from '~/components/Pages/components/OrgListNavbar/hooks/useGetAppList';
import {
  isAppOwner,
  isAppEditor,
  isReleasePilot,
  canPerformReleaseAction,
  // Legacy functions for backward compatibility
  isTenantOwner,
  isTenantEditor,
} from '~/utils/permissions';
import { TenantRole, type TenantRoleType } from '~/constants/permissions';

export function usePermissions(appId: string | undefined, userId: string) {
  // Reuse existing app list - already cached by React Query!
  const { data: apps = [], isLoading } = useGetAppList();

  return {
    isLoading,
    role: appId ? (apps.find((a) => a.id === appId)?.role ?? null) : null as TenantRoleType,
    isOwner: appId ? isAppOwner(apps, appId) : false,
    isEditor: appId ? isAppEditor(apps, appId) : false,
    
    // Release checks
    isReleasePilot: (releasePilotAccountId: string | null) =>
      isReleasePilot(releasePilotAccountId, userId),
    
    canPerformReleaseAction: (releasePilotAccountId: string | null) => {
      if (!appId) return false;
      return canPerformReleaseAction(apps, appId, userId, releasePilotAccountId);
    },
  };
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use usePermissions with appId instead
 */
export function usePermissionsLegacy(appId: string | undefined, userId: string) {
  return usePermissions(appId, userId);
}
