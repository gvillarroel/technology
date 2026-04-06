import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

interface TeamMetricSeed {
  copilot: number;
  claude: number;
  codex: number;
  sessions: number;
  spend: number;
  models: {
    gpt5: number;
    gpt5Mini: number;
    claudeSonnet4: number;
    claudeOpus4: number;
    claudeHaiku35: number;
  };
}

interface OwnerCsvRow {
  repo: string;
  owner: string;
  owner_color: string;
}

const averageTokensPerModelSession = {
  gpt5: 12400,
  gpt5Mini: 7600,
  claudeSonnet4: 11800,
  claudeOpus4: 16400,
  claudeHaiku35: 5200,
} as const;

const pulseOwnersCsvPath = join(
  "C:",
  "Users",
  "villa",
  "dev",
  "pulse",
  "examples",
  "gvillarroel-all-repos",
  "input",
  "gvillarroel-repos-owned.csv",
);

const fallbackOwnersCsv = `repo,owner,owner_color
technology,Atlas,#1f77b4
knowledge,Atlas,#1f77b4
pulse,Atlas,#1f77b4
agent-news,Aurora,#ff7f0e
adk-conn,Aurora,#ff7f0e
skill-arena,Beacon,#2ca02c
zx-harness,Beacon,#2ca02c
prompt-lab,Forge,#d62728
workflow-canvas,Forge,#d62728
ops-telemetry,Helix,#9467bd
incident-helper,Helix,#9467bd
docs-runtime,Lattice,#8c564b
repository-catalog,Lattice,#8c564b
model-registry,Nimbus,#e377c2
eval-orchestrator,Nimbus,#e377c2
playwright-review,Nova,#7f7f7f
release-console,Nova,#7f7f7f
delivery-gates,Quasar,#bcbd22
team-radar,Quasar,#bcbd22
codex-tooling,Vertex,#17becf
skills-index,Vertex,#17becf
`;

const teamMetricSeedByOwner: Record<string, TeamMetricSeed> = {
  Atlas: {
    copilot: 34, claude: 18, codex: 12, sessions: 910, spend: 4820,
    models: { gpt5: 18, gpt5Mini: 12, claudeSonnet4: 14, claudeOpus4: 6, claudeHaiku35: 4 },
  },
  Aurora: {
    copilot: 29, claude: 16, codex: 9, sessions: 804, spend: 4210,
    models: { gpt5: 15, gpt5Mini: 11, claudeSonnet4: 12, claudeOpus4: 4, claudeHaiku35: 3 },
  },
  Beacon: {
    copilot: 17, claude: 11, codex: 7, sessions: 436, spend: 2480,
    models: { gpt5: 8, gpt5Mini: 6, claudeSonnet4: 7, claudeOpus4: 3, claudeHaiku35: 2 },
  },
  Forge: {
    copilot: 21, claude: 13, codex: 8, sessions: 552, spend: 3010,
    models: { gpt5: 10, gpt5Mini: 8, claudeSonnet4: 9, claudeOpus4: 3, claudeHaiku35: 2 },
  },
  Helix: {
    copilot: 31, claude: 17, codex: 10, sessions: 846, spend: 4475,
    models: { gpt5: 16, gpt5Mini: 10, claudeSonnet4: 14, claudeOpus4: 5, claudeHaiku35: 3 },
  },
  Lattice: {
    copilot: 24, claude: 14, codex: 9, sessions: 628, spend: 3395,
    models: { gpt5: 11, gpt5Mini: 9, claudeSonnet4: 10, claudeOpus4: 4, claudeHaiku35: 2 },
  },
  Nimbus: {
    copilot: 27, claude: 22, codex: 13, sessions: 932, spend: 5180,
    models: { gpt5: 12, gpt5Mini: 10, claudeSonnet4: 17, claudeOpus4: 9, claudeHaiku35: 4 },
  },
  Nova: {
    copilot: 19, claude: 12, codex: 11, sessions: 590, spend: 3275,
    models: { gpt5: 8, gpt5Mini: 8, claudeSonnet4: 8, claudeOpus4: 4, claudeHaiku35: 3 },
  },
  Quasar: {
    copilot: 22, claude: 15, codex: 10, sessions: 644, spend: 3560,
    models: { gpt5: 10, gpt5Mini: 9, claudeSonnet4: 10, claudeOpus4: 4, claudeHaiku35: 3 },
  },
  Vertex: {
    copilot: 18, claude: 12, codex: 14, sessions: 618, spend: 3710,
    models: { gpt5: 7, gpt5Mini: 8, claudeSonnet4: 8, claudeOpus4: 6, claudeHaiku35: 2 },
  },
};

