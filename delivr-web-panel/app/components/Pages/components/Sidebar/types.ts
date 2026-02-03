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


export type SidebarProps = {
  organizations: App[];
  currentOrgId?: string;
  currentAppId?: string;
  userEmail: string;
};

