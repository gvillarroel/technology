import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { getScopedHtmlPageUrl, getScopedMarkdownPageUrl } from "./dual-format";
import { withBasePath } from "./site-url";
import { createMarkdownDocument, markdownLink } from "./markdown";

export interface CloudEnablementProduct {
  slug: string;
  name: string;
  archetype: "Infrastructure" | "Tool" | "Product";
  category: string;
  summary: string;
  productUrl: string;
  featureSourceUrl: string;
  iamSourceUrl: string;
  featureCoverage: string;
  knownFeatures: string[];
  iamPermissions: CloudEnablementPermissionMapping[];
}

export interface CloudEnablementPermissionMapping {
  permission: string;
  includedInRoles: string[];
  approvedCompanyRoles: string[];
}

export interface CloudEnablementProvider {
  slug: string;
  name: string;
  shortName: string;
  priority: "primary" | "secondary";
  summary: string;
  officialInventoryLabel: string;
  officialInventoryUrl: string;
  documentationUrl: string;
  coverageStatus: string;
  updated: string;
  knownLimitations: string[];
  products: CloudEnablementProduct[];
}

export interface CloudEnablementEntry extends CloudEnablementProduct {
  providerSlug: string;
  providerName: string;
  providerShortName: string;
  providerPriority: CloudEnablementProvider["priority"];
  providerUpdated: string;
}

const cloudEnablementYamlPath = join(process.cwd(), "data", "cloud-enablement.yaml");
const cloudEnablementArchetypes = new Set<CloudEnablementProduct["archetype"]>([
  "Infrastructure",
  "Tool",
  "Product",
]);

function toScalar(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").trim();
}

function toList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toArchetype(value: unknown): CloudEnablementProduct["archetype"] {
  const normalized = toScalar(value) as CloudEnablementProduct["archetype"];
  return cloudEnablementArchetypes.has(normalized) ? normalized : "Product";
}

