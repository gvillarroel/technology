import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { getScopedHtmlPageUrl, getScopedMarkdownPageUrl } from "./dual-format";
import { createMarkdownDocument, markdownLink } from "./markdown";
import { type SkillsCatalogData } from "./skills-repositories";
import { formatSkillSuccessRatio } from "./skills-page";
import { getSkillDetailMarkdownUrl } from "./skills-repositories";
import { withBasePath } from "./site-url";
import { getRadarEntries, type RadarEntry } from "./tech-radar";

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
  toolGroups: AiSdlcToolGroup[];
  measurementLayers: AiSdlcMeasurementLayer[];
  dataSources: AiSdlcDataSource[];
  skillsPage?: AiSdlcSkillsPageCopy;
  skillDetail?: AiSdlcSkillDetailCopy;
}

export interface AiSdlcMeasurementLayer {
  title: string;
  summary: string;
  signals: string[];
  chart: string;
  sourceHint: string;
}

function getPrimarySkillExternalUrl(skill: { sourceUrl: string; repositoryUrl: string }) {
  return skill.sourceUrl || skill.repositoryUrl || "";
}

export interface AiSdlcDataSource {
  name: string;
  scope: string;
  availability: string;
  metrics: string[];
  caveats: string[];
}

export interface AiSdlcSkillsPageCopy {
  sourceFile: string;
  sourceHeading: string;
  sourceDescription: string;
  repositoriesLabel: string;
  skillsLabel: string;
  filterSearchLabel: string;
  filterSearchPlaceholder: string;
  filterToggleLabel: string;
  filterToggleHint: string;
  catalogEyebrow: string;
  catalogHeading: string;
  resultsCountSuffix: string;
  statusEvaluated: string;
  statusNotEvaluated: string;
  averageSuccessRatioLabel: string;
  averageSuccessRatioEmpty: string;
  detailLinkLabel: string;
  installHeading: string;
  metadataHeading: string;
  sourceLinkLabel: string;
  repositoryLinkLabel: string;
  emptyState: string;
  installUnavailableSnippet: string;
  markdownRepositoriesHeading: string;
  markdownSkillsHeading: string;
  markdownRepositorySourceLabel: string;
  markdownRepositoryTypeLabel: string;
  markdownRepositoryRootLabel: string;
  markdownRepositoryPurposeLabel: string;
  markdownRepositorySkillCountLabel: string;
  markdownRepositoryUrlLabel: string;
  markdownSkillRepositoryLabel: string;
  markdownSkillSummaryLabel: string;
  markdownSkillEvaluatedLabel: string;
  markdownSkillAverageSuccessRatioLabel: string;
  markdownSkillTagsLabel: string;
  markdownSkillSourcePathLabel: string;
  markdownSkillDetailLabel: string;
  markdownSkillSourceUrlLabel: string;
  markdownSkillMetadataLabel: string;
  markdownSkillInstallLabel: string;
  markdownInstallUnavailable: string;
  markdownYesLabel: string;
  markdownNoLabel: string;
  markdownNoneLabel: string;
  markdownOpenLabel: string;
  markdownTagPrefix: string;
}

