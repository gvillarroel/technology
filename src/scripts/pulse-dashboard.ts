import * as echarts from "echarts/core";
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import type { EChartsType } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import type {
  PulseAiDocWeeklyActivitySeries,
  PulseConventionCoverage,
  PulseDataset,
  PulseLanguageShare,
  PulseRepoFilter,
  PulseRepoSize,
  PulseTeamFilter,
  PulseWeeklyActivitySeries,
} from "../lib/pulse";

echarts.use([BarChart, LineChart, ScatterChart, CanvasRenderer, GridComponent, LegendComponent, TooltipComponent]);

const pulseConventions = [
  { key: "hasAgentsMd", label: "AGENTS.md", color: "#007298" },
  { key: "hasClaudeMd", label: "CLAUDE.md", color: "#45842a" },
  { key: "hasReadme", label: "README.md", color: "#e77204" },
  { key: "hasCopilotInstructions", label: "Copilot instructions", color: "#9e1b32" },
  { key: "hasGenericAiDoc", label: "Generic AI docs", color: "#652f6c" },
] as const;

type VisibleTeamGroup = {
  slug: string;
  name: string;
  color: string;
  repositories: PulseRepoFilter[];
};

const documentationPostures = [
  { key: "missing", label: "Missing", color: "#b9c0c7" },
  { key: "minimal", label: "Minimal", color: "#e77204" },
  { key: "guided", label: "Guided", color: "#007298" },
  { key: "operational", label: "Operational", color: "#45842a" },
] as const;

const recencyBuckets = [
  { key: "active90", label: "Active <= 90d", color: "#007298" },
  { key: "active365", label: "Active <= 365d", color: "#45842a" },
  { key: "older", label: "Older history", color: "#e77204" },
  { key: "none", label: "No history", color: "#b9c0c7" },
] as const;

function getEmptyDataset(): PulseDataset {
  return {
    overview: { title: "", sourcePath: "", sourceNote: "", lastRunAt: "", lastFetchAt: "" },
    filters: { teams: [], repositories: [], conventions: [] },
    summary: { repositories: 0, analyzedRepositories: 0, failedRepositories: 0, totalFiles: 0, totalLines: 0 },
    conventionsByRepo: [],
    languageShare: [],
    repoLanguageShare: [],
    repoSizes: [],
    weeklyActivity: [],
    failures: [],
    aiFileActivity: [],
    aiDocWeeklyActivity: [],
  };
}

