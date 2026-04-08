import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { createMarkdownDocument, markdownLink } from "./markdown";
import { withBasePath } from "./site-url";

export type ModelFamilyStatus = "approved" | "explore" | "blacklisted";

export interface ModelCatalogSource {
  slug: string;
  name: string;
  provider: string;
  delivery: string;
  sourceUrl: string;
  pricingUrl: string;
}

export interface ModelFamily {
  slug: string;
  familyName: string;
  source: ModelCatalogSource;
  status: ModelFamilyStatus;
  regionsAvailable: string[];
  price: string;
  models: string[];
  notes: string[];
  sourceUrls: string[];
}

export interface ModelCatalogData {
  title: string;
  summary: string;
  updated: string;
  statuses: Record<ModelFamilyStatus, string>;
  sources: ModelCatalogSource[];
  families: ModelFamily[];
}

const modelsYamlPath = join(process.cwd(), "data", "models.yaml");
const allowedStatuses = new Set<ModelFamilyStatus>(["approved", "explore", "blacklisted"]);

function toScalar(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").trim();
}

function toList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => toScalar(item)).filter(Boolean);
  }

  return toScalar(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toStatus(value: unknown): ModelFamilyStatus {
  const normalized = toScalar(value).toLowerCase() as ModelFamilyStatus;
  return allowedStatuses.has(normalized) ? normalized : "explore";
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

export async function getModelCatalogData(): Promise<ModelCatalogData> {
  const rawFile = await readFile(modelsYamlPath, "utf-8");
  const document = parse(rawFile) as {
    catalog?: {
      title?: unknown;
      summary?: unknown;
      updated?: unknown;
      statuses?: Record<string, unknown>;
      sources?: Array<Record<string, unknown>>;
      families?: Array<Record<string, unknown>>;
    };
  };
  const catalog = document.catalog ?? {};
  const sources = (catalog.sources ?? []).map((source) => ({
    slug: toScalar(source.slug),
    name: toScalar(source.name),
    provider: toScalar(source.provider),
    delivery: toScalar(source.delivery),
    sourceUrl: toScalar(source.source_url),
    pricingUrl: toScalar(source.pricing_url),
  }));
  const sourcesBySlug = new Map(sources.map((source) => [source.slug, source]));
  const statuses: Record<ModelFamilyStatus, string> = {
    approved: toScalar(catalog.statuses?.approved) || "Approved for standard use.",
    explore: toScalar(catalog.statuses?.explore) || "Available for evaluation.",
    blacklisted: toScalar(catalog.statuses?.blacklisted) || "Not approved for production use.",
  };

  const families = (catalog.families ?? [])
    .map((family) => {
      const source = sourcesBySlug.get(toScalar(family.source));
      if (!source) {
        return null;
      }

      return {
        slug: toScalar(family.slug),
        familyName: toScalar(family.family_name),
        source,
        status: toStatus(family.status),
        regionsAvailable: toList(family.regions_available),
        price: toScalar(family.price),
        models: toList(family.models),
        notes: toList(family.notes),
        sourceUrls: toList(family.source_urls),
      } satisfies ModelFamily;
    })
    .filter((family): family is ModelFamily => Boolean(family))
    .sort((left, right) => left.familyName.localeCompare(right.familyName) || left.source.name.localeCompare(right.source.name));

  return {
    title: toScalar(catalog.title),
    summary: toScalar(catalog.summary),
    updated: toScalar(catalog.updated),
    statuses,
    sources,
    families,
  };
}

export function getModelsMarkdown(catalog: ModelCatalogData) {
  const doc = createMarkdownDocument({
    title: "AI model families",
    description: catalog.summary,
    canonicalHtml: withBasePath("/models/"),
  });

  doc.heading("AI model families");
  doc.paragraph(catalog.summary);
  doc.section("Catalog metadata", () => {
    doc.keyValueList([
      { label: "Updated", value: catalog.updated },
      { label: "Families", value: String(catalog.families.length) },
      { label: "Sources", value: String(catalog.sources.length) },
    ]);
  });
  doc.section("Status policy", () => {
    doc.keyValueList([
      { label: "Approved", value: catalog.statuses.approved },
      { label: "Explore", value: catalog.statuses.explore },
      { label: "Blacklisted", value: catalog.statuses.blacklisted },
    ]);
  });

  for (const family of catalog.families) {
    doc.section(`${family.familyName} / ${family.source.name}`, () => {
      doc.keyValueList([
        { label: "Provider", value: family.source.provider },
        { label: "Delivery", value: family.source.delivery },
        { label: "Status", value: toTitleCase(family.status) },
        { label: "Regions", value: family.regionsAvailable.join(", ") },
        { label: "Price", value: family.price },
      ]);
      doc.subheading("Listed models", 3);
      doc.bullets(family.models);
      doc.subheading("Notes", 3);
      doc.bullets(family.notes);
      doc.subheading("Sources", 3);
      doc.bullets([
        markdownLink("Catalog reference", family.source.sourceUrl),
        markdownLink("Pricing reference", family.source.pricingUrl),
        ...family.sourceUrls
          .filter((url) => url !== family.source.sourceUrl && url !== family.source.pricingUrl)
          .map((url, index) => markdownLink(`Additional source ${index + 1}`, url)),
      ]);
    });
  }

  doc.paragraph(markdownLink("Back to home", withBasePath("/index.md")));

  return doc.finish();
}
