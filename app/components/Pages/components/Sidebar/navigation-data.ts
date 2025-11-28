import {
  IconRocket,
  IconCloud,
  IconChartBar,
  IconList,
  IconPlug,
  IconAdjustmentsHorizontal,
  IconUsers,
} from "@tabler/icons-react";
import type { Organization } from "./types";

export type SubItem = {
  label: string;
  icon: any;
  path: string;
  prefetch?: "intent" | "render" | "none";
  isOwnerOnly?: boolean;
};

export type ModuleConfig = {
  id: string;
  label: string;
  icon: any;
  mainRoute: string;
  prefetch?: "intent" | "render" | "none";
  subItems: SubItem[];
  isCustomRender?: boolean; // For DOTA module with dynamic apps
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
          label: "Release Dashboard",
          icon: IconChartBar,
          path: `/dashboard/${org.id}/releases`,
          prefetch: "render",
        },
        {
          label: "Releases",
          icon: IconList,
          path: `/dashboard/${org.id}/releases/`,
          prefetch: "render",
        },
        {
          label: "Release Settings",
          icon: IconAdjustmentsHorizontal,
          path: `/dashboard/${org.id}/releases/settings`,
          prefetch: "intent",
          isOwnerOnly: true,
        },
        {
          label: "Integrations",
          icon: IconPlug,
          path: `/dashboard/${org.id}/integrations`,
          prefetch: "intent",
          isOwnerOnly: true,
        },
      ],
    },
    {
      id: "dota",
      label: "DOTA (Over-The-Air)",
      icon: IconCloud,
      mainRoute: `/dashboard/${org.id}/apps`,
      prefetch: "render",
      subItems: [], // DOTA uses custom render for dynamic apps
      isCustomRender: true,
    },
  ];
}

export function getOrganizationRoutes(org: Organization): SubItem[] {
  return [
    {
      label: "Manage Team",
      icon: IconUsers,
      path: `/dashboard/${org.id}/manage`,
      isOwnerOnly: true,
    },
  ];
}