export function initPulseDashboard() {
  const pulseDatasetNode = document.querySelector("#pulse-dataset");
  const pulseDataset: PulseDataset = pulseDatasetNode
    ? (JSON.parse(pulseDatasetNode.textContent ?? "{}") as PulseDataset)
    : getEmptyDataset();

  const pulseTeams = pulseDataset.filters.teams;
  const pulseRepositories = pulseDataset.filters.repositories;
  const pulseParams = new URLSearchParams(window.location.search);
  const selectedTeams = new Set(
    (pulseParams.get("teams") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const selectedRepos = new Set(
    (pulseParams.get("repos") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  let pulseValueMode = pulseParams.get("mode") === "ratio" ? "ratio" : "total";
  let teamSearch = "";
  let repoSearch = "";

  const teamFilter = document.querySelector("#pulse-team-filter");
  const teamTrigger = document.querySelector("#pulse-team-trigger");
  const teamFilterLabel = document.querySelector("#pulse-team-filter-label");
  const teamPanel = document.querySelector("#pulse-team-panel");
  const teamSearchInput = document.querySelector("#pulse-team-search");
  const teamResetButton = teamFilter ? teamFilter.querySelector('[data-team-filter="all"]') : null;
  const teamCheckboxes = teamFilter ? [...teamFilter.querySelectorAll(".pulse-team-checkbox")] : [];
  const teamOptions = teamFilter ? [...teamFilter.querySelectorAll("[data-team-option]")] : [];

  const repoFilter = document.querySelector("#pulse-repo-filter");
  const repoTrigger = document.querySelector("#pulse-repo-trigger");
  const repoFilterLabel = document.querySelector("#pulse-repo-filter-label");
  const repoPanel = document.querySelector("#pulse-repo-panel");
  const repoSearchInput = document.querySelector("#pulse-repo-search");
  const repoResetButton = repoFilter ? repoFilter.querySelector('[data-repo-filter="all"]') : null;
  const repoCheckboxes = repoFilter ? [...repoFilter.querySelectorAll(".metrics-team-checkbox")] : [];
  const repoOptions = repoFilter ? [...repoFilter.querySelectorAll("[data-repo-option]")] : [];

  const pulseValueModeFilter = document.querySelector("#pulse-value-mode");
  const pulseValueModeButtons = pulseValueModeFilter ? [...pulseValueModeFilter.querySelectorAll("[data-value-mode]")] : [];

  const pulseSelectionMeta = document.querySelector("#pulse-selection-meta");
  const pulseSummaryRepositories = document.querySelector("#pulse-summary-repositories");
  const pulseSummaryAnalyzed = document.querySelector("#pulse-summary-analyzed");
  const pulseSummaryFailed = document.querySelector("#pulse-summary-failed");
  const pulseSummaryLines = document.querySelector("#pulse-summary-lines");
  const pulseSummaryFiles = document.querySelector("#pulse-summary-files");
  const pulseSummaryRun = document.querySelector("#pulse-summary-run");
  const pulseAiFilesMeta = document.querySelector("#pulse-ai-files-meta");

  const conventionsChartElement = document.querySelector("#pulse-conventions-chart");
  const sizeChartElement = document.querySelector("#pulse-size-chart");
  const weeklyChartElement = document.querySelector("#pulse-weekly-chart");
  const languageChartElement = document.querySelector("#pulse-language-chart");
  const aiFilesChartElement = document.querySelector("#pulse-ai-files-chart");
  const complexityChartElement = document.querySelector("#pulse-complexity-chart");
  const documentationPostureChartElement = document.querySelector("#pulse-doc-posture-chart");
  const recencyChartElement = document.querySelector("#pulse-recency-chart");

  let conventionsChartInstance: EChartsType | null = null;
  let sizeChartInstance: EChartsType | null = null;
  let weeklyChartInstance: EChartsType | null = null;
  let languageChartInstance: EChartsType | null = null;
  let aiFilesChartInstance: EChartsType | null = null;
  let complexityChartInstance: EChartsType | null = null;
  let documentationPostureChartInstance: EChartsType | null = null;
  let recencyChartInstance: EChartsType | null = null;

  const repoSizesByKey = new Map(pulseDataset.repoSizes.map((repo: PulseRepoSize) => [repo.repoKey, repo]));
  const repoConventionsByKey = new Map(
    pulseDataset.conventionsByRepo.map((repo: PulseConventionCoverage) => [repo.repoKey, repo]),
  );
  const repoWeeklyByKey = new Map(
    pulseDataset.weeklyActivity.map((repo: PulseWeeklyActivitySeries) => [repo.repoKey, repo]),
  );
  const pulseTeamsBySlug = new Map(pulseTeams.map((team: PulseTeamFilter) => [team.slug, team]));

  const formatInt = (value: number) => new Intl.NumberFormat("en-US").format(value || 0);
  const formatPercent = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value || 0);
  const formatCompactInt = (value: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
  const formatIsoTimestamp = (value: string) =>
    value
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(value))
      : "n/a";
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  const isDarkTheme = () => document.documentElement.dataset.theme === "dark";
  const getChartThemeTokens = () =>
    isDarkTheme()
      ? {
          textStrong: "#d9e6f2",
          textMuted: "#9fb3c8",
          tooltipBackground: "rgba(8, 14, 22, 0.96)",
          tooltipBorder: "rgba(171, 197, 216, 0.16)",
          splitLine: "rgba(171, 197, 216, 0.14)",
          pointBorder: "rgba(8, 14, 22, 0.6)",
        }
      : {
          textStrong: "#162028",
          textMuted: "#57636e",
          tooltipBackground: "rgba(255, 255, 255, 0.96)",
          tooltipBorder: "rgba(22, 32, 40, 0.12)",
          splitLine: "rgba(87, 99, 110, 0.16)",
          pointBorder: "rgba(22, 32, 40, 0.18)",
        };
  const parseWeekStart = (value: string) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const differenceInDays = (later: Date, earlier: Date) =>
    Math.round((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
  const classifyDocumentationPosture = (row: PulseConventionCoverage) => {
    if (row.totalConventionKinds === 0) {
      return "missing";
    }
    if (
      row.hasReadme &&
      (row.hasAgentsMd || row.hasClaudeMd) &&
      (row.hasCopilotInstructions || row.hasGenericAiDoc || row.totalConventionKinds >= 3)
    ) {
      return "operational";
    }
    if (row.hasReadme || row.hasAgentsMd || row.hasClaudeMd || row.hasCopilotInstructions || row.hasGenericAiDoc) {
      return row.totalConventionKinds >= 2 ? "guided" : "minimal";
    }
    return "minimal";
  };
  const colorForTeam = (teamSlug: string, fallback = "#333e48") => pulseTeamsBySlug.get(teamSlug)?.color ?? fallback;
  const getVisibleTeamGroups = (visibleRepos: PulseRepoFilter[]): VisibleTeamGroup[] => {
    const grouped = new Map<string, VisibleTeamGroup>();

    visibleRepos.forEach((repo) => {
      const existing = grouped.get(repo.teamSlug);
      if (existing) {
        existing.repositories.push(repo);
        return;
      }

      grouped.set(repo.teamSlug, {
        slug: repo.teamSlug,
        name: repo.teamName,
        color: colorForTeam(repo.teamSlug, repo.teamColor),
        repositories: [repo],
      });
    });

    return [...grouped.values()];
  };

  const getTeamScopedRepositories = (): PulseRepoFilter[] =>
    selectedTeams.size === 0
      ? pulseRepositories
      : pulseRepositories.filter((repo: PulseRepoFilter) => selectedTeams.has(repo.teamSlug));

  const getVisibleRepositories = (): PulseRepoFilter[] => {
    const teamScopedRepos = getTeamScopedRepositories();
    return selectedRepos.size === 0
      ? teamScopedRepos
      : teamScopedRepos.filter((repo: PulseRepoFilter) => selectedRepos.has(repo.repoKey));
  };

  const syncPulseButtons = () => {
    pulseValueModeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-value-mode") === pulseValueMode);
    });
  };

  const syncTeamFilterUi = () => {
    const selectedCount = selectedTeams.size;
    const selectedLabel =
      selectedCount === 0
        ? "All teams"
        : selectedCount === 1
          ? pulseTeams.find((team: PulseTeamFilter) => selectedTeams.has(team.slug))?.name ?? "1 team"
          : `${selectedCount} teams selected`;

    if (teamFilterLabel) {
      teamFilterLabel.textContent = selectedLabel;
    }

    teamCheckboxes.forEach((checkbox) => {
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = selectedTeams.has(checkbox.value);
      }
    });

    teamOptions.forEach((option) => {
      const searchTarget = option.getAttribute("data-search") ?? "";
      const matchesSearch = !teamSearch || searchTarget.includes(teamSearch);
      option.toggleAttribute("hidden", !matchesSearch);
    });

    if (teamResetButton instanceof HTMLElement) {
      teamResetButton.classList.toggle("is-active", selectedTeams.size === 0);
    }
  };

  const syncRepoFilterUi = () => {
    const availableRepoKeys = new Set(getTeamScopedRepositories().map((repo: PulseRepoFilter) => repo.repoKey));
    const visibleSelectedRepos = [...selectedRepos].filter((repoKey) => availableRepoKeys.has(repoKey));
    const selectedCount = visibleSelectedRepos.length;
    const selectedLabel =
      selectedCount === 0
        ? "All repositories"
        : selectedCount === 1
          ? pulseRepositories.find((repo: PulseRepoFilter) => visibleSelectedRepos.includes(repo.repoKey))?.repoName ??
            "1 repository"
          : `${selectedCount} repositories selected`;

    if (repoFilterLabel) {
      repoFilterLabel.textContent = selectedLabel;
    }

    repoCheckboxes.forEach((checkbox) => {
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = selectedRepos.has(checkbox.value);
        checkbox.disabled = !availableRepoKeys.has(checkbox.value);
      }
    });

    repoOptions.forEach((option) => {
      const searchTarget = option.getAttribute("data-search") ?? "";
      const checkbox = option.querySelector(".metrics-team-checkbox");
      const repoKey = checkbox instanceof HTMLInputElement ? checkbox.value : "";
      const matchesTeamScope = availableRepoKeys.has(repoKey);
      const matchesSearch = !repoSearch || searchTarget.includes(repoSearch);
      option.toggleAttribute("hidden", !(matchesTeamScope && matchesSearch));
    });

    if (repoResetButton instanceof HTMLElement) {
      repoResetButton.classList.toggle("is-active", selectedRepos.size === 0);
    }
  };

  const setTeamPanelOpen = (open: boolean) => {
    if (!(teamPanel instanceof HTMLElement) || !(teamTrigger instanceof HTMLButtonElement)) {
      return;
    }

    teamPanel.hidden = !open;
    teamTrigger.setAttribute("aria-expanded", open ? "true" : "false");

    if (open && teamSearchInput instanceof HTMLInputElement) {
      teamSearchInput.focus();
    }
  };

  const setRepoPanelOpen = (open: boolean) => {
    if (!(repoPanel instanceof HTMLElement) || !(repoTrigger instanceof HTMLButtonElement)) {
      return;
    }

    repoPanel.hidden = !open;
    repoTrigger.setAttribute("aria-expanded", open ? "true" : "false");

    if (open && repoSearchInput instanceof HTMLInputElement) {
      repoSearchInput.focus();
    }
  };

  const syncPulseQueryParams = () => {
    if (selectedTeams.size > 0) {
      pulseParams.set("teams", [...selectedTeams].join(","));
    } else {
      pulseParams.delete("teams");
    }

    if (selectedRepos.size > 0) {
      pulseParams.set("repos", [...selectedRepos].join(","));
    } else {
      pulseParams.delete("repos");
    }

    if (pulseValueMode === "ratio") {
      pulseParams.set("mode", "ratio");
    } else {
      pulseParams.delete("mode");
    }

    const nextUrl = pulseParams.toString() ? `?${pulseParams.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  };

  const renderPulseSummary = (visibleRepos: PulseRepoFilter[]) => {
    const visibleRepoKeys = new Set(visibleRepos.map((repo: PulseRepoFilter) => repo.repoKey));
    const analyzed = pulseDataset.repoSizes.filter((repo: PulseRepoSize) => visibleRepoKeys.has(repo.repoKey));
    const failures = pulseDataset.failures.filter((failure) => visibleRepoKeys.has(failure.repoKey));
    const totalLines = analyzed.reduce((sum, repo) => sum + repo.totalLines, 0);
    const totalFiles = analyzed.reduce((sum, repo) => sum + repo.totalFiles, 0);

    if (pulseSelectionMeta) {
      pulseSelectionMeta.textContent =
        selectedTeams.size === 0
          ? visibleRepos.length === pulseRepositories.length
            ? `All ${pulseRepositories.length} repositories across ${pulseTeams.length} teams • ${pulseValueMode === "ratio" ? "ratio mode" : "total mode"}`
            : `${visibleRepos.length} repositories selected • ${pulseValueMode === "ratio" ? "ratio mode" : "total mode"}`
          : `${selectedTeams.size} teams selected • ${visibleRepos.length} repositories in view • ${pulseValueMode === "ratio" ? "ratio mode" : "total mode"}`;
    }

    if (pulseSummaryRepositories) {
      pulseSummaryRepositories.textContent =
        pulseValueMode === "ratio"
          ? formatPercent(pulseRepositories.length > 0 ? visibleRepos.length / pulseRepositories.length : 0)
          : formatInt(visibleRepos.length);
    }

    if (pulseSummaryAnalyzed) {
      pulseSummaryAnalyzed.textContent =
        pulseValueMode === "ratio"
          ? formatPercent(
              pulseDataset.summary.analyzedRepositories > 0
                ? analyzed.length / pulseDataset.summary.analyzedRepositories
                : 0,
            )
          : formatInt(analyzed.length);
    }

    if (pulseSummaryFailed) {
      pulseSummaryFailed.textContent =
        pulseValueMode === "ratio"
          ? formatPercent(
              pulseDataset.summary.failedRepositories > 0
                ? failures.length / pulseDataset.summary.failedRepositories
                : 0,
            )
          : formatInt(failures.length);
    }

    if (pulseSummaryLines) {
      pulseSummaryLines.textContent =
        pulseValueMode === "ratio"
          ? formatPercent(pulseDataset.summary.totalLines > 0 ? totalLines / pulseDataset.summary.totalLines : 0)
          : formatCompactInt(totalLines);
    }

    if (pulseSummaryFiles) {
      pulseSummaryFiles.textContent =
        pulseValueMode === "ratio"
          ? formatPercent(pulseDataset.summary.totalFiles > 0 ? totalFiles / pulseDataset.summary.totalFiles : 0)
          : formatCompactInt(totalFiles);
    }

    if (pulseSummaryRun) {
      pulseSummaryRun.textContent = formatIsoTimestamp(pulseDataset.overview.lastRunAt);
    }

    if (pulseAiFilesMeta) {
      const visibleAiRepos = pulseDataset.aiDocWeeklyActivity.filter((activity: PulseAiDocWeeklyActivitySeries) =>
        visibleRepoKeys.has(activity.repoKey),
      ).length;
      const totalAiDocCommits = pulseDataset.aiDocWeeklyActivity
        .filter((activity: PulseAiDocWeeklyActivitySeries) => visibleRepoKeys.has(activity.repoKey))
        .reduce((sum, activity) => sum + activity.totalCommits, 0);
      pulseAiFilesMeta.textContent = `${visibleAiRepos} repositories in the visible selection show AI-document history, totaling ${formatInt(totalAiDocCommits)} commits`;
    }
  };

  const renderConventionsChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(conventionsChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!conventionsChartInstance) {
      conventionsChartInstance = echarts.init(conventionsChartElement, undefined, { renderer: "canvas" });
    }

    const visibleTeamGroups = getVisibleTeamGroups(visibleRepos)
      .map((team) => {
        const teamConventionRows = team.repositories
          .map((repo) => repoConventionsByKey.get(repo.repoKey))
          .filter((row): row is PulseConventionCoverage => Boolean(row));

        const conventionTotals = pulseConventions.map((convention) => ({
          key: convention.key,
          label: convention.label,
          value: teamConventionRows.reduce((sum, row) => sum + (row[convention.key] ? 1 : 0), 0),
        }));
        const totalHits = conventionTotals.reduce((sum, convention) => sum + convention.value, 0);

        return {
          ...team,
          repoCount: team.repositories.length,
          conventionTotals,
          totalHits,
        };
      })
      .sort((left, right) => right.totalHits - left.totalHits || left.name.localeCompare(right.name));
    const conventionOrder = pulseConventions
      .map((convention) => ({
        ...convention,
        totalHits: visibleTeamGroups.reduce(
          (sum, team) => sum + (team.conventionTotals.find((entry) => entry.key === convention.key)?.value ?? 0),
          0,
        ),
      }))
      .sort((left, right) => right.totalHits - left.totalHits || left.label.localeCompare(right.label));

    conventionsChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 132,
          right: 32,
          top: 72,
          bottom: 14,
        },
        legend: {
          type: "scroll",
          top: 12,
          left: 12,
          right: 12,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const points = Array.isArray(paramsList) ? paramsList : [paramsList];
            const conventionLabel = String((points[0] as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const lines = points
              .filter((point) => Number((point as { value?: number })?.value ?? 0) > 0)
              .map((point) => {
                const typedPoint = point as { seriesName: string; value?: number; marker: string };
                const team = visibleTeamGroups.find((entry) => entry.name === typedPoint.seriesName);
                if (!team) {
                  return `${typedPoint.marker} ${typedPoint.seriesName}: ${formatInt(Number(typedPoint.value ?? 0))}`;
                }
                const ratio = team.repoCount > 0 ? Number(typedPoint.value ?? 0) / team.repoCount : 0;
                return `${typedPoint.marker} ${team.name}: ${formatInt(Number(typedPoint.value ?? 0))} repos • ${formatPercent(ratio)} coverage`;
              });
            if (lines.length === 0) {
              return conventionLabel;
            }
            return [`<strong>${escapeHtml(conventionLabel)}</strong>`, ...lines].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: conventionOrder.map((convention) => convention.label),
          axisTick: { show: false },
          axisLabel: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        series: visibleTeamGroups.map((team) => ({
          name: team.name,
          type: "bar",
          stack: undefined,
          barMaxWidth: 18,
          barCategoryGap: "18%",
          itemStyle: {
            color: team.color,
            borderRadius: [0, 0, 0, 0],
          },
          data: conventionOrder.map((convention) => {
            const hitCount = team.conventionTotals.find((entry) => entry.key === convention.key)?.value ?? 0;
            return {
              value: pulseValueMode === "ratio" ? (team.repoCount > 0 ? hitCount / team.repoCount : 0) : hitCount,
            };
          }),
        })),
      },
      true,
    );
  };

  const renderSizeChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(sizeChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!sizeChartInstance) {
      sizeChartInstance = echarts.init(sizeChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRows = getVisibleTeamGroups(visibleRepos)
      .map((team) => {
        const repoRows = team.repositories
          .map((repo) => repoSizesByKey.get(repo.repoKey))
          .filter((row): row is PulseRepoSize => Boolean(row));

        return {
          ...team,
          repositoryCount: team.repositories.length,
          totalLines: repoRows.reduce((sum, row) => sum + row.totalLines, 0),
          totalFiles: repoRows.reduce((sum, row) => sum + row.totalFiles, 0),
          totalBytes: repoRows.reduce((sum, row) => sum + row.totalBytes, 0),
        };
      })
      .sort((left, right) => right.totalLines - left.totalLines || left.name.localeCompare(right.name));
    const totalLines = visibleRows.reduce((sum, row) => sum + row.totalLines, 0);

    sizeChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 132,
          right: 32,
          top: 6,
          bottom: 14,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const point = Array.isArray(paramsList) ? paramsList[0] : paramsList;
            const teamName = String((point as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const row = visibleRows.find((entry) => entry.name === teamName);
            if (!row) {
              return teamName;
            }
            const ratio = totalLines > 0 ? row.totalLines / totalLines : 0;
            return [
              `<strong>${escapeHtml(row.name)}</strong>`,
              `Repositories: ${formatInt(row.repositoryCount)}`,
              `Lines: ${formatInt(row.totalLines)}`,
              `Files: ${formatInt(row.totalFiles)}`,
              `Bytes: ${formatCompactInt(row.totalBytes)}`,
              `Share of visible lines: ${formatPercent(ratio)}`,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatCompactInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: visibleRows.map((row) => row.name),
          axisTick: { show: false },
          axisLabel: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        series: [
          {
            type: "bar",
            barMaxWidth: 34,
            barCategoryGap: "18%",
            data: visibleRows.map((row) => ({
              value: pulseValueMode === "ratio" ? (totalLines > 0 ? row.totalLines / totalLines : 0) : row.totalLines,
              itemStyle: {
                color: row.color,
                borderRadius: [0, 0, 0, 0],
              },
            })),
            label: {
              show: true,
              position: "right",
              color: chartTheme.textStrong,
              fontFamily: "Cascadia Code, Fira Code, monospace",
              fontSize: 11,
              formatter: (params: { value: number }) =>
                pulseValueMode === "ratio" ? formatPercent(params.value ?? 0) : formatCompactInt(params.value ?? 0),
            },
          },
        ],
      },
      true,
    );
  };

  const renderWeeklyChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(weeklyChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!weeklyChartInstance) {
      weeklyChartInstance = echarts.init(weeklyChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRows = getVisibleTeamGroups(visibleRepos)
      .map((team) => {
        const teamWeeklyRows = team.repositories
          .map((repo) => repoWeeklyByKey.get(repo.repoKey))
          .filter((row): row is PulseWeeklyActivitySeries => Boolean(row));
        const pointsByWeek = new Map<string, { commitCount: number; activeContributors: number }>();

        teamWeeklyRows.forEach((row) => {
          row.points.forEach((point) => {
            const current = pointsByWeek.get(point.weekStart) ?? { commitCount: 0, activeContributors: 0 };
            current.commitCount += point.commitCount;
            current.activeContributors += point.activeContributors;
            pointsByWeek.set(point.weekStart, current);
          });
        });

        const points = [...pointsByWeek.entries()]
          .map(([weekStart, value]) => ({
            weekStart,
            commitCount: value.commitCount,
            activeContributors: value.activeContributors,
          }))
          .sort((left, right) => left.weekStart.localeCompare(right.weekStart));

        return {
          ...team,
          repositoryCount: team.repositories.length,
          totalCommits: points.reduce((sum, point) => sum + point.commitCount, 0),
          points,
        };
      })
      .filter((row) => row.totalCommits > 0)
      .sort((left, right) => right.totalCommits - left.totalCommits || left.name.localeCompare(right.name));
    const weekOrder = [...new Set(visibleRows.flatMap((row) => row.points.map((point) => point.weekStart)))].sort();

    weeklyChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 72,
          right: 32,
          top: 72,
          bottom: 34,
        },
        legend: {
          type: "scroll",
          top: 12,
          left: 12,
          right: 12,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "axis",
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const points = Array.isArray(paramsList) ? paramsList : [paramsList];
            const week = String((points[0] as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const lines = points
              .filter((point) => Number((point as { data?: { commits?: number } })?.data?.commits ?? 0) > 0)
              .map((point) => {
                const typedPoint = point as {
                  marker: string;
                  seriesName: string;
                  data?: { commits?: number; contributors?: number };
                };
                const series = visibleRows.find((row) => row.name === typedPoint.seriesName);
                return `${typedPoint.marker} ${typedPoint.seriesName}: ${formatInt(typedPoint.data?.commits ?? 0)} commits • ${formatInt(typedPoint.data?.contributors ?? 0)} contributors • ${formatInt(series?.repositoryCount ?? 0)} repos`;
              });
            return [`<strong>${escapeHtml(week)}</strong>`, ...lines].join("<br/>");
          },
        },
        xAxis: {
          type: "category",
          data: weekOrder,
          axisLabel: {
            color: chartTheme.textMuted,
            rotate: 30,
          },
          axisLine: {
            lineStyle: { color: "rgba(87, 99, 110, 0.3)" },
          },
        },
        yAxis: {
          type: "value",
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => formatInt(value),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        series: visibleRows.map((row) => {
          const pointsByWeek = new Map(row.points.map((point) => [point.weekStart, point]));
          return {
            name: row.name,
            type: "line",
            smooth: false,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: {
              width: 2,
              color: row.color,
            },
            itemStyle: {
              color: row.color,
            },
            data: weekOrder.map((week) => {
              const point = pointsByWeek.get(week);
              return {
                value: point?.commitCount ?? 0,
                commits: point?.commitCount ?? 0,
                contributors: point?.activeContributors ?? 0,
              };
            }),
          };
        }),
      },
      true,
    );
  };

  const renderLanguageChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(languageChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!languageChartInstance) {
      languageChartInstance = echarts.init(languageChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRepoKeys = new Set(visibleRepos.map((repo: PulseRepoFilter) => repo.repoKey));
    const totalsByLanguage = new Map<string, number>();
    const totalsByLanguageAndTeam = new Map<string, Map<string, number>>();

    pulseDataset.repoLanguageShare.forEach((entry: PulseLanguageShare) => {
      if (!visibleRepoKeys.has(entry.repoKey)) {
        return;
      }

      totalsByLanguage.set(entry.language, (totalsByLanguage.get(entry.language) ?? 0) + entry.bytes);
      const teamTotals = totalsByLanguageAndTeam.get(entry.language) ?? new Map<string, number>();
      teamTotals.set(entry.teamSlug, (teamTotals.get(entry.teamSlug) ?? 0) + entry.bytes);
      totalsByLanguageAndTeam.set(entry.language, teamTotals);
    });

    const rows = [...totalsByLanguage.entries()]
      .map(([language, bytes]) => ({ language, bytes }))
      .sort((left, right) => right.bytes - left.bytes || left.language.localeCompare(right.language))
      .slice(0, 10);
    const visibleTeams = getVisibleTeamGroups(visibleRepos)
      .map((team) => ({
        ...team,
        totalBytes: pulseDataset.repoLanguageShare
          .filter((entry) => visibleRepoKeys.has(entry.repoKey) && entry.teamSlug === team.slug)
          .reduce((sum, entry) => sum + entry.bytes, 0),
      }))
      .sort((left, right) => right.totalBytes - left.totalBytes || left.name.localeCompare(right.name));
    const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);

    languageChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 132,
          right: 32,
          top: 72,
          bottom: 14,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const point = Array.isArray(paramsList) ? paramsList[0] : paramsList;
            const language = String((point as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const languageTeamTotals = totalsByLanguageAndTeam.get(language);
            if (!languageTeamTotals) {
              return language;
            }
            const lines = visibleTeams
              .map((team) => {
                const teamBytes = languageTeamTotals.get(team.slug) ?? 0;
                if (teamBytes <= 0) {
                  return null;
                }
                return `${team.name}: ${formatCompactInt(teamBytes)} • ${formatPercent(totalBytes > 0 ? teamBytes / totalBytes : 0)}`;
              })
              .filter(Boolean);
            const totalLanguageBytes = rows.find((entry) => entry.language === language)?.bytes ?? 0;
            return [
              `<strong>${escapeHtml(language)}</strong>`,
              `Visible bytes: ${formatCompactInt(totalLanguageBytes)}`,
              `Share of visible bytes: ${formatPercent(totalBytes > 0 ? totalLanguageBytes / totalBytes : 0)}`,
              ...lines,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatCompactInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: rows.map((row) => row.language),
          axisTick: { show: false },
          axisLabel: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        legend: {
          type: "scroll",
          top: 12,
          left: 12,
          right: 12,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        series: visibleTeams.map((team, teamIndex) => ({
          name: team.name,
          type: "bar",
          stack: "pulse-language-by-team",
          barMaxWidth: 28,
          barCategoryGap: "18%",
          itemStyle: {
            color: team.color,
            borderRadius: teamIndex === visibleTeams.length - 1 ? [0, 0, 0, 0] : [0, 0, 0, 0],
          },
          data: rows.map((row) => {
            const teamBytes = totalsByLanguageAndTeam.get(row.language)?.get(team.slug) ?? 0;
            return {
              value: pulseValueMode === "ratio" ? (totalBytes > 0 ? teamBytes / totalBytes : 0) : teamBytes,
            };
          }),
          label: {
            show: false,
          },
        })),
      },
      true,
    );
  };

  const renderComplexityChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(complexityChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!complexityChartInstance) {
      complexityChartInstance = echarts.init(complexityChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRows = visibleRepos
      .map((repo) => repoSizesByKey.get(repo.repoKey))
      .filter((row): row is PulseRepoSize => Boolean(row))
      .sort((left, right) => right.totalLines - left.totalLines || right.totalFiles - left.totalFiles);
    const maxFiles = Math.max(...visibleRows.map((row) => row.totalFiles), 0);
    const maxLines = Math.max(...visibleRows.map((row) => row.totalLines), 0);
    const visibleTeams = getVisibleTeamGroups(visibleRepos).sort((left, right) => left.name.localeCompare(right.name));

    complexityChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 72,
          right: 24,
          top: 64,
          bottom: 48,
        },
        legend: {
          type: "scroll",
          top: 12,
          left: 12,
          right: 12,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "item",
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (params: unknown) => {
            const point = params as {
              data?: {
                repoName: string;
                teamName: string;
                totalFiles: number;
                totalLines: number;
                totalBytes: number;
                generatedAt: string;
              };
            };
            const data = point.data;
            if (!data) {
              return "";
            }
            const avgLinesPerFile = data.totalFiles > 0 ? data.totalLines / data.totalFiles : 0;
            return [
              `<strong>${escapeHtml(data.repoName)}</strong>`,
              `Team: ${escapeHtml(data.teamName)}`,
              `Files: ${formatInt(data.totalFiles)}`,
              `Lines: ${formatInt(data.totalLines)}`,
              `Bytes: ${formatCompactInt(data.totalBytes)}`,
              `Lines per file: ${formatInt(Math.round(avgLinesPerFile))}`,
              `Generated: ${escapeHtml(formatIsoTimestamp(data.generatedAt))}`,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          name: pulseValueMode === "ratio" ? "Files / max visible files" : "Files",
          nameLocation: "middle",
          nameGap: 32,
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatCompactInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        yAxis: {
          type: "value",
          name: pulseValueMode === "ratio" ? "Lines / max visible lines" : "Lines",
          nameLocation: "middle",
          nameGap: 52,
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatCompactInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        series: visibleTeams.map((team) => ({
          name: team.name,
          type: "scatter",
          symbolSize: (value: number[]) => {
            const fileShare = value[0] ?? 0;
            const lineShare = value[1] ?? 0;
            if (pulseValueMode === "ratio") {
              return Math.max(10, Math.min(28, 10 + (fileShare + lineShare) * 8));
            }
            return 14;
          },
          itemStyle: {
            color: team.color,
            borderColor: chartTheme.pointBorder,
            borderWidth: 1,
          },
          data: visibleRows
            .filter((row) => row.teamSlug === team.slug)
            .map((row) => ({
              value: [
                pulseValueMode === "ratio" ? (maxFiles > 0 ? row.totalFiles / maxFiles : 0) : row.totalFiles,
                pulseValueMode === "ratio" ? (maxLines > 0 ? row.totalLines / maxLines : 0) : row.totalLines,
              ],
              repoName: row.repoName,
              teamName: row.teamName,
              totalFiles: row.totalFiles,
              totalLines: row.totalLines,
              totalBytes: row.totalBytes,
              generatedAt: row.generatedAt,
            })),
        })),
      },
      true,
    );
  };

  const renderDocumentationPostureChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(documentationPostureChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!documentationPostureChartInstance) {
      documentationPostureChartInstance = echarts.init(documentationPostureChartElement, undefined, {
        renderer: "canvas",
      });
    }

    const visibleTeamGroups = getVisibleTeamGroups(visibleRepos)
      .map((team) => {
        const postureCounts = new Map(documentationPostures.map((posture) => [posture.key, 0]));
        team.repositories.forEach((repo) => {
          const conventionRow = repoConventionsByKey.get(repo.repoKey);
          const postureKey = conventionRow ? classifyDocumentationPosture(conventionRow) : "missing";
          postureCounts.set(postureKey, (postureCounts.get(postureKey) ?? 0) + 1);
        });
        return {
          ...team,
          repositoryCount: team.repositories.length,
          postureCounts,
          operationalShare:
            team.repositories.length > 0 ? (postureCounts.get("operational") ?? 0) / team.repositories.length : 0,
        };
      })
      .sort(
        (left, right) =>
          right.operationalShare - left.operationalShare || right.repositoryCount - left.repositoryCount || left.name.localeCompare(right.name),
      );

    documentationPostureChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 132,
          right: 32,
          top: 72,
          bottom: 14,
        },
        legend: {
          type: "scroll",
          top: 12,
          left: 12,
          right: 12,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const points = Array.isArray(paramsList) ? paramsList : [paramsList];
            const teamName = String((points[0] as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const row = visibleTeamGroups.find((entry) => entry.name === teamName);
            if (!row) {
              return teamName;
            }
            const lines = documentationPostures.map((posture) => {
              const raw = row.postureCounts.get(posture.key) ?? 0;
              const value = pulseValueMode === "ratio" ? (row.repositoryCount > 0 ? raw / row.repositoryCount : 0) : raw;
              return `${posture.label}: ${pulseValueMode === "ratio" ? formatPercent(value) : formatInt(raw)}`;
            });
            return [
              `<strong>${escapeHtml(row.name)}</strong>`,
              `Repositories: ${formatInt(row.repositoryCount)}`,
              ...lines,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: visibleTeamGroups.map((row) => row.name),
          axisTick: { show: false },
          axisLabel: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        series: documentationPostures.map((posture) => ({
          name: posture.label,
          type: "bar",
          stack: "pulse-documentation-posture",
          barMaxWidth: 30,
          itemStyle: {
            color: posture.color,
            borderRadius: [0, 0, 0, 0],
          },
          data: visibleTeamGroups.map((row) => {
            const raw = row.postureCounts.get(posture.key) ?? 0;
            return {
              value: pulseValueMode === "ratio" ? (row.repositoryCount > 0 ? raw / row.repositoryCount : 0) : raw,
            };
          }),
        })),
      },
      true,
    );
  };

  const renderRecencyChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(recencyChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!recencyChartInstance) {
      recencyChartInstance = echarts.init(recencyChartElement, undefined, { renderer: "canvas" });
    }

    const latestObservedWeek = pulseDataset.weeklyActivity
      .flatMap((series) => series.points.map((point) => point.weekStart))
      .sort()
      .at(-1);
    const latestObservedDate = latestObservedWeek ? parseWeekStart(latestObservedWeek) : null;

    const visibleTeamGroups = getVisibleTeamGroups(visibleRepos)
      .map((team) => {
        const bucketCounts = new Map(recencyBuckets.map((bucket) => [bucket.key, 0]));
        team.repositories.forEach((repo) => {
          const weeklyRow = repoWeeklyByKey.get(repo.repoKey);
          const lastWeek = weeklyRow?.points.map((point) => point.weekStart).sort().at(-1);
          const lastDate = lastWeek ? parseWeekStart(lastWeek) : null;

          if (!latestObservedDate || !lastDate) {
            bucketCounts.set("none", (bucketCounts.get("none") ?? 0) + 1);
            return;
          }

          const ageInDays = differenceInDays(latestObservedDate, lastDate);
          if (ageInDays <= 90) {
            bucketCounts.set("active90", (bucketCounts.get("active90") ?? 0) + 1);
            return;
          }
          if (ageInDays <= 365) {
            bucketCounts.set("active365", (bucketCounts.get("active365") ?? 0) + 1);
            return;
          }
          bucketCounts.set("older", (bucketCounts.get("older") ?? 0) + 1);
        });
        return {
          ...team,
          repositoryCount: team.repositories.length,
          bucketCounts,
          recentShare:
            team.repositories.length > 0 ? (bucketCounts.get("active90") ?? 0) / team.repositories.length : 0,
        };
      })
      .sort(
        (left, right) =>
          right.recentShare - left.recentShare || right.repositoryCount - left.repositoryCount || left.name.localeCompare(right.name),
      );

    recencyChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 132,
          right: 32,
          top: 72,
          bottom: 14,
        },
        legend: {
          type: "scroll",
          top: 12,
          left: 12,
          right: 12,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const points = Array.isArray(paramsList) ? paramsList : [paramsList];
            const teamName = String((points[0] as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const row = visibleTeamGroups.find((entry) => entry.name === teamName);
            if (!row) {
              return teamName;
            }
            const lines = recencyBuckets.map((bucket) => {
              const raw = row.bucketCounts.get(bucket.key) ?? 0;
              const value = pulseValueMode === "ratio" ? (row.repositoryCount > 0 ? raw / row.repositoryCount : 0) : raw;
              return `${bucket.label}: ${pulseValueMode === "ratio" ? formatPercent(value) : formatInt(raw)}`;
            });
            return [
              `<strong>${escapeHtml(row.name)}</strong>`,
              `Repositories: ${formatInt(row.repositoryCount)}`,
              latestObservedWeek ? `Reference week: ${escapeHtml(latestObservedWeek)}` : "Reference week: n/a",
              ...lines,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: visibleTeamGroups.map((row) => row.name),
          axisTick: { show: false },
          axisLabel: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        series: recencyBuckets.map((bucket) => ({
          name: bucket.label,
          type: "bar",
          stack: "pulse-recency-buckets",
          barMaxWidth: 30,
          itemStyle: {
            color: bucket.color,
            borderRadius: [0, 0, 0, 0],
          },
          data: visibleTeamGroups.map((row) => {
            const raw = row.bucketCounts.get(bucket.key) ?? 0;
            return {
              value: pulseValueMode === "ratio" ? (row.repositoryCount > 0 ? raw / row.repositoryCount : 0) : raw,
            };
          }),
        })),
      },
      true,
    );
  };

  const renderAiFilesChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(aiFilesChartElement instanceof HTMLElement)) {
      return;
    }
    const chartTheme = getChartThemeTokens();

    if (!aiFilesChartInstance) {
      aiFilesChartInstance = echarts.init(aiFilesChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRepoKeys = new Set(visibleRepos.map((repo: PulseRepoFilter) => repo.repoKey));
    const visibleRows = getVisibleTeamGroups(visibleRepos)
      .map((team) => {
        const aiRows = pulseDataset.aiDocWeeklyActivity.filter(
          (activity: PulseAiDocWeeklyActivitySeries) => visibleRepoKeys.has(activity.repoKey) && activity.teamSlug === team.slug,
        );
        const weeklyCommits = new Map<string, number>();
        let totalCommits = 0;

        aiRows.forEach((row) => {
          row.points.forEach((point) => {
            totalCommits += point.commitCount;
            weeklyCommits.set(point.weekStart, (weeklyCommits.get(point.weekStart) ?? 0) + point.commitCount);
          });
        });

        return {
          ...team,
          repositoryCount: team.repositories.length,
          aiRepositories: aiRows.length,
          totalCommits,
          weeklyCommits,
        };
      })
      .sort((left, right) => right.totalCommits - left.totalCommits || right.aiRepositories - left.aiRepositories || left.name.localeCompare(right.name));

    const weeks = Array.from(new Set(visibleRows.flatMap((row) => Array.from(row.weeklyCommits.keys())))).sort((left, right) =>
      left.localeCompare(right),
    );
    const weeklyTotals = weeks.map((week) =>
      visibleRows.reduce((sum, row) => sum + (row.weeklyCommits.get(week) ?? 0), 0),
    );

    aiFilesChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 72,
          right: 32,
          top: 72,
          bottom: 48,
        },
        legend: {
          type: "scroll",
          top: 12,
          left: 12,
          right: 12,
          itemWidth: 12,
          itemHeight: 12,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line" },
          backgroundColor: chartTheme.tooltipBackground,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          textStyle: {
            color: chartTheme.textStrong,
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const points = Array.isArray(paramsList) ? paramsList : [paramsList];
            const week = String((points[0] as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const weekIndex = weeks.findIndex((entry) => entry === week);
            const weekTotal = weekIndex >= 0 ? weeklyTotals[weekIndex] ?? 0 : 0;
            const lines = points
              .map((point) => {
                const seriesPoint = point as { seriesName?: string };
                const row = visibleRows.find((entry) => entry.name === seriesPoint.seriesName);
                if (!row) {
                  return "";
                }
                const raw = row.weeklyCommits.get(week) ?? 0;
                const value = pulseValueMode === "ratio" ? (weekTotal > 0 ? raw / weekTotal : 0) : raw;
                return `${escapeHtml(row.name)}: ${pulseValueMode === "ratio" ? formatPercent(value) : formatInt(raw)} (${formatInt(row.aiRepositories)} repos)`;
              })
              .filter(Boolean);

            return [
              `<strong>${escapeHtml(week)}</strong>`,
              `Visible AI-doc commits: ${formatInt(weekTotal)}`,
              ...lines,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "category",
          data: weeks,
          boundaryGap: false,
          axisLabel: {
            color: chartTheme.textMuted,
            rotate: 30,
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        yAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: chartTheme.textMuted,
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatInt(value)),
          },
          splitLine: {
            lineStyle: { color: chartTheme.splitLine },
          },
        },
        series: visibleRows.map((row) => ({
          name: row.name,
          type: "line",
          smooth: false,
          symbol: "circle",
          symbolSize: 8,
          showSymbol: weeks.length <= 18,
          lineStyle: {
            width: 3,
            color: row.color,
          },
          itemStyle: {
            color: row.color,
            borderColor: chartTheme.pointBorder,
            borderWidth: 1,
          },
          emphasis: {
            focus: "series",
          },
          data: weeks.map((week, index) => {
            const raw = row.weeklyCommits.get(week) ?? 0;
            return pulseValueMode === "ratio" ? (weeklyTotals[index] > 0 ? raw / weeklyTotals[index] : 0) : raw;
          }),
        })),
      },
      true,
    );
  };

  const renderPulseDashboard = () => {
    const visibleRepos = getVisibleRepositories();
    syncPulseButtons();
    syncTeamFilterUi();
    syncRepoFilterUi();
    syncPulseQueryParams();
    renderPulseSummary(visibleRepos);
    renderConventionsChart(visibleRepos);
    renderSizeChart(visibleRepos);
    renderWeeklyChart(visibleRepos);
    renderLanguageChart(visibleRepos);
    renderComplexityChart(visibleRepos);
    renderDocumentationPostureChart(visibleRepos);
    renderRecencyChart(visibleRepos);
    renderAiFilesChart(visibleRepos);
  };

  if (teamTrigger instanceof HTMLButtonElement) {
    teamTrigger.addEventListener("click", () => {
      const isOpen = teamTrigger.getAttribute("aria-expanded") === "true";
      setTeamPanelOpen(!isOpen);
    });
  }

    if (teamResetButton instanceof HTMLButtonElement) {
      teamResetButton.addEventListener("click", () => {
      selectedTeams.clear();
      renderPulseDashboard();
      setTeamPanelOpen(false);
    });
  }

  teamCheckboxes.forEach((checkbox) => {
    if (!(checkbox instanceof HTMLInputElement)) {
      return;
    }

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedTeams.add(checkbox.value);
      } else {
        selectedTeams.delete(checkbox.value);
      }

      const availableRepoKeys = new Set(getTeamScopedRepositories().map((repo: PulseRepoFilter) => repo.repoKey));
      [...selectedRepos].forEach((repoKey) => {
        if (!availableRepoKeys.has(repoKey)) {
          selectedRepos.delete(repoKey);
        }
      });

      renderPulseDashboard();
    });
  });

  if (teamSearchInput instanceof HTMLInputElement) {
    teamSearchInput.addEventListener("input", () => {
      teamSearch = teamSearchInput.value.trim().toLowerCase();
      syncTeamFilterUi();
    });
  }

  if (repoTrigger instanceof HTMLButtonElement) {
    repoTrigger.addEventListener("click", () => {
      const isOpen = repoTrigger.getAttribute("aria-expanded") === "true";
      setRepoPanelOpen(!isOpen);
    });
  }

  if (repoResetButton instanceof HTMLButtonElement) {
    repoResetButton.addEventListener("click", () => {
      selectedRepos.clear();
      renderPulseDashboard();
      setRepoPanelOpen(false);
    });
  }

  repoCheckboxes.forEach((checkbox) => {
    if (!(checkbox instanceof HTMLInputElement)) {
      return;
    }

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedRepos.add(checkbox.value);
      } else {
        selectedRepos.delete(checkbox.value);
      }

      renderPulseDashboard();
    });
  });

  if (repoSearchInput instanceof HTMLInputElement) {
    repoSearchInput.addEventListener("input", () => {
      repoSearch = repoSearchInput.value.trim().toLowerCase();
      syncRepoFilterUi();
    });
  }

  pulseValueModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      pulseValueMode = button.getAttribute("data-value-mode") === "ratio" ? "ratio" : "total";
      renderPulseDashboard();
    });
  });

  window.addEventListener("resize", () => {
    conventionsChartInstance?.resize();
    sizeChartInstance?.resize();
    weeklyChartInstance?.resize();
    languageChartInstance?.resize();
    complexityChartInstance?.resize();
    documentationPostureChartInstance?.resize();
    recencyChartInstance?.resize();
    aiFilesChartInstance?.resize();
  });

  document.addEventListener("site-theme-change", () => {
    renderPulseDashboard();
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      const clickedInsideTeamFilter = teamFilter instanceof HTMLElement && teamFilter.contains(event.target);
      const clickedInsideRepoFilter = repoFilter instanceof HTMLElement && repoFilter.contains(event.target);

      if (!clickedInsideTeamFilter) {
        setTeamPanelOpen(false);
      }

      if (!clickedInsideRepoFilter) {
        setRepoPanelOpen(false);
      }
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setTeamPanelOpen(false);
      setRepoPanelOpen(false);
    }
  });

  renderPulseDashboard();
}