function toSlug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function parseCsv(raw: string): OwnerCsvRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const [repo = "", owner = "", ownerColor = ""] = line.split(",");

    return {
      repo: repo.trim(),
      owner: owner.trim(),
      owner_color: ownerColor.trim(),
    };
  });
}

export async function getAiMetricsDemoDataset(): Promise<AiMetricsDemoDataset> {
  const rawCsv = await readFile(pulseOwnersCsvPath, "utf-8").catch(() => fallbackOwnersCsv);
  const rows = parseCsv(rawCsv);
  const groupedTeams = new Map<string, OwnerCsvRow[]>();

  for (const row of rows) {
    const currentRows = groupedTeams.get(row.owner) ?? [];
    currentRows.push(row);
    groupedTeams.set(row.owner, currentRows);
  }

  const teams = [...groupedTeams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([owner, ownerRows]) => {
      const seed = teamMetricSeedByOwner[owner] ?? {
        copilot: 12,
        claude: 8,
        codex: 6,
        sessions: 300,
        spend: 1800,
        models: { gpt5: 5, gpt5Mini: 4, claudeSonnet4: 5, claudeOpus4: 2, claudeHaiku35: 1 },
      };
      const repoCount = ownerRows.length;

      return {
        slug: toSlug(owner),
        name: owner,
        color: ownerRows[0]?.owner_color ?? "#333e48",
        repositories: ownerRows.map((row) => row.repo),
        platformUsage: [
          {
            platform: "GitHub Copilot",
            users: seed.copilot,
            activeRepositories: Math.min(repoCount, Math.max(2, Math.floor(repoCount * 0.8))),
            monthlySessions: Math.trunc(seed.sessions * 0.48),
          },
          {
            platform: "Claude Code",
            users: seed.claude,
            activeRepositories: Math.min(repoCount, Math.max(2, Math.floor(repoCount * 0.65))),
            monthlySessions: Math.trunc(seed.sessions * 0.31),
          },
          {
            platform: "OpenAI Codex",
            users: seed.codex,
            activeRepositories: Math.min(repoCount, Math.max(1, Math.floor(repoCount * 0.55))),
            monthlySessions: Math.trunc(seed.sessions * 0.21),
          },
        ],
        modelUsage: [
          {
            model: "GPT-5",
            users: seed.models.gpt5,
            monthlySessions: Math.trunc(seed.sessions * 0.24),
            monthlyTokens: Math.trunc(seed.sessions * 0.24 * averageTokensPerModelSession.gpt5),
          },
          {
            model: "GPT-5 Mini",
            users: seed.models.gpt5Mini,
            monthlySessions: Math.trunc(seed.sessions * 0.18),
            monthlyTokens: Math.trunc(seed.sessions * 0.18 * averageTokensPerModelSession.gpt5Mini),
          },
          {
            model: "Claude Sonnet 4",
            users: seed.models.claudeSonnet4,
            monthlySessions: Math.trunc(seed.sessions * 0.32),
            monthlyTokens: Math.trunc(seed.sessions * 0.32 * averageTokensPerModelSession.claudeSonnet4),
          },
          {
            model: "Claude Opus 4",
            users: seed.models.claudeOpus4,
            monthlySessions: Math.trunc(seed.sessions * 0.16),
            monthlyTokens: Math.trunc(seed.sessions * 0.16 * averageTokensPerModelSession.claudeOpus4),
          },
          {
            model: "Claude Haiku 3.5",
            users: seed.models.claudeHaiku35,
            monthlySessions: Math.trunc(seed.sessions * 0.1),
            monthlyTokens: Math.trunc(seed.sessions * 0.1 * averageTokensPerModelSession.claudeHaiku35),
          },
        ],
        metrics: {
          monthlyActiveUsers: seed.copilot + seed.claude + seed.codex,
          monthlySessions: seed.sessions,
          estimatedMonthlySpendUsd: seed.spend,
          repositoriesWithAiDocs: Math.max(2, Math.min(repoCount, Math.floor(repoCount * 0.75))),
          repositoriesWithRuntimeAi: Math.max(1, Math.min(repoCount, Math.floor(repoCount * 0.45))),
        },
      };
    });

  return {
    overview: {
      title: "AI Metrics Demo",
      sourceNote:
        "Simulated organizational metrics built from the owner distribution in the pulse example input and generated at load time from the owner CSV.",
    },
    teams,
  };
}
