export type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
};

export type SidebarProps = {
  organizations: Organization[];
  currentOrgId?: string;
  currentAppId?: string;
  userEmail: string;
};