export async function getCloudEnablementProviders(): Promise<CloudEnablementProvider[]> {
  const rawFile = await readFile(cloudEnablementYamlPath, "utf-8");
  const document = parse(rawFile) as { providers?: Array<Record<string, unknown>> };
  const providers = document.providers ?? [];
  const toPriority = (value: unknown): CloudEnablementProvider["priority"] =>
    toScalar(value) === "secondary" ? "secondary" : "primary";

  return providers
    .map((provider) => ({
      slug: toScalar(provider.slug),
      name: toScalar(provider.name),
      shortName: toScalar(provider.short_name),
      priority: toPriority(provider.priority),
      summary: toScalar(provider.summary),
      officialInventoryLabel: toScalar(provider.official_inventory_label),
      officialInventoryUrl: toScalar(provider.official_inventory_url),
      documentationUrl: toScalar(provider.documentation_url),
      coverageStatus: toScalar(provider.coverage_status),
      updated: toScalar(provider.updated),
      knownLimitations: toList(provider.known_limitations),
      products: (Array.isArray(provider.products) ? provider.products : [])
        .map((product) => ({
          slug: toScalar(product.slug),
          name: toScalar(product.name),
          archetype: toArchetype(product.archetype),
          category: toScalar(product.category),
          summary: toScalar(product.summary),
          productUrl: toScalar(product.product_url),
          featureSourceUrl: toScalar(product.feature_source_url),
          iamSourceUrl: toScalar(product.iam_source_url),
          featureCoverage: toScalar(product.feature_coverage),
          knownFeatures: toList(product.known_features),
          iamPermissions: (Array.isArray(product.iam_permissions) ? product.iam_permissions : []).map((mapping: Record<string, unknown>) => ({
            permission: toScalar(mapping.permission),
            includedInRoles: toList(mapping.included_in_roles),
            approvedCompanyRoles: toList(mapping.approved_company_roles),
          })),
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority === "primary" ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
}

export async function getCloudEnablementEntries(): Promise<CloudEnablementEntry[]> {
  const providers = await getCloudEnablementProviders();

  return providers.flatMap((provider) =>
    provider.products.map((product) => ({
      ...product,
      providerSlug: provider.slug,
      providerName: provider.name,
      providerShortName: provider.shortName,
      providerPriority: provider.priority,
      providerUpdated: provider.updated,
    })),
  );
}

export async function getCloudEnablementArchetypes(): Promise<CloudEnablementProduct["archetype"][]> {
  const entries = await getCloudEnablementEntries();
  return [...new Set(entries.map((entry) => entry.archetype))];
}

export async function getCloudEnablementEntryBySlug(providerSlug: string, slug: string) {
  const entries = await getCloudEnablementEntries();
  return entries.find((entry) => entry.providerSlug === providerSlug && entry.slug === slug);
}

export function getCloudEnablementDetailHtmlUrl(providerSlug: string, slug: string) {
  return getScopedHtmlPageUrl(`/cloud-enablement/${providerSlug}`, slug);
}

export function getCloudEnablementDetailMarkdownUrl(providerSlug: string, slug: string) {
  return getScopedMarkdownPageUrl(`/cloud-enablement/${providerSlug}`, slug);
}

export function getCloudEnablementIndexMarkdown(providers: CloudEnablementProvider[]) {
  const doc = createMarkdownDocument({
    title: "Cloud Enablement",
    description: "Google Cloud and AWS enablement inventory with seeded products and known features.",
    canonicalHtml: withBasePath("/cloud-enablement/"),
  });

  doc.heading("Cloud Enablement");
  doc.paragraph("Operational inventory for Google Cloud and AWS products, source links, and seeded known features.");

  for (const provider of providers) {
    doc.section(provider.name, () => {
      doc.keyValueList([
        { label: "Priority", value: provider.priority },
        { label: "Coverage", value: provider.coverageStatus },
        { label: "Official inventory", value: markdownLink(provider.officialInventoryLabel, provider.officialInventoryUrl) },
        { label: "Documentation hub", value: markdownLink("Reference", provider.documentationUrl) },
        { label: "Updated", value: provider.updated },
      ]);
      doc.subheading("Products", 3);
    });

    for (const product of provider.products) {
      doc.bullet(markdownLink(product.name, getCloudEnablementDetailMarkdownUrl(provider.slug, product.slug)));
      doc.keyValueList([
        { label: "Archetype", value: product.archetype },
        { label: "Category", value: product.category },
        { label: "Feature coverage", value: product.featureCoverage },
        { label: "Summary", value: product.summary },
        { label: "Product page", value: product.productUrl },
        { label: "Feature source", value: product.featureSourceUrl },
      ], 1);
      if (product.iamSourceUrl) {
        doc.bullet(`IAM source: ${product.iamSourceUrl}`, 1);
      }
      if (product.knownFeatures.length > 0) {
        doc.bullet(`Known features: ${product.knownFeatures.join(", ")}`, 1);
        doc.blank();
      }
    }
  }

  doc.paragraph(markdownLink("Back to home", withBasePath("/index.md")));

  return doc.finish();
}

export function getCloudEnablementProductMarkdown(
  provider: Pick<CloudEnablementProvider, "slug" | "name" | "shortName">,
  product: Pick<
    CloudEnablementProduct,
    | "name"
    | "summary"
    | "productUrl"
    | "featureSourceUrl"
    | "iamSourceUrl"
    | "knownFeatures"
    | "iamPermissions"
    | "archetype"
    | "category"
    | "featureCoverage"
  > & { slug?: string },
) {
  const doc = createMarkdownDocument({
    title: `${provider.shortName} ${product.name}`,
    description: product.summary,
    canonicalHtml:
      product.slug
        ? getCloudEnablementDetailHtmlUrl(provider.slug, product.slug)
        : `/cloud-enablement/?provider=${provider.slug}&q=${encodeURIComponent(product.name)}`,
  });

  doc.heading(`${provider.name} / ${product.name}`);
  doc.paragraph(product.summary);
  doc.section("Classification", () => {
    doc.keyValueList([
      { label: "Provider", value: provider.name },
      { label: "Archetype", value: product.archetype },
      { label: "Category", value: product.category },
      { label: "Feature coverage", value: product.featureCoverage },
    ]);
  });
  doc.section("Official sources", () => {
    doc.keyValueList([
      { label: "Product page", value: markdownLink("Open", product.productUrl) },
      { label: "Feature source", value: markdownLink("Open", product.featureSourceUrl) },
      ...(product.iamSourceUrl ? [{ label: "IAM source", value: markdownLink("Open", product.iamSourceUrl) }] : []),
    ]);
  });
  doc.section("Known features", () => doc.bullets(product.knownFeatures));

  if (product.iamPermissions.length > 0) {
    doc.section("IAM access mapping", () => {
      for (const mapping of product.iamPermissions) {
        doc.bullet(`Permission: ${mapping.permission}`);
        doc.keyValueList([
          { label: "Included in roles", value: mapping.includedInRoles.join(", ") || "None listed" },
          { label: "Approved company roles", value: mapping.approvedCompanyRoles.join(", ") || "None mapped yet" },
        ], 1);
      }
    });
  }

  doc.paragraph(
    markdownLink(
      "Back to cloud enablement",
      withBasePath(`/cloud-enablement.md?q=${encodeURIComponent(product.name)}&provider=${provider.slug}`),
    ),
  );

  return doc.finish({ trailingNewline: false });
}
