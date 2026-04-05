import { withBasePath } from "./site-url";

export type StandardPageKey = "home" | "tech-radar" | "cloud-enablement" | "ai-sdlc" | "communities";

export interface StandardNavItem {
  href: string;
  label: string;
  compactLabel?: string;
  current?: boolean;
}

const standardPageNavConfig: Record<StandardPageKey, Omit<StandardNavItem, "current">> = {
  home: { href: withBasePath("/"), label: "Home" },
  "tech-radar": { href: withBasePath("/tech-radar/"), label: "Tech Radar" },
  "cloud-enablement": {
    href: withBasePath("/cloud-enablement/"),
    label: "Cloud Enablement",
    compactLabel: "Cloud",
  },
  "ai-sdlc": {
    href: withBasePath("/ai-sdlc/"),
    label: "AI SDLC",
  },
  communities: { href: withBasePath("/communities/"), label: "Communities" },
};

export function getStandardPageNavItems(currentPage?: StandardPageKey) {
  return (Object.entries(standardPageNavConfig) as Array<[StandardPageKey, Omit<StandardNavItem, "current">]>)
    .map(([key, item]) => ({
      ...item,
      current: key === currentPage,
    }));
}
