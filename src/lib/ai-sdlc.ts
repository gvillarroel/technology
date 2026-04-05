import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { getScopedHtmlPageUrl, getScopedMarkdownPageUrl } from "./dual-format";
import { type SkillsCatalogData } from "./skills-repositories";

export interface AiSdlcLink {
  label: string;
  url: string;
}

export interface AiSdlcTopic {
  slug: string;
  name: string;
  status: string;
  owner: string;
  summary: string;
  outcome: string;
  signals: string[];
  practices: string[];
  metrics: string[];
  links: AiSdlcLink[];
}

export interface AiSdlcOverview {
  title: string;
  summary: string;
  sourceOfTruth: string;
  updated: string;
  owner: string;
  copy: {
    searchPlaceholder: string;
    indexEyebrow: string;
    indexHeading: string;
    indexIntro: string;
    sourceSectionHeading: string;
    sourceHeading: string;
    sourceOwnerLabel: string;
    sourceUpdatedLabel: string;
    sourceTopicsLabel: string;
    topicsEyebrow: string;
    topicsHeading: string;
    topicsCountSuffix: string;
    topicsSectionHeading: string;
    detailEyebrowPrefix: string;
    operatingModelHeading: string;
    signalsFile: string;
    signalsHeading: string;
    metadataFile: string;
    metadataStatusLabel: string;
    metadataOwnerLabel: string;
    metadataOutcomeLabel: string;
    practicesFile: string;
    practicesHeading: string;
    metricsFile: string;
    metricsHeading: string;
    linksFile: string;
    linksHeading: string;
    backLabel: string;
  };
}

const aiSdlcYamlPath = join(process.cwd(), "data", "ai-sdlc.yaml");

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

