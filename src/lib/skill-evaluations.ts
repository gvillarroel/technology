import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export interface SkillEvaluationPrompt {
  id: string;
  description: string;
}

export interface SkillEvaluationProfile {
  id: string;
  description: string;
}

export interface SkillEvaluationVariant {
  id: string;
  adapter: string;
  model: string;
  variantDisplayName: string;
}

export interface SkillEvaluationCell {
  promptId: string;
  profileId: string;
  variantId: string;
  variantDisplayName: string;
  completedRuns: number;
  passCount: number;
  successRatio: number;
}

export interface SkillEvaluation {
  id: string;
  skillKey: string;
  benchmark: {
    id: string;
    description: string;
    tags: string[];
  };
  task: {
    prompts: SkillEvaluationPrompt[];
  };
  workspace: {
    sources: Array<{ type: string; target: string; path?: string }>;
    initializeGit: boolean;
    skillSource: {
      type: string;
      repo: string;
      skillPath: string;
    };
    installStrategy: string;
  };
  evaluation: {
    assertions: string[];
    requests: number;
    timeoutMs: number;
    maxConcurrency: number;
    noCache: boolean;
    tracing: boolean;
  };
  comparison: {
    profiles: SkillEvaluationProfile[];
    variants: SkillEvaluationVariant[];
  };
  results: {
    startedAt: string;
    completedAt: string;
    passCount: number;
    totalRuns: number;
    averageSuccessRatio: number;
    cells: SkillEvaluationCell[];
  };
}

export interface SkillEvaluationSummary {
  evaluated: boolean;
  evaluationCount: number;
  averageSuccessRatio: number;
  totalPassCount: number;
  totalRuns: number;
}

const skillEvaluationsYamlPath = join(process.cwd(), "data", "skill-evaluations.yaml");

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

function toBoolean(value: unknown) {
  return value === true || String(value ?? "").trim().toLowerCase() === "true";
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
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

export async function getSkillEvaluations(): Promise<SkillEvaluation[]> {
  const rawFile = await readFile(skillEvaluationsYamlPath, "utf-8");
  const document = parse(rawFile) as { evaluations?: Array<Record<string, unknown>> };
  const evaluations = document.evaluations ?? [];

  return evaluations.map((evaluation) => {
    const benchmark = (evaluation.benchmark as Record<string, unknown> | undefined) ?? {};
    const task = (evaluation.task as Record<string, unknown> | undefined) ?? {};
    const workspace = (evaluation.workspace as Record<string, unknown> | undefined) ?? {};
    const skill = (evaluation.skill as Record<string, unknown> | undefined) ?? {};
    const skillSource = (workspace.skill_source as Record<string, unknown> | undefined) ?? {};
    const comparison = (evaluation.comparison as Record<string, unknown> | undefined) ?? {};
    const runtime = (evaluation.evaluation as Record<string, unknown> | undefined) ?? {};
    const results = (evaluation.results as Record<string, unknown> | undefined) ?? {};
    const cells = Array.isArray(results.cells) ? results.cells : [];
    const passCount = toNumber(results.pass_count);
    const totalRuns = toNumber(results.total_runs);

    return {
      id: toScalar(evaluation.id),
      skillKey: `${toScalar(skill.repository_slug)}:${toScalar(skill.slug)}`,
      benchmark: {
        id: toScalar(benchmark.id),
        description: toScalar(benchmark.description),
        tags: toList(benchmark.tags),
      },
      task: {
        prompts: (Array.isArray(task.prompts) ? task.prompts : []).map((prompt) => ({
          id: toScalar(prompt.id),
          description: toScalar(prompt.description),
        })),
      },
      workspace: {
        sources: (Array.isArray(workspace.sources) ? workspace.sources : []).map((source) => ({
          type: toScalar(source.type),
          target: toScalar(source.target),
          path: toScalar(source.path),
        })),
        initializeGit: toBoolean(workspace.initialize_git),
        skillSource: {
          type: toScalar(skillSource.type),
          repo: toScalar(skillSource.repo),
          skillPath: toScalar(skillSource.skill_path),
        },
        installStrategy: toScalar(workspace.install_strategy),
      },
      evaluation: {
        assertions: toList(runtime.assertions),
        requests: toNumber(runtime.requests),
        timeoutMs: toNumber(runtime.timeout_ms),
        maxConcurrency: toNumber(runtime.max_concurrency),
        noCache: toBoolean(runtime.no_cache),
        tracing: toBoolean(runtime.tracing),
      },
      comparison: {
        profiles: (Array.isArray(comparison.profiles) ? comparison.profiles : []).map((profile) => ({
          id: toScalar(profile.id),
          description: toScalar(profile.description),
        })),
        variants: (Array.isArray(comparison.variants) ? comparison.variants : []).map((variant) => ({
          id: toScalar(variant.id),
          adapter: toScalar(variant.adapter),
          model: toScalar(variant.model),
          variantDisplayName: toScalar(variant.variant_display_name),
        })),
      },
      results: {
        startedAt: toScalar(results.started_at),
        completedAt: toScalar(results.completed_at),
        passCount,
        totalRuns,
        averageSuccessRatio: totalRuns > 0 ? passCount / totalRuns : 0,
        cells: cells.map((cell) => {
          const completedRuns = toNumber(cell.completed_runs);
          const cellPassCount = toNumber(cell.pass_count);

          return {
            promptId: toScalar(cell.prompt_id),
            profileId: toScalar(cell.profile_id),
            variantId: toScalar(cell.variant_id),
            variantDisplayName: toScalar(cell.variant_display_name),
            completedRuns,
            passCount: cellPassCount,
            successRatio: completedRuns > 0 ? cellPassCount / completedRuns : 0,
          };
        }),
      },
    };
  });
}

export async function getSkillEvaluationsBySkillKey() {
  const evaluations = await getSkillEvaluations();

  return evaluations.reduce((map, evaluation) => {
    const list = map.get(evaluation.skillKey) ?? [];
    list.push(evaluation);
    map.set(evaluation.skillKey, list);
    return map;
  }, new Map<string, SkillEvaluation[]>());
}

export function summarizeSkillEvaluations(evaluations: SkillEvaluation[]): SkillEvaluationSummary {
  const totalPassCount = evaluations.reduce((sum, evaluation) => sum + evaluation.results.passCount, 0);
  const totalRuns = evaluations.reduce((sum, evaluation) => sum + evaluation.results.totalRuns, 0);

  return {
    evaluated: evaluations.length > 0,
    evaluationCount: evaluations.length,
    averageSuccessRatio: totalRuns > 0 ? totalPassCount / totalRuns : 0,
    totalPassCount,
    totalRuns,
  };
}
