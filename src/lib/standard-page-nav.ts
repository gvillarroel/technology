import { getNavigationGroups, getSiteRoutes } from "./site-catalog";
import { withBasePath } from "./site-url";

export type StandardPageKey = string;

export interface StandardNavItem {
  href: string;
  label: string;
  compactLabel?: string;
  current?: boolean;
}

export interface StandardNavGroup {
  id: "platform" | "practice" | "documentation";
  label: string;
  compactLabel?: string;
  current?: boolean;
  items: StandardNavItem[];
}

export async function getStandardPageNavGroups(currentPage?: StandardPageKey): Promise<StandardNavGroup[]> {
  const [groups, routes] = await Promise.all([getNavigationGroups(), getSiteRoutes()]);

  return groups.map((group) => {
    const items = routes
      .filter((route) => route.navigation && route.group === group.id)
      .map((route) => ({
        href: withBasePath(route.path),
        label: route.label,
        compactLabel: route.compactLabel,
        current: route.id === currentPage,
      }));

    return {
      ...group,
      current: items.some((item) => item.current),
      items,
    };
  });
}
