import { execFileSync } from "node:child_process";
import { join } from "node:path";

export interface PulseOverview {
  title: string;
  sourcePath: string;
  sourceNote: string;
  lastRunAt: string;
  lastFetchAt: string;
}

export interface PulseRepoFilter {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  url: string;
}

export interface PulseSummary {
  repositories: number;
  analyzedRepositories: number;
  failedRepositories: number;
  totalFiles: number;
  totalLines: number;
}

export interface PulseConventionCoverage {
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

export interface PulseLanguageShare {
  repoKey: string;
  repoName: string;
  language: string;
  bytes: number;
}

export interface PulseRepoSize {
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

export interface PulseWeeklyActivitySeries {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  totalCommits: number;
  points: PulseWeeklyActivityPoint[];
}

export interface PulseFailureLedgerRow {
  repoKey: string;
  repoName: string;
  repoSlug: string;
  url: string;
  stage: string;
  status: string;
  updatedAt: string;
  detail: string;
}

export interface PulseDataset {
  overview: PulseOverview;
  filters: {
    repositories: PulseRepoFilter[];
    conventions: string[];
  };
  summary: PulseSummary;
  conventionsByRepo: PulseConventionCoverage[];
  languageShare: Array<{
    language: string;
    bytes: number;
  }>;
  repoLanguageShare: PulseLanguageShare[];
  repoSizes: PulseRepoSize[];
  weeklyActivity: PulseWeeklyActivitySeries[];
  failures: PulseFailureLedgerRow[];
}

const pulseReportsPath = join(
  "C:",
  "Users",
  "villa",
  "dev",
  "pulse",
  "examples",
  "gvillarroel-all-repos",
  "reports",
  "parquet-zstd",
);

const pulseConventions = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "Copilot instructions",
  "Generic AI docs",
] as const;

const pulsePythonScript = String.raw`
import json
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath

import pyarrow.parquet as pq

base = Path(sys.argv[1])

def read_rows(name):
    path = base / name
    if not path.exists():
        return []
    return pq.read_table(path).to_pylist()

def repo_name_from_key(repo_key):
    parts = str(repo_key).split("/")
    return parts[-1] if parts else str(repo_key)

def repo_slug(name):
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(name).strip())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-")

def update_repo(registry, repo_key, repo_name=None, url=None):
    repo_key = str(repo_key or "").strip()
    if not repo_key:
        return None
    repo = registry.setdefault(
        repo_key,
        {
            "repoKey": repo_key,
            "repoName": repo_name_from_key(repo_key),
            "repoSlug": repo_slug(repo_name_from_key(repo_key)),
            "url": str(url or "").strip(),
        },
    )
    if repo_name:
        repo["repoName"] = str(repo_name).strip()
        repo["repoSlug"] = repo_slug(repo["repoName"])
    if url and not repo["url"]:
        repo["url"] = str(url).strip()
    return repo

def is_markdown(path_value):
    return str(path_value).lower().endswith(".md")

def classify_generic_ai_doc(path_lower):
    name = PurePosixPath(path_lower).name
    if name in {"agents.md", "claude.md", "readme.md", "copilot-instructions.md"}:
        return False
    if not path_lower.endswith(".md"):
        return False
    generic_names = {
        "ai.md",
        "llms.md",
        "skills.md",
        "skill.md",
        "assistant.md",
        "prompt.md",
        "prompts.md",
        "codex.md",
        "cursor.md",
        "windsurf.md",
    }
    if name in generic_names:
        return True
    if "/.github/instructions/" in path_lower:
        return True
    if "/prompts/" in path_lower:
        return True
    if "/ai/" in path_lower and path_lower.endswith(".md"):
        return True
    return False

latest_rows = read_rows("latest_repo_snapshots.parquet")
current_file_rows = read_rows("current_file_snapshots.parquet")
weekly_rows = read_rows("weekly_evolution.parquet")
failed_rows = read_rows("failed_repositories.parquet")
run_rows = read_rows("runs.parquet")
fetch_rows = read_rows("fetch_state.parquet")

registry = {}
repo_sizes = {}
repo_languages = defaultdict(lambda: defaultdict(int))
repo_weekly_points = defaultdict(list)
repo_weekly_totals = defaultdict(int)
repo_conventions = defaultdict(lambda: {
    "hasAgentsMd": False,
    "hasClaudeMd": False,
    "hasReadme": False,
    "hasCopilotInstructions": False,
    "hasGenericAiDoc": False,
    "genericAiDocCount": 0,
})

for row in latest_rows:
    repo = update_repo(registry, row.get("repo_key"), row.get("name"), row.get("url"))
    if repo is None:
        continue
    repo_sizes[repo["repoKey"]] = {
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "url": repo["url"],
        "totalFiles": int(row.get("total_files") or 0),
        "totalBytes": int(row.get("total_bytes") or 0),
        "totalLines": int(row.get("total_lines") or 0),
        "generatedAt": str(row.get("generated_at") or ""),
    }

for row in failed_rows:
    update_repo(registry, row.get("repo_key"), row.get("name"), row.get("url"))

for row in fetch_rows:
    update_repo(registry, row.get("repo_key"), None, row.get("remote_url"))

for row in current_file_rows:
    repo = update_repo(registry, row.get("repo_key"), row.get("name"), row.get("url"))
    if repo is None:
        continue

    path_value = str(row.get("path") or "")
    path_lower = path_value.replace("\\", "/").lower()
    name = PurePosixPath(path_lower).name
    size_bytes = int(row.get("size_bytes") or 0)
    language = str(row.get("language") or "").strip() or "Unknown"
    repo_languages[repo["repoKey"]][language] += size_bytes

    convention = repo_conventions[repo["repoKey"]]
    if name == "agents.md":
        convention["hasAgentsMd"] = True
    elif name == "claude.md":
        convention["hasClaudeMd"] = True
    elif name == "readme.md":
        convention["hasReadme"] = True
    elif name == "copilot-instructions.md":
        convention["hasCopilotInstructions"] = True
    elif classify_generic_ai_doc(path_lower):
        convention["hasGenericAiDoc"] = True
        convention["genericAiDocCount"] += 1

for row in weekly_rows:
    repo = update_repo(registry, row.get("repo_key"))
    if repo is None:
        continue
    commit_count = int(row.get("commit_count") or 0)
    repo_weekly_totals[repo["repoKey"]] += commit_count
    repo_weekly_points[repo["repoKey"]].append({
        "weekStart": str(row.get("week_start") or ""),
        "commitCount": commit_count,
        "activeContributors": int(row.get("active_contributors") or 0),
    })

conventions_by_repo = []
for repo_key, repo in registry.items():
    convention = repo_conventions[repo_key]
    total_kinds = sum(
        1
        for key in (
            "hasAgentsMd",
            "hasClaudeMd",
            "hasReadme",
            "hasCopilotInstructions",
            "hasGenericAiDoc",
        )
        if convention[key]
    )
    total_matches = total_kinds - (1 if convention["hasGenericAiDoc"] else 0) + convention["genericAiDocCount"]
    conventions_by_repo.append({
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "url": repo["url"],
        **convention,
        "totalConventionKinds": total_kinds,
        "totalConventionMatches": total_matches,
    })

repo_language_share = []
language_totals = defaultdict(int)
for repo_key, language_map in repo_languages.items():
    repo = registry.get(repo_key) or update_repo(registry, repo_key)
    for language, bytes_value in language_map.items():
        language_totals[language] += bytes_value
        repo_language_share.append({
            "repoKey": repo["repoKey"],
            "repoName": repo["repoName"],
            "language": language,
            "bytes": int(bytes_value),
        })

repo_size_rows = list(repo_sizes.values())

weekly_activity = []
for repo_key, points in repo_weekly_points.items():
    repo = registry.get(repo_key) or update_repo(registry, repo_key)
    weekly_activity.append({
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "totalCommits": int(repo_weekly_totals[repo_key]),
        "points": sorted(points, key=lambda point: point["weekStart"]),
    })

failures = []
for row in failed_rows:
    repo = registry.get(str(row.get("repo_key") or "")) or update_repo(registry, row.get("repo_key"), row.get("name"), row.get("url"))
    if repo is None:
        continue
    failures.append({
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "url": repo["url"],
        "stage": str(row.get("stage") or ""),
        "status": str(row.get("status") or ""),
        "updatedAt": str(row.get("updated_at") or ""),
        "detail": str(row.get("detail") or ""),
    })

summary = {
    "repositories": len(registry),
    "analyzedRepositories": len(repo_size_rows),
    "failedRepositories": len(failures),
    "totalFiles": sum(int(row.get("totalFiles") or 0) for row in repo_size_rows),
    "totalLines": sum(int(row.get("totalLines") or 0) for row in repo_size_rows),
}

last_run = max((str(row.get("finished_at") or row.get("started_at") or "") for row in run_rows), default="")
last_fetch = max((str(row.get("fetched_at") or "") for row in fetch_rows), default="")

result = {
    "overview": {
        "title": "Pulse Repository Evidence",
        "sourcePath": str(base),
        "sourceNote": "Repository evidence derived at build time from Pulse parquet exports, normalized into compact operational charts for AI SDLC.",
        "lastRunAt": last_run,
        "lastFetchAt": last_fetch,
    },
    "filters": {
        "repositories": sorted(registry.values(), key=lambda repo: repo["repoName"].lower()),
        "conventions": [
            "AGENTS.md",
            "CLAUDE.md",
            "README.md",
            "Copilot instructions",
            "Generic AI docs",
        ],
    },
    "summary": summary,
    "conventionsByRepo": sorted(
        conventions_by_repo,
        key=lambda row: (-row["totalConventionKinds"], row["repoName"].lower()),
    ),
    "languageShare": [
        {"language": language, "bytes": int(bytes_value)}
        for language, bytes_value in sorted(language_totals.items(), key=lambda item: (-item[1], item[0].lower()))
    ][:12],
    "repoLanguageShare": sorted(
        repo_language_share,
        key=lambda row: (row["repoName"].lower(), -row["bytes"], row["language"].lower()),
    ),
    "repoSizes": sorted(repo_size_rows, key=lambda row: (-row["totalLines"], row["repoName"].lower())),
    "weeklyActivity": sorted(weekly_activity, key=lambda row: (-row["totalCommits"], row["repoName"].lower())),
    "failures": sorted(failures, key=lambda row: (row["status"], row["repoName"].lower())),
}

print(json.dumps(result))
`;

let pulseDatasetPromise: Promise<PulseDataset> | undefined;

function getEmptyPulseDataset(sourceNote: string): PulseDataset {
  return {
    overview: {
      title: "Pulse Repository Evidence",
      sourcePath: pulseReportsPath,
      sourceNote,
      lastRunAt: "",
      lastFetchAt: "",
    },
    filters: {
      repositories: [],
      conventions: [...pulseConventions],
    },
    summary: {
      repositories: 0,
      analyzedRepositories: 0,
      failedRepositories: 0,
      totalFiles: 0,
      totalLines: 0,
    },
    conventionsByRepo: [],
    languageShare: [],
    repoLanguageShare: [],
    repoSizes: [],
    weeklyActivity: [],
    failures: [],
  };
}

export async function getPulseDataset(): Promise<PulseDataset> {
  if (!pulseDatasetPromise) {
    pulseDatasetPromise = Promise.resolve().then(() => {
      try {
        const output = execFileSync("python", ["-c", pulsePythonScript, pulseReportsPath], {
          cwd: process.cwd(),
          encoding: "utf-8",
          maxBuffer: 24 * 1024 * 1024,
        }).trim();

        if (!output) {
          return getEmptyPulseDataset("Pulse parquet export returned no rows at build time.");
        }

        return JSON.parse(output) as PulseDataset;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Pulse loader error";
        return getEmptyPulseDataset(`Pulse parquet export could not be loaded at build time: ${message}`);
      }
    });
  }

  return pulseDatasetPromise;
}
