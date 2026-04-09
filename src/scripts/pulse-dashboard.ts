import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import type { EChartsType } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import type {
  PulseConventionCoverage,
  PulseDataset,
  PulseFailureLedgerRow,
  PulseLanguageShare,
  PulseRepoFilter,
  PulseRepoSize,
  PulseWeeklyActivitySeries,
} from "../lib/pulse";

echarts.use([BarChart, LineChart, CanvasRenderer, GridComponent, LegendComponent, TooltipComponent]);

const pulseConventions = [
  { key: "hasAgentsMd", label: "AGENTS.md", color: "#007298" },
  { key: "hasClaudeMd", label: "CLAUDE.md", color: "#45842a" },
  { key: "hasReadme", label: "README.md", color: "#e77204" },
  { key: "hasCopilotInstructions", label: "Copilot instructions", color: "#9e1b32" },
  { key: "hasGenericAiDoc", label: "Generic AI docs", color: "#652f6c" },
] as const;

const pulsePalette = [
  "#007298",
  "#45842a",
  "#e77204",
  "#9e1b32",
  "#652f6c",
  "#0f5b78",
  "#a75800",
  "#2a5f18",
  "#8c3141",
  "#4d4f7f",
];

function getEmptyDataset(): PulseDataset {
  return {
    overview: { title: "", sourcePath: "", sourceNote: "", lastRunAt: "", lastFetchAt: "" },
    filters: { repositories: [], conventions: [] },
    summary: { repositories: 0, analyzedRepositories: 0, failedRepositories: 0, totalFiles: 0, totalLines: 0 },
    conventionsByRepo: [],
    languageShare: [],
    repoLanguageShare: [],
    repoSizes: [],
    weeklyActivity: [],
    failures: [],
  };
}

