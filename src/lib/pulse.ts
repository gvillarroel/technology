import { getDataset } from "./site-catalog";

export interface PulseOverview {
  title: string;
  sourcePath: string;
  sourceNote: string;
  lastRunAt: string;
  lastFetchAt: string;
}

export interface PulseTeamFilter {
  slug: string;
  name: string;
  color: string;
  repositoryCount: number;
}

export interface PulseRepoFilter {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  url: string;
  teamSlug: string;
  teamName: string;
  teamColor: string;
}

export interface PulseSummary {
  repositories: number;
  analyzedRepositories: number;
  failedRepositories: number;
  totalFiles: number;
  totalLines: number;
}

interface PulseTeamScopedRow {
  teamSlug: string;
  teamName: string;
  teamColor: string;
}

export interface PulseConventionCoverage extends PulseTeamScopedRow {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  url: string;
  hasAgentsMd: boolean;
  hasClaudeMd: boolean;
  hasReadme: boolean;
  hasCopilotInstructions: boolean;
  hasGenericAiDoc: boolean;
  genericAiDocCount: number;
  totalConventionKinds: number;
  totalConventionMatches: number;
}

export interface PulseLanguageShare extends PulseTeamScopedRow {
  repoKey: string;
  repoName: string;
  language: string;
  bytes: number;
}

export interface PulseRepoSize extends PulseTeamScopedRow {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  url: string;
  totalFiles: number;
  totalBytes: number;
  totalLines: number;
  generatedAt: string;
}

export interface PulseWeeklyActivityPoint {
  weekStart: string;
  commitCount: number;
  activeContributors: number;
}

export interface PulseWeeklyActivitySeries extends PulseTeamScopedRow {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  totalCommits: number;
  points: PulseWeeklyActivityPoint[];
}

export interface PulseFailureLedgerRow extends PulseTeamScopedRow {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  url: string;
  stage: string;
  status: string;
  updatedAt: string;
  detail: string;
}

export interface PulseAiFileActivity extends PulseTeamScopedRow {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  url: string;
  aiFileCount: number;
  aiLineCount: number;
  aiBytes: number;
  agentsCount: number;
  claudeCount: number;
  copilotCount: number;
  genericAiDocCount: number;
}

export interface PulseAiDocWeeklyActivityPoint {
  weekStart: string;
  commitCount: number;
}

export interface PulseAiDocWeeklyActivitySeries extends PulseTeamScopedRow {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  totalCommits: number;
  points: PulseAiDocWeeklyActivityPoint[];
}

export interface PulseDataset {
  overview: PulseOverview;
  filters: {
    teams: PulseTeamFilter[];
    repositories: PulseRepoFilter[];
    conventions: string[];
  };
  summary: PulseSummary;
  conventionsByRepo: PulseConventionCoverage[];
  languageShare: Array<{ language: string; bytes: number }>;
  repoLanguageShare: PulseLanguageShare[];
  repoSizes: PulseRepoSize[];
  weeklyActivity: PulseWeeklyActivitySeries[];
  failures: PulseFailureLedgerRow[];
  aiFileActivity: PulseAiFileActivity[];
  aiDocWeeklyActivity: PulseAiDocWeeklyActivitySeries[];
}

export function getPulseDataset(): Promise<PulseDataset> {
  return getDataset<PulseDataset>("pulse-dataset");
}
