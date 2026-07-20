import { getSourceFormat, readSourceData, readSourceJson, type SourceFormat } from "./connectors";

export interface CatalogRoute {
  id: string;
  path: string;
  label: string;
  template: "catalog";
  data: {
    source: string;
    fallback?: string;
  };
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

interface SiteCatalog {
  schemaVersion: 2;
  site: {
    title: string;
    description: string;
  };
  routes: CatalogRoute[];
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
  dataFormat: SourceFormat;
}

let catalogPromise: Promise<SiteCatalog> | undefined;
const routeDataCache = new Map<string, Promise<{ value: unknown; uri: string }>>();

function getCatalogUri() {
  const uri = process.env.SITE_CATALOG_URI || import.meta.env.SITE_CATALOG_URI;

  if (!uri) {
    throw new Error("SITE_CATALOG_URI is required and must point to a gs:// or https:// catalog.");
  }

  return uri;
}

function validateCatalog(value: SiteCatalog) {
  if (value.schemaVersion !== 2 || !value.site || !Array.isArray(value.routes)) {
    throw new Error(`Invalid site catalog at ${getCatalogUri()}`);
  }

  const ids = new Set<string>();
  const paths = new Set<string>();
  const sources = new Set<string>();

  for (const route of value.routes) {
    const validPath = route.path === "/" || /^\/(?:[a-z0-9][a-z0-9-]*\/)+$/.test(route.path);

    if (!route.id || !validPath || route.template !== "catalog" || !route.data?.source || !route.view) {
      throw new Error(`Invalid route in ${getCatalogUri()}: ${JSON.stringify(route)}`);
    }

    getSourceFormat(route.data.source);

    if (route.data.fallback) {
      getSourceFormat(route.data.fallback);

      if (!route.data.fallback.startsWith("gs://")) {
        throw new Error(`Route fallback must use gs:// in ${getCatalogUri()}: ${route.id}`);
      }
    }

    if (ids.has(route.id) || paths.has(route.path) || sources.has(route.data.source)) {
      throw new Error(`Duplicate route id, path, or page source in ${getCatalogUri()}: ${route.id}`);
    }

    ids.add(route.id);
    paths.add(route.path);
    sources.add(route.data.source);
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

async function getRouteData(route: CatalogRoute) {
  const existing = routeDataCache.get(route.id);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    try {
      return { value: await readSourceData(route.data.source), uri: route.data.source };
    } catch (error) {
      if (!route.data.fallback) {
        throw error;
      }

      return { value: await readSourceData(route.data.fallback), uri: route.data.fallback };
    }
  })();

  routeDataCache.set(route.id, request);
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
  const data = await getRouteData(route);
  const collection = route.view.collection ? readField(data.value, route.view.collection) : data.value;

  if (!Array.isArray(collection)) {
    throw new Error(`Route "${route.id}" expected ${data.uri} to resolve to an array.`);
  }

  return {
    route,
    dataFormat: getSourceFormat(data.uri),
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
