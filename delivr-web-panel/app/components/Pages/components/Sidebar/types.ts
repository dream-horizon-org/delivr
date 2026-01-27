/**
 * App entity (renamed from Organization)
 */
export type App = {
  id: string;
  name: string;
  displayName: string;
  isAdmin: boolean;
  role?: string;
};

/**
 * Organization type (legacy - kept for backward compatibility)
 * @deprecated Use App instead
 */
export type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
};

export type SidebarProps = {
  organizations: App[] | Organization[]; // Accept both for backward compatibility
  currentOrgId?: string;
  currentAppId?: string;
  userEmail: string;
};

