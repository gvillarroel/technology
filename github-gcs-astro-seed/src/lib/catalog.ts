import { readSourceJson } from "./connectors";

export interface CatalogRoute {
  id: string;
  path: string;
  label: string;
  template: "catalog";
  dataset: string;
  intro: {
    eyebrow?: string;
    title: string;
    summary: string;
  };
  view: {
    collection?: string;
    titleField: string;
    summaryField: string;
    tagsField?: string;
    urlField?: string;
  };
}

interface DatasetReference {
  $source: string;
  $fallback?: string;
}

interface SiteCatalog {
  schemaVersion: 1;
  site: {
    title: string;
    description: string;
  };
  routes: CatalogRoute[];
  datasets: Record<string, unknown | DatasetReference>;
}

export interface CatalogItem {
  title: string;
  summary: string;
  tags: string[];
  url: string;
}

export interface ResolvedRoute {
  route: CatalogRoute;
  items: CatalogItem[];
}

let catalogPromise: Promise<SiteCatalog> | undefined;
const datasetCache = new Map<string, Promise<unknown>>();

function getCatalogUri() {
  const uri = process.env.SITE_CATALOG_URI || import.meta.env.SITE_CATALOG_URI;

  if (!uri) {
    throw new Error("SITE_CATALOG_URI is required and must point to a gs:// or https:// catalog.");
  }

  return uri;
}

function validateCatalog(value: SiteCatalog) {
  if (value.schemaVersion !== 1 || !value.site || !Array.isArray(value.routes) || !value.datasets) {
    throw new Error(`Invalid site catalog at ${getCatalogUri()}`);
  }

  const ids = new Set<string>();
  const paths = new Set<string>();

  for (const route of value.routes) {
    const validPath = route.path === "/" || /^\/(?:[a-z0-9][a-z0-9-]*\/)+$/.test(route.path);

    if (!route.id || !validPath || route.template !== "catalog" || !route.dataset || !route.view) {
      throw new Error(`Invalid route in ${getCatalogUri()}: ${JSON.stringify(route)}`);
    }

    if (ids.has(route.id) || paths.has(route.path)) {
      throw new Error(`Duplicate route id or path in ${getCatalogUri()}: ${route.id}`);
    }

    ids.add(route.id);
    paths.add(route.path);
  }

  if (!paths.has("/")) {
    throw new Error(`The catalog at ${getCatalogUri()} must define the root route "/".`);
  }

  return value;
}

export function getSiteCatalog() {
  catalogPromise ??= readSourceJson<SiteCatalog>(getCatalogUri()).then(validateCatalog);
  return catalogPromise;
}

export async function getRoutes() {
  return (await getSiteCatalog()).routes;
}

function isDatasetReference(value: unknown): value is DatasetReference {
  return Boolean(value && typeof value === "object" && typeof (value as DatasetReference).$source === "string");
}

async function getDataset(id: string) {
  const existing = datasetCache.get(id);

  if (existing) {
    return existing;
  }

  const request = getSiteCatalog().then(async (catalog) => {
    if (!(id in catalog.datasets)) {
      throw new Error(`Dataset "${id}" is not defined in ${getCatalogUri()}`);
    }

    const definition = catalog.datasets[id];

    if (!isDatasetReference(definition)) {
      return definition;
    }

    try {
      return await readSourceJson<unknown>(definition.$source);
    } catch (error) {
      if (!definition.$fallback) {
        throw error;
      }

      return readSourceJson<unknown>(definition.$fallback);
    }
  });

  datasetCache.set(id, request);
  return request;
}

function readField(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    return current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined;
  }, value);
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toTags(value: unknown) {
  return Array.isArray(value)
    ? value.map(toText).filter(Boolean)
    : toText(value).split("|").map((tag) => tag.trim()).filter(Boolean);
}

export async function resolveRoute(route: CatalogRoute): Promise<ResolvedRoute> {
  const dataset = await getDataset(route.dataset);
  const collection = route.view.collection ? readField(dataset, route.view.collection) : dataset;

  if (!Array.isArray(collection)) {
    throw new Error(`Route "${route.id}" expected dataset "${route.dataset}" to resolve to an array.`);
  }

  return {
    route,
    items: collection.map((item) => ({
      title: toText(readField(item, route.view.titleField)),
      summary: toText(readField(item, route.view.summaryField)),
      tags: route.view.tagsField ? toTags(readField(item, route.view.tagsField)) : [],
      url: route.view.urlField ? toText(readField(item, route.view.urlField)) : "",
    })),
  };
}

export function routeParameter(path: string) {
  return path.replace(/^\/+|\/+$/g, "");
}
