import { withBasePath } from "./site-url";

export type StandardPageKey =
  | "home"
  | "tech-radar"
  | "cloud-enablement"
  | "models"
  | "ai-sdlc"
  | "adrs"
  | "communities"
  | "documents";

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

const standardPageNavConfig: Record<StandardPageKey, Omit<StandardNavItem, "current">> = {
  home: { href: withBasePath("/"), label: "Home" },
  "tech-radar": { href: withBasePath("/tech-radar/"), label: "Tech Radar" },
  "cloud-enablement": {
    href: withBasePath("/cloud-enablement/"),
    label: "Cloud Enablement",
    compactLabel: "Cloud",
  },
  models: {
    href: withBasePath("/models/"),
    label: "Models",
  },
  "ai-sdlc": {
    href: withBasePath("/ai-sdlc/"),
    label: "AI SDLC",
  },
  adrs: {
    href: withBasePath("/adrs/"),
    label: "ADRs",
  },
  communities: { href: withBasePath("/communities/"), label: "Communities" },
  documents: { href: withBasePath("/documents/"), label: "Documentation", compactLabel: "Docs" },
};

function getStandardPageNavItem(key: StandardPageKey, currentPage?: StandardPageKey): StandardNavItem {
  return {
    ...standardPageNavConfig[key],
    current: key === currentPage,
  };
}

export function getStandardPageNavGroups(currentPage?: StandardPageKey): StandardNavGroup[] {
  const groups: Array<Omit<StandardNavGroup, "current" | "items"> & { pageKeys: StandardPageKey[] }> = [
    {
      id: "platform",
      label: "Platform",
      compactLabel: "Platform",
      pageKeys: ["tech-radar", "cloud-enablement", "models"],
    },
    {
      id: "practice",
      label: "Practice",
      compactLabel: "Practice",
      pageKeys: ["ai-sdlc", "adrs", "communities"],
    },
    {
      id: "documentation",
      label: "Documentation",
      compactLabel: "Docs",
      pageKeys: ["documents"],
    },
  ];

  return groups.map((group) => {
    const items = group.pageKeys.map((key) => getStandardPageNavItem(key, currentPage));

    return {
      id: group.id,
      label: group.label,
      compactLabel: group.compactLabel,
      current: items.some((item) => item.current),
      items,
    };
  });
}