export interface AiSdlcSkillDetailCopy {
  breadcrumbPrefix: string;
  searchPlaceholder: string;
  statusEvaluated: string;
  statusNotEvaluated: string;
  averageSuccessRatioLabel: string;
  averageSuccessRatioEmpty: string;
  evaluationCountLabel: string;
  installHeading: string;
  metadataHeading: string;
  installUnavailableSnippet: string;
  evaluationSummaryFile: string;
  repositoryLabel: string;
  sourceLabel: string;
  passCountLabel: string;
  totalRunsLabel: string;
  benchmarkFileSuffix: string;
  benchmarkSuccessRatioLabel: string;
  benchmarkRunsLabel: string;
  benchmarkRequestsLabel: string;
  benchmarkTimeoutLabel: string;
  benchmarkSetupHeading: string;
  benchmarkTableHeading: string;
  benchmarkPromptColumnLabel: string;
  benchmarkScenarioColumnLabel: string;
  benchmarkDeltaColumnLabel: string;
  benchmarkDeltaPositivePrefix: string;
  benchmarkMissingCellLabel: string;
  benchmarkAssertionsLabel: string;
  benchmarkConcurrencyLabel: string;
  benchmarkVariantModelLabel: string;
  benchmarkWorkspaceSourcesLabel: string;
  promptsHeading: string;
  workspaceProfilesHeading: string;
  workspaceInstallLabel: string;
  workspaceSkillSourceLabel: string;
  workspaceSkillPathLabel: string;
  cellsHeading: string;
  noEvaluationsEmpty: string;
  backLabel: string;
  markdownSummaryHeading: string;
  markdownRepositoryLabel: string;
  markdownEvaluatedLabel: string;
  markdownAverageSuccessRatioLabel: string;
  markdownEvaluationCountLabel: string;
  markdownInstallPathLabel: string;
  markdownInstallHeading: string;
  markdownMetadataHeading: string;
  markdownEvaluationsHeading: string;
  markdownDescriptionLabel: string;
  markdownSuccessRatioLabel: string;
  markdownRunsLabel: string;
  markdownRequestsLabel: string;
  markdownTimeoutLabel: string;
  markdownMaxConcurrencyLabel: string;
  markdownInstallStrategyLabel: string;
  markdownSkillSourceLabel: string;
  markdownProfilesLabel: string;
  markdownVariantsLabel: string;
  markdownPromptPrefix: string;
  markdownWorkspaceSourcePrefix: string;
  markdownCellPrefix: string;
  markdownBackLabel: string;
  markdownYesLabel: string;
  markdownNoLabel: string;
  markdownTagPrefix: string;
}

export interface AiSdlcToolReference {
  slug: string;
  role: string;
  focus: string;
  productionSignal: string;
}

export interface AiSdlcToolGroup {
  title: string;
  summary: string;
  tools: AiSdlcToolReference[];
}

export interface AiSdlcResolvedToolReference extends AiSdlcToolReference {
  entry: RadarEntry;
}

export interface AiSdlcResolvedToolGroup {
  title: string;
  summary: string;
  tools: AiSdlcResolvedToolReference[];
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

function toToolGroups(value: unknown): AiSdlcToolGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((group) => {
    const normalizedGroup = (group as Record<string, unknown>) ?? {};
    const tools = Array.isArray(normalizedGroup.tools) ? normalizedGroup.tools : [];

    return {
      title: toScalar(normalizedGroup.title),
      summary: toScalar(normalizedGroup.summary),
      tools: tools
        .map((tool) => {
          const normalizedTool = (tool as Record<string, unknown>) ?? {};

          return {
            slug: toScalar(normalizedTool.slug),
            role: toScalar(normalizedTool.role),
            focus: toScalar(normalizedTool.focus),
            productionSignal: toScalar(normalizedTool.production_signal),
          };
        })
        .filter((tool) => tool.slug),
    };
  });
}

function toMeasurementLayers(value: unknown): AiSdlcMeasurementLayer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((layer) => {
    const normalizedLayer = (layer as Record<string, unknown>) ?? {};

    return {
      title: toScalar(normalizedLayer.title),
      summary: toScalar(normalizedLayer.summary),
      signals: toList(normalizedLayer.signals),
      chart: toScalar(normalizedLayer.chart),
      sourceHint: toScalar(normalizedLayer.source_hint),
    };
  });
}

function toDataSources(value: unknown): AiSdlcDataSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((source) => {
    const normalizedSource = (source as Record<string, unknown>) ?? {};

    return {
      name: toScalar(normalizedSource.name),
      scope: toScalar(normalizedSource.scope),
      availability: toScalar(normalizedSource.availability),
      metrics: toList(normalizedSource.metrics),
      caveats: toList(normalizedSource.caveats),
    };
  });
}

