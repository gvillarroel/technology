import { createMarkdownDocument, markdownLink, markdownResponse } from "./markdown";
import { withBasePath } from "./site-url";
import { getTerminalCommandConfigs } from "./terminal-commands";
import { getTerminalSearchNamespaces } from "./terminal-search";
import { getDocumentPages } from "./documents";
import { getAdrPages } from "./adrs";
import { getAiSdlcData, getAiSdlcDetailHtmlUrl, getAiSdlcDetailMarkdownUrl } from "./ai-sdlc";

export interface GlobalSearchEntry {
  title: string;
  slug: string;
  summary: string;
  htmlUrl: string;
  markdownUrl: string | null;
  fileName: string | null;
  searchText: string;
  section: string;
  scopeHref: string;
}

export interface GlobalSearchResult extends GlobalSearchEntry {
  score: number;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getSearchTokens(query: string) {
  return normalizeText(query).split(" ").filter(Boolean);
}

function scoreEntry(entry: GlobalSearchEntry, normalizedQuery: string, tokens: string[], scope: string) {
  let score = 0;
  const normalizedTitle = normalizeText(entry.title);
  const normalizedSlug = normalizeText(entry.slug);
  const normalizedSummary = normalizeText(entry.summary);
  const normalizedSection = normalizeText(entry.section);

  if (normalizedTitle === normalizedQuery || normalizedSlug === normalizedQuery) {
    score += 220;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    score += 90;
  }

  if (normalizedSlug.includes(normalizedQuery)) {
    score += 70;
  }

  if (normalizedSummary.includes(normalizedQuery)) {
    score += 35;
  }

  if (normalizedSection.includes(normalizedQuery)) {
    score += 25;
  }

  for (const token of tokens) {
    if (normalizedTitle.includes(token)) {
      score += 24;
    }

    if (normalizedSlug.includes(token)) {
      score += 18;
    }

    if (normalizedSummary.includes(token)) {
      score += 10;
    }

    if (normalizedSection.includes(token)) {
      score += 8;
    }

    const haystackMatches = normalizeText(entry.searchText).split(token).length - 1;
    score += Math.min(haystackMatches, 6);
  }

  if (scope && entry.scopeHref.startsWith(scope)) {
    score += 40;
  }

  return score;
}

function getSectionFromUrl(htmlUrl: string) {
  if (htmlUrl.includes("/documents/")) {
    return "Documentation";
  }

  if (htmlUrl.includes("/tech-radar/")) {
    return "Tech Radar";
  }

  if (htmlUrl.includes("/cloud-enablement/")) {
    return "Cloud Enablement";
  }

  if (htmlUrl.includes("/models/")) {
    return "Models";
  }

  if (htmlUrl.includes("/communities/")) {
    return "Communities";
  }

  if (htmlUrl.includes("/adrs/")) {
    return "ADRs";
  }

  if (htmlUrl.includes("/ai-sdlc/")) {
    return "AI SDLC";
  }

  return "Pages";
}

export async function getGlobalSearchIndex(): Promise<GlobalSearchEntry[]> {
  const [commandConfigs, namespaces, documentPages, adrPages, aiSdlcData] = await Promise.all([
    getTerminalCommandConfigs(),
    getTerminalSearchNamespaces(),
    getDocumentPages(),
    getAdrPages(),
    getAiSdlcData(),
  ]);

  const commandEntries = commandConfigs
    .filter((entry) => entry.kind === "markdown-page" && entry.htmlUrl)
    .map((entry) => ({
      title: entry.command,
      slug: entry.command.replace(/^\//, ""),
      summary: entry.description,
      htmlUrl: entry.htmlUrl!,
      markdownUrl: entry.markdownUrl,
      fileName: entry.fileName,
      searchText: normalizeText(
        [entry.command, entry.description, entry.fileName ?? "", entry.htmlUrl ?? ""].join(" "),
      ),
      section: getSectionFromUrl(entry.htmlUrl!),
      scopeHref: entry.htmlUrl!,
    }));

  const namespaceEntries = namespaces.flatMap((namespace) =>
    namespace.documents
      .filter((entry) => entry.htmlUrl)
      .map((entry) => ({
        title: entry.title,
        slug: entry.slug,
        summary: entry.summary,
        htmlUrl: entry.htmlUrl!,
        markdownUrl: entry.markdownUrl,
        fileName: entry.fileName,
        searchText: entry.searchText,
        section: getSectionFromUrl(entry.htmlUrl!),
        scopeHref: entry.htmlUrl!,
      })),
  );

  const documentEntries = documentPages
    .map((entry) => ({
      title: entry.title,
      slug: entry.relativePath,
      summary: entry.summary,
      htmlUrl: entry.htmlUrl,
      markdownUrl: entry.markdownUrl,
      fileName: entry.relativePath,
      searchText: normalizeText(
        [
          entry.title,
          entry.summary,
          entry.repository,
          entry.relativePath,
          entry.owner ?? "",
          entry.updated ?? "",
          entry.docType,
          entry.status,
          ...entry.ruleLabels,
          ...entry.domainRoots,
          ...entry.sourceNames,
          entry.body,
        ].join(" "),
      ),
      section: "Documentation",
      scopeHref: entry.htmlUrl,
    }));

  const adrEntries = adrPages.map((page) => ({
    title: page.adrNumber ? `ADR ${page.adrNumber}: ${page.title}` : page.title,
    slug: page.slugSegments.join("/"),
    summary: page.summary,
    htmlUrl: page.htmlUrl,
    markdownUrl: page.markdownUrl,
    fileName: page.relativePath,
    searchText: normalizeText(
      [
        page.adrNumber,
        page.title,
        page.summary,
        page.status,
        page.product,
        page.date,
        page.year,
        page.owner,
        page.area,
        ...page.tags,
        page.relativePath,
        page.repository,
        page.body,
      ].join(" "),
    ),
    section: "ADRs",
    scopeHref: page.htmlUrl,
  }));

  const aiSdlcOverviewEntry = {
    title: aiSdlcData.overview.title,
    slug: "ai-sdlc",
    summary: aiSdlcData.overview.summary,
    htmlUrl: withBasePath("/ai-sdlc/"),
    markdownUrl: withBasePath("/ai-sdlc.md"),
    fileName: "data/ai-sdlc.yaml",
    searchText: normalizeText(
      [
        aiSdlcData.overview.title,
        aiSdlcData.overview.summary,
        aiSdlcData.overview.sourceOfTruth,
        aiSdlcData.overview.updated,
        aiSdlcData.overview.owner,
        aiSdlcData.overview.copy.indexHeading,
        aiSdlcData.overview.copy.indexIntro,
        aiSdlcData.overview.copy.topicsHeading,
        ...aiSdlcData.topics.map((topic) => `${topic.name} ${topic.slug} ${topic.summary}`),
      ].join(" "),
    ),
    section: "AI SDLC",
    scopeHref: withBasePath("/ai-sdlc/"),
  } satisfies GlobalSearchEntry;

  const aiSdlcTopicEntries = aiSdlcData.topics.map((topic) => ({
    title: topic.name,
    slug: topic.slug,
    summary: topic.summary,
    htmlUrl: getAiSdlcDetailHtmlUrl(topic.slug),
    markdownUrl: getAiSdlcDetailMarkdownUrl(topic.slug),
    fileName: `ai-sdlc/${topic.slug}.md`,
    searchText: normalizeText(
      [
        topic.name,
        topic.slug,
        topic.status,
        topic.owner,
        topic.summary,
        topic.outcome,
        ...topic.signals,
        ...topic.practices,
        ...topic.metrics,
        ...topic.links.flatMap((link) => [link.label, link.url]),
        ...topic.toolGroups.flatMap((group) => [
          group.title,
          group.summary,
          ...group.tools.flatMap((tool) => [tool.slug, tool.role, tool.focus, tool.productionSignal]),
        ]),
        ...topic.measurementLayers.flatMap((layer) => [
          layer.title,
          layer.summary,
          layer.chart,
          layer.sourceHint,
          ...layer.signals,
        ]),
        ...topic.dataSources.flatMap((source) => [
          source.name,
          source.scope,
          source.availability,
          ...source.metrics,
          ...source.caveats,
        ]),
      ].join(" "),
    ),
    section: "AI SDLC",
    scopeHref: getAiSdlcDetailHtmlUrl(topic.slug),
  }));

  return [
    ...new Map(
      [
        ...commandEntries,
        ...namespaceEntries,
        ...documentEntries,
        ...adrEntries,
        aiSdlcOverviewEntry,
        ...aiSdlcTopicEntries,
      ].map((entry) => [
        entry.htmlUrl,
        entry,
      ]),
    ).values(),
  ];
}

export async function searchGlobalIndex(query: string, scope = ""): Promise<GlobalSearchResult[]> {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const tokens = getSearchTokens(query);
  const entries = await getGlobalSearchIndex();

  return entries
    .filter((entry) => tokens.every((token) => normalizeText(entry.searchText).includes(token)))
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, normalizedQuery, tokens, scope),
    }))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 24);
}

