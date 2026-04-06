import { getScopedHtmlPageUrl, getScopedMarkdownPageUrl } from "./dual-format";
import {
  getCloudEnablementDetailHtmlUrl,
  getCloudEnablementDetailMarkdownUrl,
  getCloudEnablementProductMarkdown,
  getCloudEnablementProviders,
} from "./cloud-enablement";
import {
  getAiSdlcData,
  getAiSdlcDetailHtmlUrl,
  getAiSdlcDetailMarkdownUrl,
  getAiSdlcTopicBySlug,
} from "./ai-sdlc";
import { createMarkdownDocument, markdownLink } from "./markdown";
import { getApprovedSkills, getSkillsCatalogData } from "./skills-repositories";
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
  const doc = createMarkdownDocument({
    title: community.name,
    description: community.summary,
    canonicalHtml: withBasePath(`/communities/?q=${encodeURIComponent(community.name)}`),
  });

  doc.heading(community.name);
  doc.paragraph(community.summary);
  doc.section("Classification", () => {
    doc.keyValueList([
      { label: "Track", value: community.track },
      { label: "Category", value: community.category },
      { label: "Cadence", value: community.cadence },
    ]);
  });
  doc.section("Audience", () => doc.bullets(community.audience));
  doc.section("Tags", () => doc.bullets(community.tags));
  doc.section("Link", () => doc.bullets([markdownLink(community.linkLabel, community.link)]));
  doc.paragraph(markdownLink("Back to communities", withBasePath(`/communities.md?q=${encodeURIComponent(community.name)}`)));

  return doc.finish({ trailingNewline: false });
}

function getSkillMarkdown(
  skill: Awaited<ReturnType<typeof getApprovedSkills>>[number],
  skillCounts: { repositories: number; skills: number },
) {
  const doc = createMarkdownDocument({
    title: skill.name,
    description: skill.description,
    canonicalHtml: withBasePath(`/ai-sdlc/skills/${skill.repositorySlug}/${skill.slug}/`),
  });

  doc.heading(skill.name);
  doc.paragraph(skill.description);
  doc.section("Catalog", () => {
    doc.keyValueList([
      { label: "Repositories", value: String(skillCounts.repositories) },
      { label: "Skills", value: String(skillCounts.skills) },
      { label: "Repository", value: skill.repositoryLabel },
      { label: "Evaluated", value: skill.evaluationSummary.evaluated ? "yes" : "no" },
    ]);
  });
  doc.section("Tags", () => doc.bullets(skill.tags.length > 0 ? skill.tags : ["none"]));
  doc.section("Install", () =>
    doc.codeBlock(skill.installAvailable ? skill.installSnippet : "# Local-only trusted source", "bash"),
  );
  doc.section("Links", () => {
    const links = [
      markdownLink("Skill detail", withBasePath(`/ai-sdlc/skills/${skill.repositorySlug}/${skill.slug}.md`)),
    ];

    if (skill.sourceUrl) {
      links.push(markdownLink("Source", skill.sourceUrl));
    }

    doc.bullets(links);
  });

  return doc.finish({ trailingNewline: false });
}

function getApiSourceMarkdown(
  source: {
    name: string;
    scope: string;
    availability: string;
    metrics: string[];
    caveats: string[];
  },
) {
  const doc = createMarkdownDocument({
    title: source.name,
    description: source.scope,
    canonicalHtml: getAiSdlcDetailHtmlUrl("metrics"),
  });

  doc.heading(source.name);
  doc.paragraph(source.scope);
  doc.section("Availability", () => doc.paragraph(source.availability));
  doc.section("Metrics", () => doc.bullets(source.metrics));
  doc.section("Caveats", () => doc.bullets(source.caveats));
  doc.paragraph(markdownLink("Back to AI SDLC metrics", getAiSdlcDetailMarkdownUrl("metrics")));

  return doc.finish({ trailingNewline: false });
}

export async function getTerminalSearchNamespaces(): Promise<TerminalSearchNamespace[]> {
  const [radarEntries, communities, cloudProviders, skillsCatalog, approvedSkills, metricsTopic, aiSdlcOverview] = await Promise.all([
    getRadarEntries(),
    getTechCommunities(),
    getCloudEnablementProviders(),
    getSkillsCatalogData(),
    getApprovedSkills(),
    getAiSdlcTopicBySlug("metrics"),
    getAiSdlcData(),
  ]);

  const skillCounts = {
    repositories: skillsCatalog.repositories.length,
    skills: skillsCatalog.skills.length,
  };
  const apiDocuments =
    metricsTopic?.dataSources.map((source) => ({
      namespace: "api",
      title: source.name,
      slug: source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      summary: source.scope,
      fileName: `ai-sdlc/metrics/${source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`,
      htmlUrl: getAiSdlcDetailHtmlUrl("metrics"),
      markdownUrl: getAiSdlcDetailMarkdownUrl("metrics"),
      markdown: getApiSourceMarkdown(source),
      searchText: normalizeSearchText([
        source.name,
        source.scope,
        source.availability,
        ...source.metrics,
        ...source.caveats,
        aiSdlcOverview.overview.title,
        metricsTopic.name,
      ]),
    })) ?? [];

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
    {
      namespace: "skills",
      description: "Search approved skills with `/skills <terms>` or use `/skills list`.",
      documents: approvedSkills.map((skill) => ({
        namespace: "skills",
        title: skill.name,
        slug: skill.slug,
        summary: skill.description,
        fileName: `ai-sdlc/skills/${skill.repositorySlug}/${skill.slug}.md`,
        htmlUrl: withBasePath(`/ai-sdlc/skills/${skill.repositorySlug}/${skill.slug}/`),
        markdownUrl: withBasePath(`/ai-sdlc/skills/${skill.repositorySlug}/${skill.slug}.md`),
        markdown: getSkillMarkdown(skill, skillCounts),
        searchText: normalizeSearchText([
          skill.slug,
          skill.name,
          skill.description,
          skill.repositorySlug,
          skill.repositoryName,
          skill.repositoryPurpose,
          skill.installSnippet,
          ...skill.tags,
          ...skill.metadataPairs.flatMap((item) => [item.key, item.value]),
        ]),
      })),
    },
    {
      namespace: "api",
      description: "Search tracked API data sources with `/api <terms>` or use `/api list`.",
      documents: apiDocuments,
    },
    {
      namespace: "apis",
      description: "Search tracked API data sources with `/apis <terms>` or use `/apis list`.",
      documents: apiDocuments.map((document) => ({ ...document, namespace: "apis" })),
    },
  ];
}