function toSkillsPageCopy(value: unknown): AiSdlcSkillsPageCopy | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const copy = value as Record<string, unknown>;

  return {
    sourceFile: toScalar(copy.source_file),
    sourceHeading: toScalar(copy.source_heading),
    sourceDescription: toScalar(copy.source_description),
    repositoriesLabel: toScalar(copy.repositories_label),
    skillsLabel: toScalar(copy.skills_label),
    filterSearchLabel: toScalar(copy.filter_search_label),
    filterSearchPlaceholder: toScalar(copy.filter_search_placeholder),
    filterToggleLabel: toScalar(copy.filter_toggle_label),
    filterToggleHint: toScalar(copy.filter_toggle_hint),
    catalogEyebrow: toScalar(copy.catalog_eyebrow),
    catalogHeading: toScalar(copy.catalog_heading),
    resultsCountSuffix: toScalar(copy.results_count_suffix),
    statusEvaluated: toScalar(copy.status_evaluated),
    statusNotEvaluated: toScalar(copy.status_not_evaluated),
    averageSuccessRatioLabel: toScalar(copy.average_success_ratio_label),
    averageSuccessRatioEmpty: toScalar(copy.average_success_ratio_empty),
    detailLinkLabel: toScalar(copy.detail_link_label),
    installHeading: toScalar(copy.install_heading),
    metadataHeading: toScalar(copy.metadata_heading),
    sourceLinkLabel: toScalar(copy.source_link_label),
    repositoryLinkLabel: toScalar(copy.repository_link_label),
    emptyState: toScalar(copy.empty_state),
    installUnavailableSnippet: toScalar(copy.install_unavailable_snippet),
    markdownRepositoriesHeading: toScalar(copy.markdown_repositories_heading),
    markdownSkillsHeading: toScalar(copy.markdown_skills_heading),
    markdownRepositorySourceLabel: toScalar(copy.markdown_repository_source_label),
    markdownRepositoryTypeLabel: toScalar(copy.markdown_repository_type_label),
    markdownRepositoryRootLabel: toScalar(copy.markdown_repository_root_label),
    markdownRepositoryPurposeLabel: toScalar(copy.markdown_repository_purpose_label),
    markdownRepositorySkillCountLabel: toScalar(copy.markdown_repository_skill_count_label),
    markdownRepositoryUrlLabel: toScalar(copy.markdown_repository_url_label),
    markdownSkillRepositoryLabel: toScalar(copy.markdown_skill_repository_label),
    markdownSkillSummaryLabel: toScalar(copy.markdown_skill_summary_label),
    markdownSkillEvaluatedLabel: toScalar(copy.markdown_skill_evaluated_label),
    markdownSkillAverageSuccessRatioLabel: toScalar(copy.markdown_skill_average_success_ratio_label),
    markdownSkillTagsLabel: toScalar(copy.markdown_skill_tags_label),
    markdownSkillSourcePathLabel: toScalar(copy.markdown_skill_source_path_label),
    markdownSkillDetailLabel: toScalar(copy.markdown_skill_detail_label),
    markdownSkillSourceUrlLabel: toScalar(copy.markdown_skill_source_url_label),
    markdownSkillMetadataLabel: toScalar(copy.markdown_skill_metadata_label),
    markdownSkillInstallLabel: toScalar(copy.markdown_skill_install_label),
    markdownInstallUnavailable: toScalar(copy.markdown_install_unavailable),
    markdownYesLabel: toScalar(copy.markdown_yes_label),
    markdownNoLabel: toScalar(copy.markdown_no_label),
    markdownNoneLabel: toScalar(copy.markdown_none_label),
    markdownOpenLabel: toScalar(copy.markdown_open_label),
    markdownTagPrefix: toScalar(copy.markdown_tag_prefix),
  };
}

