import {
  IconAdjustmentsHorizontal,
  IconApps,
  IconCloud,
  IconGitBranch,
  IconList,
  IconPlug,
  IconRocket,
  IconSend,
  IconUsers,
} from "@tabler/icons-react";
import type { Organization } from "./types";

export type SubItem = {
  label: string;
  icon: any;
  path: string;
  prefetch?: "intent" | "render" | "none";
  isOwnerOnly?: boolean;
  isEditorOnly?: boolean;
};

export type ModuleConfig = {
  id: string;
  label: string;
  icon: any;
  mainRoute: string;
  prefetch?: "intent" | "render" | "none";
  subItems: SubItem[];
  isCustomRender?: boolean;
};

export function getNavigationModules(org: Organization): ModuleConfig[] {
  return [
    {
      id: "releaseManagement",
      label: "Release Management",
      icon: IconRocket,
      mainRoute: `/dashboard/${org.id}/releases`,
      prefetch: "render",
      subItems: [
        {
          label: "Releases",
          icon: IconList,
          path: `/dashboard/${org.id}/releases/`,
          prefetch: "render",
        },
        {
          label: "Distributions",
          icon: IconSend,
          path: `/dashboard/${org.id}/distributions`,
          prefetch: "intent",
        },
        {
          label: "Configurations",
          icon: IconAdjustmentsHorizontal,
          path: `/dashboard/${org.id}/releases/settings`,
          prefetch: "intent",
          isEditorOnly: true,
        },
        {
          label: "Workflows",
          icon: IconGitBranch,
          path: `/dashboard/${org.id}/releases/workflows`,
          prefetch: "intent",
          isEditorOnly: true,
        },
      ],
    },
    {
      id: "dota",
      label: "DOTA (Over-The-Air)",
      icon: IconCloud,
      mainRoute: `/dashboard/${org.id}/apps`,
      prefetch: "render",
      subItems: [
        {
          label: "Applications",
          icon: IconApps,
          path: `/dashboard/${org.id}/apps`,
          prefetch: "render",
        },
      ],
      isCustomRender: true,
    },
  ];
}

export function getOrganizationRoutes(org: Organization): SubItem[] {
  return [
    {
      label: "Integrations",
      icon: IconPlug,
      path: `/dashboard/${org.id}/integrations`,
      prefetch: "intent",
      isOwnerOnly: true,
    },
    {
      label: "Manage Team",
      icon: IconUsers,
      path: `/dashboard/${org.id}/manage`,
      isOwnerOnly: true,
    },
  ];
}