export function initPulseDashboard() {
  const pulseDatasetNode = document.querySelector("#pulse-dataset");
  const pulseDataset: PulseDataset = pulseDatasetNode
    ? (JSON.parse(pulseDatasetNode.textContent ?? "{}") as PulseDataset)
    : getEmptyDataset();

  const pulseRepositories = pulseDataset.filters.repositories;
  const pulseParams = new URLSearchParams(window.location.search);
  const selectedRepos = new Set(
    (pulseParams.get("repos") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  let pulseValueMode = pulseParams.get("mode") === "ratio" ? "ratio" : "total";
  let repoSearch = "";

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
  const pulseFailureMeta = document.querySelector("#pulse-failure-meta");
  const pulseFailureTableBody = document.querySelector("#pulse-failure-table-body");

  const conventionsChartElement = document.querySelector("#pulse-conventions-chart");
  const sizeChartElement = document.querySelector("#pulse-size-chart");
  const weeklyChartElement = document.querySelector("#pulse-weekly-chart");
  const languageChartElement = document.querySelector("#pulse-language-chart");

  let conventionsChartInstance: EChartsType | null = null;
  let sizeChartInstance: EChartsType | null = null;
  let weeklyChartInstance: EChartsType | null = null;
  let languageChartInstance: EChartsType | null = null;

  const repoSizesByKey = new Map(pulseDataset.repoSizes.map((repo: PulseRepoSize) => [repo.repoKey, repo]));
  const repoConventionsByKey = new Map(
    pulseDataset.conventionsByRepo.map((repo: PulseConventionCoverage) => [repo.repoKey, repo]),
  );
  const repoWeeklyByKey = new Map(
    pulseDataset.weeklyActivity.map((repo: PulseWeeklyActivitySeries) => [repo.repoKey, repo]),
  );

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
  const colorForRepo = (repoKey: string) => {
    let hash = 0;
    for (const char of repoKey) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return pulsePalette[hash % pulsePalette.length];
  };

  const getVisibleRepositories = (): PulseRepoFilter[] =>
    selectedRepos.size === 0
      ? pulseRepositories
      : pulseRepositories.filter((repo: PulseRepoFilter) => selectedRepos.has(repo.repoKey));

  const syncPulseButtons = () => {
    pulseValueModeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-value-mode") === pulseValueMode);
    });
  };

  const syncRepoFilterUi = () => {
    const selectedCount = selectedRepos.size;
    const selectedLabel =
      selectedCount === 0
        ? "All repositories"
        : selectedCount === 1
          ? pulseRepositories.find((repo: PulseRepoFilter) => selectedRepos.has(repo.repoKey))?.repoName ?? "1 repository"
          : `${selectedCount} repositories selected`;

    if (repoFilterLabel) {
      repoFilterLabel.textContent = selectedLabel;
    }

    repoCheckboxes.forEach((checkbox) => {
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = selectedRepos.has(checkbox.value);
      }
    });

    repoOptions.forEach((option) => {
      const searchTarget = option.getAttribute("data-search") ?? "";
      const matchesSearch = !repoSearch || searchTarget.includes(repoSearch);
      option.toggleAttribute("hidden", !matchesSearch);
    });

    if (repoResetButton instanceof HTMLElement) {
      repoResetButton.classList.toggle("is-active", selectedRepos.size === 0);
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
    const failures = pulseDataset.failures.filter((failure: PulseFailureLedgerRow) => visibleRepoKeys.has(failure.repoKey));
    const totalLines = analyzed.reduce((sum, repo) => sum + repo.totalLines, 0);
    const totalFiles = analyzed.reduce((sum, repo) => sum + repo.totalFiles, 0);

    if (pulseSelectionMeta) {
      pulseSelectionMeta.textContent =
        visibleRepos.length === pulseRepositories.length
          ? `All ${pulseRepositories.length} repositories in view • ${pulseValueMode === "ratio" ? "ratio mode" : "total mode"}`
          : `${visibleRepos.length} repositories selected • ${pulseValueMode === "ratio" ? "ratio mode" : "total mode"}`;
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

    if (pulseFailureMeta) {
      pulseFailureMeta.textContent = `${failures.length} failed repositories in the visible selection`;
    }
  };

  const renderConventionsChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(conventionsChartElement instanceof HTMLElement)) {
      return;
    }

    if (!conventionsChartInstance) {
      conventionsChartInstance = echarts.init(conventionsChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRows = visibleRepos
      .map((repo: PulseRepoFilter) => repoConventionsByKey.get(repo.repoKey))
      .filter((row): row is PulseConventionCoverage => Boolean(row))
      .sort((left, right) => right.totalConventionKinds - left.totalConventionKinds || left.repoName.localeCompare(right.repoName));

    const totalSlots = pulseConventions.length;

    conventionsChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 156,
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
            color: "#162028",
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "rgba(22, 32, 40, 0.12)",
          borderWidth: 1,
          textStyle: {
            color: "#162028",
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const points = Array.isArray(paramsList) ? paramsList : [paramsList];
            const repoName = String((points[0] as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const row = visibleRows.find((entry) => entry.repoName === repoName);
            if (!row) {
              return repoName;
            }

            return [
              `<strong>${escapeHtml(repoName)}</strong>`,
              `Coverage: ${formatInt(row.totalConventionKinds)} / ${formatInt(totalSlots)} conventions`,
              `Generic AI docs matched: ${formatInt(row.genericAiDocCount)}`,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : totalSlots,
          axisLabel: {
            color: "#57636e",
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatInt(value)),
          },
          splitLine: {
            lineStyle: { color: "rgba(87, 99, 110, 0.16)" },
          },
        },
        yAxis: {
          type: "category",
          data: visibleRows.map((row) => row.repoName),
          axisTick: { show: false },
          axisLabel: {
            color: "#162028",
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        series: pulseConventions.map((convention) => ({
          name: convention.label,
          type: "bar",
          stack: "pulse-conventions",
          barMaxWidth: 30,
          barCategoryGap: "18%",
          itemStyle: {
            color: convention.color,
            borderRadius: [0, 0, 0, 0],
          },
          data: visibleRows.map((row) => ({
            value: Boolean(row[convention.key]) ? (pulseValueMode === "ratio" ? 1 / totalSlots : 1) : 0,
          })),
        })),
      },
      true,
    );
  };

  const renderSizeChart = (visibleRepos: PulseRepoFilter[]) => {
    if (!(sizeChartElement instanceof HTMLElement)) {
      return;
    }

    if (!sizeChartInstance) {
      sizeChartInstance = echarts.init(sizeChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRows = visibleRepos
      .map((repo: PulseRepoFilter) => repoSizesByKey.get(repo.repoKey))
      .filter((row): row is PulseRepoSize => Boolean(row))
      .sort((left, right) => right.totalLines - left.totalLines || left.repoName.localeCompare(right.repoName));
    const totalLines = visibleRows.reduce((sum, row) => sum + row.totalLines, 0);

    sizeChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 156,
          right: 32,
          top: 6,
          bottom: 14,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "rgba(22, 32, 40, 0.12)",
          borderWidth: 1,
          textStyle: {
            color: "#162028",
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const point = Array.isArray(paramsList) ? paramsList[0] : paramsList;
            const repoName = String((point as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const row = visibleRows.find((entry) => entry.repoName === repoName);
            if (!row) {
              return repoName;
            }
            const ratio = totalLines > 0 ? row.totalLines / totalLines : 0;
            return [
              `<strong>${escapeHtml(row.repoName)}</strong>`,
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
            color: "#57636e",
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatCompactInt(value)),
          },
          splitLine: {
            lineStyle: { color: "rgba(87, 99, 110, 0.16)" },
          },
        },
        yAxis: {
          type: "category",
          data: visibleRows.map((row) => row.repoName),
          axisTick: { show: false },
          axisLabel: {
            color: "#162028",
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
                color: colorForRepo(row.repoKey),
                borderRadius: [0, 0, 0, 0],
              },
            })),
            label: {
              show: true,
              position: "right",
              color: "#162028",
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

    if (!weeklyChartInstance) {
      weeklyChartInstance = echarts.init(weeklyChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRows = visibleRepos
      .map((repo: PulseRepoFilter) => repoWeeklyByKey.get(repo.repoKey))
      .filter((row): row is PulseWeeklyActivitySeries => Boolean(row))
      .filter((row) => row.totalCommits > 0)
      .sort((left, right) => right.totalCommits - left.totalCommits || left.repoName.localeCompare(right.repoName))
      .slice(0, 8);
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
            color: "#162028",
            fontFamily: "Cascadia Code, Fira Code, monospace",
            fontSize: 12,
            fontWeight: 700,
          },
        },
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "rgba(22, 32, 40, 0.12)",
          borderWidth: 1,
          textStyle: {
            color: "#162028",
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
                return `${typedPoint.marker} ${typedPoint.seriesName}: ${formatInt(typedPoint.data?.commits ?? 0)} commits • ${formatInt(typedPoint.data?.contributors ?? 0)} contributors`;
              });
            return [`<strong>${escapeHtml(week)}</strong>`, ...lines].join("<br/>");
          },
        },
        xAxis: {
          type: "category",
          data: weekOrder,
          axisLabel: {
            color: "#57636e",
            rotate: 30,
          },
          axisLine: {
            lineStyle: { color: "rgba(87, 99, 110, 0.3)" },
          },
        },
        yAxis: {
          type: "value",
          axisLabel: {
            color: "#57636e",
            formatter: (value: number) => formatInt(value),
          },
          splitLine: {
            lineStyle: { color: "rgba(87, 99, 110, 0.16)" },
          },
        },
        series: visibleRows.map((row) => {
          const pointsByWeek = new Map(row.points.map((point) => [point.weekStart, point]));
          return {
            name: row.repoName,
            type: "line",
            smooth: false,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: {
              width: 2,
              color: colorForRepo(row.repoKey),
            },
            itemStyle: {
              color: colorForRepo(row.repoKey),
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

    if (!languageChartInstance) {
      languageChartInstance = echarts.init(languageChartElement, undefined, { renderer: "canvas" });
    }

    const visibleRepoKeys = new Set(visibleRepos.map((repo: PulseRepoFilter) => repo.repoKey));
    const totalsByLanguage = new Map<string, number>();

    pulseDataset.repoLanguageShare.forEach((entry: PulseLanguageShare) => {
      if (!visibleRepoKeys.has(entry.repoKey)) {
        return;
      }

      totalsByLanguage.set(entry.language, (totalsByLanguage.get(entry.language) ?? 0) + entry.bytes);
    });

    const rows = [...totalsByLanguage.entries()]
      .map(([language, bytes]) => ({ language, bytes }))
      .sort((left, right) => right.bytes - left.bytes || left.language.localeCompare(right.language))
      .slice(0, 10);
    const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);

    languageChartInstance.setOption(
      {
        animationDuration: 250,
        animationDurationUpdate: 250,
        grid: {
          left: 156,
          right: 32,
          top: 6,
          bottom: 14,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "rgba(22, 32, 40, 0.12)",
          borderWidth: 1,
          textStyle: {
            color: "#162028",
            fontFamily: "Cascadia Code, Fira Code, monospace",
          },
          formatter: (paramsList: unknown) => {
            const point = Array.isArray(paramsList) ? paramsList[0] : paramsList;
            const language = String((point as { axisValueLabel?: string })?.axisValueLabel ?? "");
            const row = rows.find((entry) => entry.language === language);
            if (!row) {
              return language;
            }

            return [
              `<strong>${escapeHtml(row.language)}</strong>`,
              `Bytes: ${formatCompactInt(row.bytes)}`,
              `Share of visible bytes: ${formatPercent(totalBytes > 0 ? row.bytes / totalBytes : 0)}`,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "value",
          max: pulseValueMode === "ratio" ? 1 : undefined,
          axisLabel: {
            color: "#57636e",
            formatter: (value: number) => (pulseValueMode === "ratio" ? formatPercent(value) : formatCompactInt(value)),
          },
          splitLine: {
            lineStyle: { color: "rgba(87, 99, 110, 0.16)" },
          },
        },
        yAxis: {
          type: "category",
          data: rows.map((row) => row.language),
          axisTick: { show: false },
          axisLabel: {
            color: "#162028",
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
            data: rows.map((row) => ({
              value: pulseValueMode === "ratio" ? (totalBytes > 0 ? row.bytes / totalBytes : 0) : row.bytes,
              itemStyle: {
                color: "#007298",
                borderRadius: [0, 0, 0, 0],
              },
            })),
            label: {
              show: true,
              position: "right",
              color: "#162028",
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

  const renderFailureTable = (visibleRepos: PulseRepoFilter[]) => {
    if (!(pulseFailureTableBody instanceof HTMLElement)) {
      return;
    }

    const visibleRepoKeys = new Set(visibleRepos.map((repo: PulseRepoFilter) => repo.repoKey));
    const rows = pulseDataset.failures.filter((failure: PulseFailureLedgerRow) => visibleRepoKeys.has(failure.repoKey));

    if (rows.length === 0) {
      pulseFailureTableBody.innerHTML =
        '<tr><td colspan="5" class="pulse-failure-empty">No failed repositories in the visible selection.</td></tr>';
      return;
    }

    pulseFailureTableBody.innerHTML = rows
      .map(
        (failure) => `
          <tr>
            <td>${escapeHtml(failure.repoName)}</td>
            <td>${escapeHtml(failure.stage || "n/a")}</td>
            <td>${escapeHtml(failure.status || "n/a")}</td>
            <td>${escapeHtml(formatIsoTimestamp(failure.updatedAt))}</td>
            <td>${escapeHtml(failure.detail || "n/a")}</td>
          </tr>
        `,
      )
      .join("");
  };

  const renderPulseDashboard = () => {
    const visibleRepos = getVisibleRepositories();
    syncPulseButtons();
    syncRepoFilterUi();
    syncPulseQueryParams();
    renderPulseSummary(visibleRepos);
    renderConventionsChart(visibleRepos);
    renderSizeChart(visibleRepos);
    renderWeeklyChart(visibleRepos);
    renderLanguageChart(visibleRepos);
    renderFailureTable(visibleRepos);
  };

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
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!(repoFilter instanceof HTMLElement) || !(event.target instanceof Node)) {
        return;
      }

      if (!repoFilter.contains(event.target)) {
        setRepoPanelOpen(false);
      }
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setRepoPanelOpen(false);
    }
  });

  renderPulseDashboard();
}
