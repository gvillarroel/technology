import { getDataset } from "./site-catalog";

export interface AiMetricsPlatformUsage {
  platform: string;
  users: number;
  activeRepositories: number;
  monthlySessions: number;
}

export interface AiMetricsModelUsage {
  model: string;
  users: number;
  monthlySessions: number;
  monthlyTokens: number;
}

export interface AiMetricsTeam {
  slug: string;
  name: string;
  color: string;
  repositories: string[];
  platformUsage: AiMetricsPlatformUsage[];
  modelUsage: AiMetricsModelUsage[];
  metrics: {
    monthlyActiveUsers: number;
    monthlySessions: number;
    estimatedMonthlySpendUsd: number;
    repositoriesWithAiDocs: number;
    repositoriesWithRuntimeAi: number;
  };
}

export interface AiMetricsDemoDataset {
  overview: {
    title: string;
    sourceNote: string;
  };
  teams: AiMetricsTeam[];
}

export function getAiMetricsDemoDataset(): Promise<AiMetricsDemoDataset> {
  return getDataset<AiMetricsDemoDataset>("ai-metrics-demo");
}
