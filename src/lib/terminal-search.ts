import { getScopedHtmlPageUrl, getScopedMarkdownPageUrl } from "./dual-format";
import {
  getCloudEnablementDetailHtmlUrl,
  getCloudEnablementDetailMarkdownUrl,
  getCloudEnablementProductMarkdown,
  getCloudEnablementProviders,
} from "./cloud-enablement";
import { getRadarEntries, getRadarEntryMarkdown } from "./tech-radar";
import { getTechCommunities } from "./tech-communities";
import { withBasePath } from "./site-url";

export interface TerminalSearchDocument {
  namespace: string;
  title: string;
  slug: string;
  summary: string;
  fileName: string;
  htmlUrl: string | null;
  markdownUrl: string | null;
  markdown: string;
  searchText: string;
}

export interface TerminalSearchNamespace {
  namespace: string;
  description: string;
  documents: TerminalSearchDocument[];
}

function normalizeSearchText(parts: string[]) {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getCommunityMarkdown(community: Awaited<ReturnType<typeof getTechCommunities>>[number]) {
  const lines = [
    "---",
    `title: ${community.name}`,
    `description: ${community.summary}`,
    `canonical_html: ${withBasePath(`/communities/?q=${encodeURIComponent(community.name)}`)}`,
    "---",
    "",
    `# ${community.name}`,
    "",
    community.summary,
    "",
    "## Classification",
    "",
    `- Track: ${community.track}`,
    `- Category: ${community.category}`,
    `- Cadence: ${community.cadence}`,
    "",
    "## Audience",
    "",
    ...community.audience.map((item) => `- ${item}`),
    "",
    "## Tags",
    "",
    ...community.tags.map((item) => `- ${item}`),
    "",
    "## Link",
    "",
    `- [${community.linkLabel}](${community.link})`,
    "",
    `[Back to communities](${withBasePath(`/communities.md?q=${encodeURIComponent(community.name)}`)})`,
    "",
  ];

  return lines.join("\n");
}

export async function getTerminalSearchNamespaces(): Promise<TerminalSearchNamespace[]> {
  const [radarEntries, communities, cloudProviders] = await Promise.all([
    getRadarEntries(),
    getTechCommunities(),
    getCloudEnablementProviders(),
  ]);

  return [
    {
      namespace: "tech-radar",
      description: "Search technology radar entries with `/tech-radar <terms>`.",
      documents: radarEntries.map((entry) => ({
        namespace: "tech-radar",
        title: entry.name,
        slug: entry.slug,
        summary: entry.summary,
        fileName: `tech-radar/${entry.slug}.md`,
        htmlUrl: getScopedHtmlPageUrl("/tech-radar", entry.slug),
        markdownUrl: getScopedMarkdownPageUrl("/tech-radar", entry.slug),
        markdown: getRadarEntryMarkdown(entry),
        searchText: normalizeSearchText([
          entry.slug,
          entry.name,
          entry.ring,
          entry.primaryScope,
          entry.sourceType,
          entry.status,
          entry.domain,
          entry.owner,
          entry.summary,
          entry.reasoning,
          entry.maturity,
          entry.operationScope,
          entry.operationModel,
          entry.reviewCadence,
          entry.updated,
          ...entry.capabilities,
          ...entry.guardrails,
          ...entry.signals,
          ...entry.actions,
          ...entry.alternatives,
        ]),
      })),
    },
    {
      namespace: "cloud-enablement",
      description: "Search cloud products and known features with `/cloud-enablement <terms>`.",
      documents: cloudProviders.flatMap((provider) =>
        provider.products.map((product) => ({
          namespace: "cloud-enablement",
          title: `${provider.shortName} ${product.name}`,
          slug: `${provider.slug}-${product.slug}`,
          summary: product.summary,
          fileName: `cloud-enablement/${provider.slug}/${product.slug}.md`,
          htmlUrl: getCloudEnablementDetailHtmlUrl(provider.slug, product.slug),
          markdownUrl: getCloudEnablementDetailMarkdownUrl(provider.slug, product.slug),
          markdown: getCloudEnablementProductMarkdown(provider, product),
          searchText: normalizeSearchText([
            provider.slug,
            provider.name,
            provider.shortName,
            provider.priority,
            provider.coverageStatus,
            product.slug,
            product.name,
            product.archetype,
            product.category,
            product.summary,
            product.featureCoverage,
            ...product.knownFeatures,
          ]),
        })),
      ),
    },
    {
      namespace: "communities",
      description: "Search community directory entries with `/communities <terms>`.",
      documents: communities.map((community) => ({
        namespace: "communities",
        title: community.name,
        slug: community.slug,
        summary: community.summary,
        fileName: `communities/${community.slug}.md`,
        htmlUrl: withBasePath(`/communities/?q=${encodeURIComponent(community.name)}`),
        markdownUrl: null,
        markdown: getCommunityMarkdown(community),
        searchText: normalizeSearchText([
          community.slug,
          community.name,
          community.track,
          community.category,
          community.summary,
          community.cadence,
          community.linkLabel,
          ...community.tags,
          ...community.audience,
        ]),
      })),
    },
  ];
}