function toSkillDetailCopy(value: unknown): AiSdlcSkillDetailCopy | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const copy = value as Record<string, unknown>;

  return {
    breadcrumbPrefix: toScalar(copy.breadcrumb_prefix),
    searchPlaceholder: toScalar(copy.search_placeholder),
    statusEvaluated: toScalar(copy.status_evaluated),
    statusNotEvaluated: toScalar(copy.status_not_evaluated),
    averageSuccessRatioLabel: toScalar(copy.average_success_ratio_label),
    averageSuccessRatioEmpty: toScalar(copy.average_success_ratio_empty),
    evaluationCountLabel: toScalar(copy.evaluation_count_label),
    installHeading: toScalar(copy.install_heading),
    metadataHeading: toScalar(copy.metadata_heading),
    installUnavailableSnippet: toScalar(copy.install_unavailable_snippet),
    evaluationSummaryFile: toScalar(copy.evaluation_summary_file),
    repositoryLabel: toScalar(copy.repository_label),
    sourceLabel: toScalar(copy.source_label),
    passCountLabel: toScalar(copy.pass_count_label),
    totalRunsLabel: toScalar(copy.total_runs_label),
    benchmarkFileSuffix: toScalar(copy.benchmark_file_suffix),
    benchmarkSuccessRatioLabel: toScalar(copy.benchmark_success_ratio_label),
    benchmarkRunsLabel: toScalar(copy.benchmark_runs_label),
    benchmarkRequestsLabel: toScalar(copy.benchmark_requests_label),
    benchmarkTimeoutLabel: toScalar(copy.benchmark_timeout_label),
    benchmarkSetupHeading: toScalar(copy.benchmark_setup_heading),
    benchmarkTableHeading: toScalar(copy.benchmark_table_heading),
    benchmarkPromptColumnLabel: toScalar(copy.benchmark_prompt_column_label),
    benchmarkScenarioColumnLabel: toScalar(copy.benchmark_scenario_column_label),
    benchmarkDeltaColumnLabel: toScalar(copy.benchmark_delta_column_label),
    benchmarkDeltaPositivePrefix: toScalar(copy.benchmark_delta_positive_prefix),
    benchmarkMissingCellLabel: toScalar(copy.benchmark_missing_cell_label),
    benchmarkAssertionsLabel: toScalar(copy.benchmark_assertions_label),
    benchmarkConcurrencyLabel: toScalar(copy.benchmark_concurrency_label),
    benchmarkVariantModelLabel: toScalar(copy.benchmark_variant_model_label),
    benchmarkWorkspaceSourcesLabel: toScalar(copy.benchmark_workspace_sources_label),
    promptsHeading: toScalar(copy.prompts_heading),
    workspaceProfilesHeading: toScalar(copy.workspace_profiles_heading),
    workspaceInstallLabel: toScalar(copy.workspace_install_label),
    workspaceSkillSourceLabel: toScalar(copy.workspace_skill_source_label),
    workspaceSkillPathLabel: toScalar(copy.workspace_skill_path_label),
    cellsHeading: toScalar(copy.cells_heading),
    noEvaluationsEmpty: toScalar(copy.no_evaluations_empty),
    backLabel: toScalar(copy.back_label),
    markdownSummaryHeading: toScalar(copy.markdown_summary_heading),
    markdownRepositoryLabel: toScalar(copy.markdown_repository_label),
    markdownEvaluatedLabel: toScalar(copy.markdown_evaluated_label),
    markdownAverageSuccessRatioLabel: toScalar(copy.markdown_average_success_ratio_label),
    markdownEvaluationCountLabel: toScalar(copy.markdown_evaluation_count_label),
    markdownInstallPathLabel: toScalar(copy.markdown_install_path_label),
    markdownInstallHeading: toScalar(copy.markdown_install_heading),
    markdownMetadataHeading: toScalar(copy.markdown_metadata_heading),
    markdownEvaluationsHeading: toScalar(copy.markdown_evaluations_heading),
    markdownDescriptionLabel: toScalar(copy.markdown_description_label),
    markdownSuccessRatioLabel: toScalar(copy.markdown_success_ratio_label),
    markdownRunsLabel: toScalar(copy.markdown_runs_label),
    markdownRequestsLabel: toScalar(copy.markdown_requests_label),
    markdownTimeoutLabel: toScalar(copy.markdown_timeout_label),
    markdownMaxConcurrencyLabel: toScalar(copy.markdown_max_concurrency_label),
    markdownInstallStrategyLabel: toScalar(copy.markdown_install_strategy_label),
    markdownSkillSourceLabel: toScalar(copy.markdown_skill_source_label),
    markdownProfilesLabel: toScalar(copy.markdown_profiles_label),
    markdownVariantsLabel: toScalar(copy.markdown_variants_label),
    markdownPromptPrefix: toScalar(copy.markdown_prompt_prefix),
    markdownWorkspaceSourcePrefix: toScalar(copy.markdown_workspace_source_prefix),
    markdownCellPrefix: toScalar(copy.markdown_cell_prefix),
    markdownBackLabel: toScalar(copy.markdown_back_label),
    markdownYesLabel: toScalar(copy.markdown_yes_label),
    markdownNoLabel: toScalar(copy.markdown_no_label),
    markdownTagPrefix: toScalar(copy.markdown_tag_prefix),
  };
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
    topics: topics.map((topic) => ({
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
        toolGroups: toToolGroups(topic.tool_groups),
        measurementLayers: toMeasurementLayers(topic.measurement_layers),
        dataSources: toDataSources(topic.data_sources),
        skillsPage: toSkillsPageCopy(topic.skills_page),
        skillDetail: toSkillDetailCopy(topic.skill_detail),
      })),
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
  const doc = createMarkdownDocument({
    title: overview.title,
    description: overview.summary,
    canonicalHtml: withBasePath("/ai-sdlc/"),
  });

  doc.heading(overview.title);
  doc.paragraph(overview.copy.indexIntro);
  doc.section(overview.copy.sourceSectionHeading, () => {
    doc.keyValueList([
      { label: "File", value: overview.sourceOfTruth },
      { label: overview.copy.sourceOwnerLabel, value: overview.owner },
      { label: overview.copy.sourceUpdatedLabel, value: overview.updated },
    ]);
  });
  doc.section(overview.copy.topicsSectionHeading);

  for (const topic of topics) {
    doc.subheading(topic.name, 3);
    doc.keyValueList([
      { label: "Status", value: topic.status },
      { label: "Owner", value: topic.owner },
      { label: "Summary", value: topic.summary },
      { label: "Outcome", value: topic.outcome },
      { label: "Detail", value: markdownLink("Open", getAiSdlcDetailMarkdownUrl(topic.slug)) },
    ]);
  }

  return doc.finish();
}

