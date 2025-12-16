export type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
};

export type CombinedSidebarProps = {
  organizations: Organization[];
  currentOrgId?: string;
  currentAppId?: string;
  userEmail: string;
};



