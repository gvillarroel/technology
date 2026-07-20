import { readSourceJson } from "./connectors";

export type RouteTemplate =
  | "home"
  | "radar"
  | "cloud-catalog"
  | "model-catalog"
  | "ai-sdlc"
  | "repository-index"
  | "catalog"
  | "document-library";

export interface CatalogFieldDefinition {
  label: string;
  field: string;
}

export interface CatalogTemplateDefinition {
  collection: string;
  titleField: string;
  summaryField: string;
  eyebrowField?: string;
  tagsField?: string;
  linkField?: string;
  linkLabelField?: string;
  metadata?: CatalogFieldDefinition[];
}

export interface SiteRouteDefinition {
  id: string;
  path: string;
  label: string;
  compactLabel?: string;
  group?: string;
  template: RouteTemplate;
  dataset?: string;
  navigation?: boolean;
  intro?: {
    eyebrow: string;
    title: string;
    summary: string;
  };
  source?: {
    file: string;
    lang: string;
    title: string;
    summary: string;
  };
  catalog?: CatalogTemplateDefinition;
}

export interface SiteNavigationGroup {
  id: "platform" | "practice" | "documentation";
  label: string;
  compactLabel?: string;
}

interface SiteCatalog {
  schemaVersion: number;
  routes: SiteRouteDefinition[];
  navigationGroups: SiteNavigationGroup[];
  datasets: Record<string, unknown>;
}

export const siteCatalogUri =
  process.env.TECHNOLOGY_SITE_CATALOG_URI ??
  "gs://limited-502918-cheap-gcs/technology/site.json";

let siteCatalogPromise: Promise<SiteCatalog> | undefined;

export async function getSiteCatalog() {
  siteCatalogPromise ??= readSourceJson<SiteCatalog>(siteCatalogUri).then((catalog) => {
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.routes) || !catalog.datasets) {
      throw new Error(`Invalid technology site catalog at ${siteCatalogUri}`);
    }

    return catalog;
  });

  return siteCatalogPromise;
}

export async function getDataset<T>(datasetId: string): Promise<T> {
  const catalog = await getSiteCatalog();

  if (!(datasetId in catalog.datasets)) {
    throw new Error(`Dataset "${datasetId}" is not defined in ${siteCatalogUri}`);
  }

  return catalog.datasets[datasetId] as T;
}

export async function getSiteRoutes() {
  return (await getSiteCatalog()).routes;
}

export async function getSiteRoute(routeId: string) {
  const route = (await getSiteRoutes()).find((candidate) => candidate.id === routeId);

  if (!route) {
    throw new Error(`Route "${routeId}" is not defined in ${siteCatalogUri}`);
  }

  return route;
}

export async function getNavigationGroups() {
  return (await getSiteCatalog()).navigationGroups;
}