export function getAiSdlcTopicMarkdown(topic: AiSdlcTopic, overview: AiSdlcOverview) {
  const doc = createMarkdownDocument({
    title: `${overview.title} ${topic.name}`,
    description: topic.summary,
    canonicalHtml: getAiSdlcDetailHtmlUrl(topic.slug),
  });

  doc.heading(`${overview.title} / ${topic.name}`);
  doc.paragraph(topic.summary);
  doc.section(overview.copy.operatingModelHeading, () => {
    doc.keyValueList([
      { label: overview.copy.metadataStatusLabel, value: topic.status },
      { label: overview.copy.metadataOwnerLabel, value: topic.owner },
      { label: overview.copy.metadataOutcomeLabel, value: topic.outcome },
    ]);
  });
  doc.section(overview.copy.signalsHeading, () => doc.bullets(topic.signals));
  doc.section(overview.copy.practicesHeading, () => doc.bullets(topic.practices));
  doc.section(overview.copy.metricsHeading, () => doc.bullets(topic.metrics));
  doc.section(overview.copy.linksHeading, () => {
    doc.bullets(topic.links.map((link) => markdownLink(link.label, link.url)));
  });
  doc.paragraph(markdownLink("Back to AI SDLC", withBasePath("/ai-sdlc.md")));

  return doc.finish({ trailingNewline: false });
}

