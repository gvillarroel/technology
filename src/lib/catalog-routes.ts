import {
  getDataset,
  getSiteRoutes,
  type SiteRouteDefinition,
} from "./site-catalog";

export interface CatalogRouteItem {
  title: string;
  summary: string;
  eyebrow: string;
  tags: string[];
  link: string;
  linkLabel: string;
  metadata: Array<{ label: string; value: string }>;
  searchText: string;
}

export interface ResolvedCatalogRoute {
  route: SiteRouteDefinition;
  items: CatalogRouteItem[];
}

function toText(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).join(", ")
    : String(value ?? "").trim();
}

function toList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value ?? "").split("|").map((item) => item.trim()).filter(Boolean);
}

export async function getCatalogRouteDefinitions() {
  return (await getSiteRoutes()).filter((route) => route.template === "catalog");
}

export function getRouteParameter(route: SiteRouteDefinition) {
  return route.path.replace(/^\/+|\/+$/g, "");
}

export async function resolveCatalogRoute(route: SiteRouteDefinition): Promise<ResolvedCatalogRoute> {
  if (!route.dataset || !route.catalog || !route.intro || !route.source) {
    throw new Error(`Catalog route "${route.id}" is missing dataset, catalog, intro, or source configuration.`);
  }

  const dataset = await getDataset<Record<string, unknown>>(route.dataset);
  const rawItems = dataset[route.catalog.collection];

  if (!Array.isArray(rawItems)) {
    throw new Error(
      `Catalog route "${route.id}" expected an array at datasets.${route.dataset}.${route.catalog.collection}.`,
    );
  }

  const items = rawItems.map((rawItem) => {
    const item = rawItem as Record<string, unknown>;
    const title = toText(item[route.catalog!.titleField]);
    const summary = toText(item[route.catalog!.summaryField]);
    const eyebrow = route.catalog!.eyebrowField ? toText(item[route.catalog!.eyebrowField]) : "Catalog";
    const tags = route.catalog!.tagsField ? toList(item[route.catalog!.tagsField]) : [];
    const link = route.catalog!.linkField ? toText(item[route.catalog!.linkField]) : "";
    const linkLabel = route.catalog!.linkLabelField
      ? toText(item[route.catalog!.linkLabelField]) || "Open"
      : "Open";
    const metadata = (route.catalog!.metadata ?? [])
      .map((field) => ({ label: field.label, value: toText(item[field.field]) }))
      .filter((field) => field.value);

    return {
      title,
      summary,
      eyebrow,
      tags,
      link,
      linkLabel,
      metadata,
      searchText: [title, summary, eyebrow, ...tags, ...metadata.map((field) => field.value)]
        .join(" ")
        .toLowerCase(),
    };
  });

  return { route, items };
}