export async function getAiSdlcData(): Promise<{
  overview: AiSdlcOverview;
  topics: AiSdlcTopic[];
}> {
  const rawFile = await readFile(aiSdlcYamlPath, "utf-8");
  const document = parse(rawFile) as {
    overview?: Record<string, unknown>;
    topics?: Array<Record<string, unknown>>;
  };

  const overview = document.overview ?? {};
  const copy = (overview.copy as Record<string, unknown> | undefined) ?? {};
  const topics = document.topics ?? [];

  return {
    overview: {
      title: toScalar(overview.title),
      summary: toScalar(overview.summary),
      sourceOfTruth: toScalar(overview.source_of_truth),
      updated: toScalar(overview.updated),
      owner: toScalar(overview.owner),
      copy: {
        searchPlaceholder: toScalar(copy.search_placeholder),
        indexEyebrow: toScalar(copy.index_eyebrow),
        indexHeading: toScalar(copy.index_heading),
        indexIntro: toScalar(copy.index_intro),
        sourceSectionHeading: toScalar(copy.source_section_heading),
        sourceHeading: toScalar(copy.source_heading),
        sourceOwnerLabel: toScalar(copy.source_owner_label),
        sourceUpdatedLabel: toScalar(copy.source_updated_label),
        sourceTopicsLabel: toScalar(copy.source_topics_label),
        topicsEyebrow: toScalar(copy.topics_eyebrow),
        topicsHeading: toScalar(copy.topics_heading),
        topicsCountSuffix: toScalar(copy.topics_count_suffix),
        topicsSectionHeading: toScalar(copy.topics_section_heading),
        detailEyebrowPrefix: toScalar(copy.detail_eyebrow_prefix),
        operatingModelHeading: toScalar(copy.operating_model_heading),
        signalsFile: toScalar(copy.signals_file),
        signalsHeading: toScalar(copy.signals_heading),
        metadataFile: toScalar(copy.metadata_file),
        metadataStatusLabel: toScalar(copy.metadata_status_label),
        metadataOwnerLabel: toScalar(copy.metadata_owner_label),
        metadataOutcomeLabel: toScalar(copy.metadata_outcome_label),
        practicesFile: toScalar(copy.practices_file),
        practicesHeading: toScalar(copy.practices_heading),
        metricsFile: toScalar(copy.metrics_file),
        metricsHeading: toScalar(copy.metrics_heading),
        linksFile: toScalar(copy.links_file),
        linksHeading: toScalar(copy.links_heading),
        backLabel: toScalar(copy.back_label),
      },
    },
    topics: topics
      .map((topic) => ({
        slug: toScalar(topic.slug),
        name: toScalar(topic.name),
        status: toScalar(topic.status),
        owner: toScalar(topic.owner),
        summary: toScalar(topic.summary),
        outcome: toScalar(topic.outcome),
        signals: toList(topic.signals),
        practices: toList(topic.practices),
        metrics: toList(topic.metrics),
        links: (Array.isArray(topic.links) ? topic.links : []).map((link) => ({
          label: toScalar(link.label),
          url: toScalar(link.url),
        })),
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export async function getAiSdlcTopics() {
  const { topics } = await getAiSdlcData();
  return topics;
}

export async function getAiSdlcTopicBySlug(slug: string) {
  const topics = await getAiSdlcTopics();
  return topics.find((topic) => topic.slug === slug);
}

export function getAiSdlcDetailHtmlUrl(slug: string) {
  return getScopedHtmlPageUrl("/ai-sdlc", slug);
}

export function getAiSdlcDetailMarkdownUrl(slug: string) {
  return getScopedMarkdownPageUrl("/ai-sdlc", slug);
}

export function getAiSdlcIndexMarkdown(overview: AiSdlcOverview, topics: AiSdlcTopic[]) {
  const lines = [
    "---",
    `title: ${overview.title}`,
    `description: ${overview.summary}`,
    "canonical_html: /ai-sdlc/",
    "---",
    "",
    `# ${overview.title}`,
    "",
    overview.copy.indexIntro,
    "",
    `## ${overview.copy.sourceSectionHeading}`,
    "",
    `- File: ${overview.sourceOfTruth}`,
    `- ${overview.copy.sourceOwnerLabel}: ${overview.owner}`,
    `- ${overview.copy.sourceUpdatedLabel}: ${overview.updated}`,
    "",
    `## ${overview.copy.topicsSectionHeading}`,
    "",
  ];

  for (const topic of topics) {
    lines.push(`### ${topic.name}`);
    lines.push("");
    lines.push(`- Status: ${topic.status}`);
    lines.push(`- Owner: ${topic.owner}`);
    lines.push(`- Summary: ${topic.summary}`);
    lines.push(`- Outcome: ${topic.outcome}`);
    lines.push(`- Detail: [Open](${getAiSdlcDetailMarkdownUrl(topic.slug)})`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function getAiSdlcTopicMarkdown(topic: AiSdlcTopic, overview: AiSdlcOverview) {
  const lines = [
    "---",
    `title: ${overview.title} ${topic.name}`,
    `description: ${topic.summary}`,
    `canonical_html: ${getAiSdlcDetailHtmlUrl(topic.slug)}`,
    "---",
    "",
    `# ${overview.title} / ${topic.name}`,
    "",
    topic.summary,
    "",
    `## ${overview.copy.operatingModelHeading}`,
    "",
    `- ${overview.copy.metadataStatusLabel}: ${topic.status}`,
    `- ${overview.copy.metadataOwnerLabel}: ${topic.owner}`,
    `- ${overview.copy.metadataOutcomeLabel}: ${topic.outcome}`,
    "",
    `## ${overview.copy.signalsHeading}`,
    "",
    ...topic.signals.map((item) => `- ${item}`),
    "",
    `## ${overview.copy.practicesHeading}`,
    "",
    ...topic.practices.map((item) => `- ${item}`),
    "",
    `## ${overview.copy.metricsHeading}`,
    "",
    ...topic.metrics.map((item) => `- ${item}`),
    "",
    `## ${overview.copy.linksHeading}`,
    "",
    ...topic.links.map((link) => `- [${link.label}](${link.url})`),
    "",
    `[Back to AI SDLC](/ai-sdlc.md)`,
    "",
  ];

  return lines.join("\n");
}

export function getAiSdlcSkillsMarkdown(
  topic: AiSdlcTopic,
  overview: AiSdlcOverview,
  skillsCatalog: SkillsCatalogData,
) {
  const lines = [
    "---",
    `title: ${overview.title} ${topic.name}`,
    `description: ${topic.summary}`,
    `canonical_html: ${getAiSdlcDetailHtmlUrl(topic.slug)}`,
    "---",
    "",
    `# ${overview.title} / ${topic.name}`,
    "",
    topic.summary,
    "",
    `## ${overview.copy.operatingModelHeading}`,
    "",
    `- ${overview.copy.metadataStatusLabel}: ${topic.status}`,
    `- ${overview.copy.metadataOwnerLabel}: ${topic.owner}`,
    `- ${overview.copy.metadataOutcomeLabel}: ${topic.outcome}`,
    `- Approved repositories: ${skillsCatalog.repositories.length}`,
    `- Approved skills: ${skillsCatalog.skills.length}`,
    "",
    "## Approved repositories",
    "",
  ];

  for (const repository of skillsCatalog.repositories) {
    lines.push(`### ${repository.name}`);
    lines.push("");
    lines.push(`- Source: ${repository.repository || repository.location}`);
    lines.push(`- Type: ${repository.source}`);
    lines.push(`- Purpose: ${repository.purpose}`);
    lines.push(`- Skills discovered: ${repository.skillCount}`);
    if (repository.repository) {
      lines.push(`- Repository URL: https://github.com/${repository.repository}`);
    }
    lines.push("");
  }

  lines.push("## Approved skills");
  lines.push("");

  for (const skill of skillsCatalog.skills) {
    lines.push(`### ${skill.name}`);
    lines.push("");
    lines.push(`- Repository: ${skill.repositoryLabel}`);
    lines.push(`- Summary: ${skill.description}`);
    lines.push(`- Tags: ${skill.tags.length ? skill.tags.join(", ") : "none"}`);
    lines.push(`- Source path: ${skill.installPath}`);
    lines.push(
      `- Install: ${skill.installAvailable ? `\`${skill.installCommand}\`` : "Local-only repository metadata; publish a remote install source before exposing a CLI command."}`,
    );
    lines.push("");
  }

  lines.push(`[Back to AI SDLC](/ai-sdlc.md)`);
  lines.push("");

  return lines.join("\n");
}