export async function getAiSdlcResolvedToolGroups(topic: AiSdlcTopic): Promise<AiSdlcResolvedToolGroup[]> {
  if (topic.toolGroups.length === 0) {
    return [];
  }

  const radarEntries = await getRadarEntries();
  const radarEntriesBySlug = new Map(radarEntries.map((entry) => [entry.slug, entry]));

  return topic.toolGroups
    .map((group) => ({
      title: group.title,
      summary: group.summary,
      tools: group.tools
        .map((tool) => {
          const entry = radarEntriesBySlug.get(tool.slug);

          return entry
            ? {
                ...tool,
                entry,
              }
            : undefined;
        })
        .filter((tool): tool is AiSdlcResolvedToolReference => Boolean(tool)),
    }))
    .filter((group) => group.tools.length > 0);
}

export function getAiSdlcHarnessToolsMarkdown(
  topic: AiSdlcTopic,
  overview: AiSdlcOverview,
  toolGroups: AiSdlcResolvedToolGroup[],
) {
  const allTools = toolGroups.flatMap((group) => group.tools);
  const doc = createMarkdownDocument({
    title: `${overview.title} ${topic.name}`,
    description: topic.summary,
    canonicalHtml: getAiSdlcDetailHtmlUrl(topic.slug),
  });

  doc.heading(`${overview.title} / ${topic.name}`);
  doc.paragraph(topic.summary);
  doc.section(overview.copy.operatingModelHeading, () => {
    doc.keyValueList([
      { label: overview.copy.metadataStatusLabel, value: topic.status },
      { label: overview.copy.metadataOwnerLabel, value: topic.owner },
      { label: overview.copy.metadataOutcomeLabel, value: topic.outcome },
      { label: "Tool groups", value: String(toolGroups.length) },
      { label: "Radar-backed tools", value: String(allTools.length) },
    ]);
  });
  doc.section(overview.copy.signalsHeading, () => doc.bullets(topic.signals));
  doc.section(overview.copy.practicesHeading, () => doc.bullets(topic.practices));
  doc.section("Harness tool chain");

  for (const group of toolGroups) {
    doc.subheading(group.title, 3);
    doc.paragraph(group.summary);

    for (const tool of group.tools) {
      doc.subheading(tool.entry.name, 4);
      doc.keyValueList([
        { label: "Tech Radar ring", value: tool.entry.ring },
        { label: "Status", value: tool.entry.status },
        { label: "Updated", value: tool.entry.updated },
        { label: "Tools in this stage", value: String(group.tools.length) },
        { label: "Scope", value: tool.entry.primaryScope },
        { label: "Owner", value: tool.entry.owner },
        { label: "Role", value: tool.role },
        { label: "Focus", value: tool.focus },
        { label: "Production signal", value: tool.productionSignal },
        { label: "Summary", value: tool.entry.summary },
        { label: "Detail", value: markdownLink("Open", getScopedMarkdownPageUrl("/tech-radar", tool.entry.slug)) },
      ]);
    }
  }

  doc.section(overview.copy.metricsHeading, () => doc.bullets(topic.metrics));

  if (topic.measurementLayers.length > 0) {
    doc.section("Measurement layers");
    for (const layer of topic.measurementLayers) {
      doc.subheading(layer.title, 3);
      doc.paragraph(layer.summary);
      doc.keyValueList([
        { label: "Recommended chart", value: layer.chart },
        { label: "Data source hint", value: layer.sourceHint },
      ]);
      doc.bullets(layer.signals);
    }
  }

  if (topic.dataSources.length > 0) {
    doc.section("Organization-ready data sources");
    for (const source of topic.dataSources) {
      doc.subheading(source.name, 3);
      doc.keyValueList([
        { label: "Scope", value: source.scope },
        { label: "Availability", value: source.availability },
      ]);
      for (const metric of source.metrics) {
        doc.bullet(`Metric: ${metric}`);
      }
      for (const caveat of source.caveats) {
        doc.bullet(`Caveat: ${caveat}`);
      }
      doc.blank();
    }
  }

  doc.section(overview.copy.linksHeading, () => {
    doc.bullets(topic.links.map((link) => markdownLink(link.label, link.url)));
  });
  doc.paragraph(markdownLink("Back to AI SDLC", withBasePath("/ai-sdlc.md")));

  return doc.finish({ trailingNewline: false });
}