export async function getSearchPageMarkdown(query: string, scope = "") {
  const results = await searchGlobalIndex(query, scope);
  const doc = createMarkdownDocument({
    title: query ? `Search: ${query}` : "Search",
    description: query
      ? `Global search results for ${query}`
      : "Global search across technology pages",
    canonicalHtml: withBasePath(`/search/${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  });

  doc.heading(query ? `Search results for "${query}"` : "Search");
  doc.paragraph(
    query
      ? `${results.length} results matched across the indexed technology pages.`
      : "Provide a query to search across the indexed technology pages.",
  );

  if (scope) {
    doc.paragraph(`Scope boost: ${scope}`);
  }

  if (results.length > 0) {
    const groupedResults = results.reduce((groups, result) => {
      const currentGroup = groups.get(result.section) ?? [];
      currentGroup.push(result);
      groups.set(result.section, currentGroup);
      return groups;
    }, new Map<string, GlobalSearchResult[]>());

    doc.section("Results By Source", () => {
      for (const [section, sectionResults] of groupedResults) {
        doc.subheading(section, 3);
        doc.bullets(
          sectionResults.map((result) =>
            `${markdownLink(result.title, result.markdownUrl ?? result.htmlUrl)}${result.summary ? ` - ${result.summary}` : ""}`,
          ),
        );
      }
    });
  }

  return doc.finish();
}

export async function getSearchPageMarkdownResponse(query: string, scope = "") {
  return markdownResponse(await getSearchPageMarkdown(query, scope));
}