export function getAiSdlcSkillsMarkdown(
  topic: AiSdlcTopic,
  overview: AiSdlcOverview,
  skillsCatalog: SkillsCatalogData,
) {
  const copy = topic.skillsPage;

  if (!copy) {
    return getAiSdlcTopicMarkdown(topic, overview);
  }

  const doc = createMarkdownDocument({
    title: `${overview.title} ${topic.name}`,
    description: topic.summary,
    canonicalHtml: getAiSdlcDetailHtmlUrl(topic.slug),
  });

  doc.heading(`${overview.title} / ${topic.name}`);
  doc.paragraph(topic.summary);
  doc.section(overview.copy.operatingModelHeading, () => {
    doc.keyValueList([
      { label: overview.copy.metadataStatusLabel, value: topic.status },
      { label: overview.copy.metadataOwnerLabel, value: topic.owner },
      { label: overview.copy.metadataOutcomeLabel, value: topic.outcome },
      { label: copy.repositoriesLabel, value: String(skillsCatalog.repositories.length) },
      { label: copy.skillsLabel, value: String(skillsCatalog.skills.length) },
    ]);
  });
  doc.section(copy.markdownRepositoriesHeading);

  for (const repository of skillsCatalog.repositories) {
    doc.subheading(repository.name, 3);
    doc.keyValueList([
      { label: copy.markdownRepositorySourceLabel, value: repository.repository || repository.location },
      { label: copy.markdownRepositoryTypeLabel, value: repository.source },
      { label: copy.markdownRepositoryRootLabel, value: repository.skillRoot },
      { label: copy.markdownRepositoryPurposeLabel, value: repository.purpose },
      { label: copy.markdownRepositorySkillCountLabel, value: String(repository.skillCount) },
      ...(repository.repository
        ? [{ label: copy.markdownRepositoryUrlLabel, value: `https://github.com/${repository.repository}` }]
        : []),
    ]);
  }

  doc.section(copy.markdownSkillsHeading);

  for (const skill of skillsCatalog.skills) {
    doc.subheading(skill.name, 3);
    doc.keyValueList([
      { label: copy.markdownSkillRepositoryLabel, value: skill.repositoryLabel },
      { label: copy.markdownSkillSummaryLabel, value: skill.description },
      { label: copy.markdownSkillEvaluatedLabel, value: skill.evaluationSummary.evaluated ? copy.markdownYesLabel : copy.markdownNoLabel },
      {
        label: copy.markdownSkillAverageSuccessRatioLabel,
        value: skill.evaluationSummary.evaluated
          ? formatSkillSuccessRatio(skill.evaluationSummary.averageSuccessRatio)
          : copy.averageSuccessRatioEmpty,
      },
      { label: copy.markdownSkillTagsLabel, value: skill.tags.length ? skill.tags.join(", ") : copy.markdownNoneLabel },
      { label: copy.markdownSkillSourcePathLabel, value: skill.installPath },
      {
        label: copy.markdownSkillDetailLabel,
        value: markdownLink(copy.markdownOpenLabel, getSkillDetailMarkdownUrl(skill.repositorySlug, skill.slug)),
      },
    ]);
    if (getPrimarySkillExternalUrl(skill)) {
      doc.bullet(`${copy.markdownSkillSourceUrlLabel}: ${getPrimarySkillExternalUrl(skill)}`);
    }
    if (skill.metadataPairs.length > 0) {
      doc.bullet(`${copy.markdownSkillMetadataLabel}: ${skill.metadataPairs.map((item) => `${item.key}=${item.value}`).join(" | ")}`);
    }
    doc.bullet(
      `${copy.markdownSkillInstallLabel}: ${skill.installAvailable ? `\`${skill.installSnippet.replace(/\s+/g, " ").trim()}\`` : copy.markdownInstallUnavailable}`,
    );
    doc.blank();
  }

  doc.paragraph(markdownLink("Back to AI SDLC", withBasePath("/ai-sdlc.md")));
  return doc.finish({ trailingNewline: false });
}
