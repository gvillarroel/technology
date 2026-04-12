import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

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

export interface PulseDataset {
  overview: PulseOverview;
  filters: {
    teams: PulseTeamFilter[];
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
  aiFileActivity: PulseAiFileActivity[];
}

interface PulseTeamConfig {
  slug: string;
  name: string;
  color: string;
  repositories: string[];
}

interface PulseTeamConfigDocument {
  teams?: PulseTeamConfig[];
}

const pulseOutputRoot = join(
  "C:",
  "Users",
  "villa",
  "dev",
  "pulse",
  "examples",
  "gvillarroel-all-repos",
  "output",
);

const pulseReportsRoot = join(
  "C:",
  "Users",
  "villa",
  "dev",
  "pulse",
  "examples",
  "gvillarroel-all-repos",
  "reports",
);

const pulseTeamConfigPath = join(process.cwd(), "data", "pulse-repo-teams.yaml");

const pulseConventions = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "Copilot instructions",
  "Generic AI docs",
] as const;

const pulseConventionsJson = JSON.stringify([...pulseConventions]);

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

function toRepoList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => toScalar(item)).filter(Boolean)
    : [];
}

async function getPulseTeamAssignments() {
  const rawConfig = await readFile(pulseTeamConfigPath, "utf-8");
  const document = parse(rawConfig) as PulseTeamConfigDocument;
  const teams = Array.isArray(document.teams)
    ? document.teams.map((team) => ({
        slug: toScalar(team.slug),
        name: toScalar(team.name),
        color: toScalar(team.color),
        repositories: toRepoList(team.repositories),
      }))
    : [];

  const assignments = Object.fromEntries(
    teams.flatMap((team) =>
      team.repositories.flatMap((repository) => {
        const normalized = repository.toLowerCase();
        return [
          [normalized, { teamSlug: team.slug, teamName: team.name, teamColor: team.color }],
          [`github/gvillarroel/${normalized}`, { teamSlug: team.slug, teamName: team.name, teamColor: team.color }],
        ];
      }),
    ),
  );

  return { teams, assignments };
}

const pulsePythonScript = String.raw`
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath

output_root = Path(sys.argv[1])
reports_root = Path(sys.argv[2])
team_config = json.loads(sys.argv[3])
assignment_map = team_config.get("assignments", {})
configured_teams = team_config.get("teams", [])
default_team = {
    "teamSlug": "unassigned",
    "teamName": "Unassigned",
    "teamColor": "#333e48",
}

def to_int(value):
    try:
        return int(value or 0)
    except Exception:
        return 0

def discover_latest_db(root):
    best = None
    best_key = ("", 0)
    for candidate in root.glob("*/db/pulse.sqlite"):
        try:
            conn = sqlite3.connect(candidate)
            cur = conn.cursor()
            latest_run = cur.execute("select max(coalesce(finished_at, started_at)) from runs").fetchone()[0] or ""
            conn.close()
        except Exception:
            latest_run = ""
        key = (str(latest_run), candidate.stat().st_mtime_ns)
        if key > best_key:
            best_key = key
            best = candidate
    return best

def slugify(value):
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "").strip())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-")

def repo_name_from_key(repo_key):
    parts = str(repo_key or "").split("/")
    return parts[-1] if parts else str(repo_key or "")

def format_team_name(team_slug):
    slug = str(team_slug or "").strip()
    if not slug:
        return ""
    normalized = slug.replace("_", "-")
    if normalized.startswith("team-"):
        suffix = normalized.split("-", 1)[1].replace("-", " ").strip()
        return f"Team {suffix}"
    return normalized.replace("-", " ").title()

db_path = discover_latest_db(output_root)
if db_path is None:
    print(json.dumps({
        "overview": {
            "title": "Pulse Repository Evidence",
            "sourcePath": str(output_root),
        "sourceNote": "No Pulse SQLite export was found under the configured output root.",
        "lastRunAt": "",
        "lastFetchAt": "",
        },
        "filters": {"teams": [], "repositories": [], "conventions": ${pulseConventionsJson}},
        "summary": {
            "repositories": 0,
            "analyzedRepositories": 0,
            "failedRepositories": 0,
            "totalFiles": 0,
            "totalLines": 0,
        },
        "conventionsByRepo": [],
        "languageShare": [],
        "repoLanguageShare": [],
        "repoSizes": [],
        "weeklyActivity": [],
        "failures": [],
        "aiFileActivity": [],
    }))
    raise SystemExit(0)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

def read_rows(query, params=()):
    return [dict(row) for row in cur.execute(query, params).fetchall()]

def resolve_team(repo_key, repo_name, source_team_slug="", source_team_color=""):
    for candidate in (str(repo_name or "").lower(), str(repo_key or "").lower()):
        team_meta = assignment_map.get(candidate)
        if team_meta:
            return {
                "teamSlug": str(team_meta.get("teamSlug") or default_team["teamSlug"]),
                "teamName": str(team_meta.get("teamName") or default_team["teamName"]),
                "teamColor": str(team_meta.get("teamColor") or default_team["teamColor"]),
            }
    team_slug = str(source_team_slug or "").strip()
    if team_slug:
        return {
            "teamSlug": team_slug,
            "teamName": format_team_name(team_slug) or team_slug,
            "teamColor": str(source_team_color or default_team["teamColor"]),
        }
    return dict(default_team)

def update_repo(registry, repo_key, repo_name=None, url=None, source_team_slug="", source_team_color=""):
    repo_key = str(repo_key or "").strip()
    if not repo_key:
        return None
    current_name = str(repo_name or "").strip() or repo_name_from_key(repo_key)
    current = registry.setdefault(
        repo_key,
        {
            "repoKey": repo_key,
            "repoName": current_name,
            "repoSlug": slugify(current_name),
            "url": str(url or "").strip(),
            **resolve_team(repo_key, current_name, source_team_slug, source_team_color),
        },
    )
    if repo_name:
        current["repoName"] = current_name
        current["repoSlug"] = slugify(current_name)
    if url and not current["url"]:
        current["url"] = str(url).strip()
    current.update(resolve_team(repo_key, current["repoName"], source_team_slug, source_team_color))
    return current

repositories = read_rows("""
    select repo_key, name, url, team, team_color
    from repositories
    where active = 1 or active is null
""")
repo_snapshot_rows = read_rows("""
    select repo_key, revision, total_files, total_bytes, total_lines, generated_at
    from repo_snapshots
    order by generated_at desc, repo_key asc
""")
file_snapshot_rows = read_rows("""
    select repo_key, revision, path, language, extension, size_bytes, line_count, is_binary, depth
    from file_snapshots
""")
weekly_rows = read_rows("""
    select repo_key, week_start, commit_count, active_contributors
    from weekly_evolution
""")
fetch_rows = read_rows("""
    select repo_key, remote_url, fetched_revision, fetched_at
    from fetch_state
""")
run_rows = read_rows("""
    select started_at, finished_at, command
    from runs
""")
ai_doc_rows = read_rows("""
    select repo_key, path, doc_name, category, first_seen_week_start
    from ai_doc_occurrences
""")
failure_rows = read_rows("""
    select repo_key, stage, status, updated_at, detail
    from repo_stage_checkpoints
    where status = 'failed'
    order by updated_at desc, repo_key asc, stage asc
""")

registry = {}
for row in repositories:
    update_repo(
        registry,
        row.get("repo_key"),
        row.get("name"),
        row.get("url"),
        row.get("team"),
        row.get("team_color"),
    )

for row in fetch_rows:
    update_repo(registry, row.get("repo_key"), url=row.get("remote_url"))

latest_repo_snapshots = {}
latest_revision_by_repo = {}
for row in repo_snapshot_rows:
    repo_key = str(row.get("repo_key") or "").strip()
    if not repo_key or repo_key in latest_repo_snapshots:
        continue
    latest_repo_snapshots[repo_key] = row
    latest_revision_by_repo[repo_key] = str(row.get("revision") or "")
    update_repo(registry, repo_key)

repo_sizes = {}
for repo_key, row in latest_repo_snapshots.items():
    repo = registry.get(repo_key) or update_repo(registry, repo_key)
    repo_sizes[repo_key] = {
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "url": repo["url"],
        "teamSlug": repo["teamSlug"],
        "teamName": repo["teamName"],
        "teamColor": repo["teamColor"],
        "totalFiles": to_int(row.get("total_files")),
        "totalBytes": to_int(row.get("total_bytes")),
        "totalLines": to_int(row.get("total_lines")),
        "generatedAt": str(row.get("generated_at") or ""),
    }

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
repo_ai_files = defaultdict(lambda: {
    "aiFileCount": 0,
    "aiLineCount": 0,
    "aiBytes": 0,
    "agentsCount": 0,
    "claudeCount": 0,
    "copilotCount": 0,
    "genericAiDocCount": 0,
})
repo_ai_paths = defaultdict(set)

for row in ai_doc_rows:
    repo = update_repo(registry, row.get("repo_key"))
    if repo is None:
        continue
    path_value = str(row.get("path") or "")
    path_lower = path_value.replace("\\", "/").lower()
    doc_name = str(row.get("doc_name") or PurePosixPath(path_lower).name).lower()
    convention = repo_conventions[repo["repoKey"]]
    repo_ai_paths[repo["repoKey"]].add(path_value)

    if doc_name == "agents.md":
        convention["hasAgentsMd"] = True
    elif doc_name == "claude.md":
        convention["hasClaudeMd"] = True
    elif doc_name == "copilot-instructions.md":
        convention["hasCopilotInstructions"] = True
    elif doc_name != "readme.md":
        convention["hasGenericAiDoc"] = True
        convention["genericAiDocCount"] += 1

for row in file_snapshot_rows:
    repo_key = str(row.get("repo_key") or "").strip()
    latest_revision = latest_revision_by_repo.get(repo_key)
    if latest_revision and str(row.get("revision") or "") != latest_revision:
        continue
    repo = registry.get(repo_key) or update_repo(registry, repo_key)
    if repo is None:
        continue

    path_value = str(row.get("path") or "")
    path_lower = path_value.replace("\\", "/").lower()
    name = PurePosixPath(path_lower).name
    size_bytes = to_int(row.get("size_bytes"))
    line_count = to_int(row.get("line_count"))
    language = str(row.get("language") or "").strip() or "Unknown"
    repo_languages[repo["repoKey"]][language] += size_bytes

    if name == "readme.md":
        repo_conventions[repo["repoKey"]]["hasReadme"] = True

    if path_value in repo_ai_paths[repo["repoKey"]]:
        ai_file = repo_ai_files[repo["repoKey"]]
        ai_file["aiFileCount"] += 1
        ai_file["aiLineCount"] += line_count
        ai_file["aiBytes"] += size_bytes
        if name == "agents.md":
            ai_file["agentsCount"] += 1
        elif name == "claude.md":
            ai_file["claudeCount"] += 1
        elif name == "copilot-instructions.md":
            ai_file["copilotCount"] += 1
        else:
            ai_file["genericAiDocCount"] += 1

for row in weekly_rows:
    repo = update_repo(registry, row.get("repo_key"))
    if repo is None:
        continue
    commit_count = to_int(row.get("commit_count"))
    repo_weekly_totals[repo["repoKey"]] += commit_count
    repo_weekly_points[repo["repoKey"]].append({
        "weekStart": str(row.get("week_start") or ""),
        "commitCount": commit_count,
        "activeContributors": to_int(row.get("active_contributors")),
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
        "teamSlug": repo["teamSlug"],
        "teamName": repo["teamName"],
        "teamColor": repo["teamColor"],
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
            "teamSlug": repo["teamSlug"],
            "teamName": repo["teamName"],
            "teamColor": repo["teamColor"],
            "language": language,
            "bytes": to_int(bytes_value),
        })

weekly_activity = []
for repo_key, points in repo_weekly_points.items():
    repo = registry.get(repo_key) or update_repo(registry, repo_key)
    weekly_activity.append({
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "teamSlug": repo["teamSlug"],
        "teamName": repo["teamName"],
        "teamColor": repo["teamColor"],
        "totalCommits": to_int(repo_weekly_totals[repo_key]),
        "points": sorted(points, key=lambda point: point["weekStart"]),
    })

ai_file_activity = []
for repo_key, activity in repo_ai_files.items():
    repo = registry.get(repo_key) or update_repo(registry, repo_key)
    ai_file_activity.append({
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "url": repo["url"],
        "teamSlug": repo["teamSlug"],
        "teamName": repo["teamName"],
        "teamColor": repo["teamColor"],
        "aiFileCount": to_int(activity["aiFileCount"]),
        "aiLineCount": to_int(activity["aiLineCount"]),
        "aiBytes": to_int(activity["aiBytes"]),
        "agentsCount": to_int(activity["agentsCount"]),
        "claudeCount": to_int(activity["claudeCount"]),
        "copilotCount": to_int(activity["copilotCount"]),
        "genericAiDocCount": to_int(activity["genericAiDocCount"]),
    })

failures = []
seen_failures = set()
for row in failure_rows:
    repo_key = str(row.get("repo_key") or "").strip()
    stage = str(row.get("stage") or "").strip()
    dedupe_key = (repo_key, stage)
    if dedupe_key in seen_failures:
        continue
    seen_failures.add(dedupe_key)
    repo = registry.get(repo_key) or update_repo(registry, repo_key)
    if repo is None:
        continue
    failures.append({
        "repoKey": repo["repoKey"],
        "repoName": repo["repoName"],
        "repoSlug": repo["repoSlug"],
        "url": repo["url"],
        "teamSlug": repo["teamSlug"],
        "teamName": repo["teamName"],
        "teamColor": repo["teamColor"],
        "stage": stage,
        "status": str(row.get("status") or ""),
        "updatedAt": str(row.get("updated_at") or ""),
        "detail": str(row.get("detail") or ""),
    })

team_repo_counts = defaultdict(int)
for repo in registry.values():
    team_repo_counts[repo["teamSlug"]] += 1

team_filters = []
configured_by_slug = {str(team.get("slug") or ""): team for team in configured_teams}
for team in configured_teams:
    slug = str(team.get("slug") or "")
    team_filters.append({
        "slug": slug,
        "name": str(team.get("name") or ""),
        "color": str(team.get("color") or "#333e48"),
        "repositoryCount": to_int(team_repo_counts.get(slug, 0)),
    })

for team_slug, repository_count in sorted(team_repo_counts.items()):
    if team_slug in configured_by_slug:
        continue
    sample_repo = next((repo for repo in registry.values() if repo["teamSlug"] == team_slug), None)
    team_filters.append({
        "slug": team_slug,
        "name": sample_repo["teamName"] if sample_repo else format_team_name(team_slug) or default_team["teamName"],
        "color": sample_repo["teamColor"] if sample_repo else default_team["teamColor"],
        "repositoryCount": to_int(repository_count),
    })

summary = {
    "repositories": len(registry),
    "analyzedRepositories": len(repo_sizes),
    "failedRepositories": len(failures),
    "totalFiles": sum(to_int(row.get("totalFiles")) for row in repo_sizes.values()),
    "totalLines": sum(to_int(row.get("totalLines")) for row in repo_sizes.values()),
}

last_run = max((str(row.get("finished_at") or row.get("started_at") or "") for row in run_rows), default="")
last_fetch = max((str(row.get("fetched_at") or "") for row in fetch_rows), default="")

result = {
    "overview": {
        "title": "Pulse Repository Evidence",
        "sourcePath": str(db_path),
        "sourceNote": "Repository evidence derived at build time from the latest Pulse SQLite export, normalized into compact operational charts for AI SDLC.",
        "lastRunAt": last_run,
        "lastFetchAt": last_fetch,
    },
    "filters": {
        "teams": sorted(team_filters, key=lambda team: team["name"].lower()),
        "repositories": sorted(registry.values(), key=lambda repo: repo["repoName"].lower()),
        "conventions": ${pulseConventionsJson},
    },
    "summary": summary,
    "conventionsByRepo": sorted(
        conventions_by_repo,
        key=lambda row: (-row["totalConventionKinds"], -row["totalConventionMatches"], row["repoName"].lower()),
    ),
    "languageShare": [
        {"language": language, "bytes": to_int(bytes_value)}
        for language, bytes_value in sorted(language_totals.items(), key=lambda item: (-item[1], item[0].lower()))
    ][:12],
    "repoLanguageShare": sorted(
        repo_language_share,
        key=lambda row: (row["repoName"].lower(), -row["bytes"], row["language"].lower()),
    ),
    "repoSizes": sorted(repo_sizes.values(), key=lambda row: (-row["totalLines"], row["repoName"].lower())),
    "weeklyActivity": sorted(weekly_activity, key=lambda row: (-row["totalCommits"], row["repoName"].lower())),
    "failures": sorted(failures, key=lambda row: (row["status"], row["repoName"].lower())),
    "aiFileActivity": sorted(
        ai_file_activity,
        key=lambda row: (-row["aiFileCount"], -row["aiLineCount"], row["repoName"].lower()),
    ),
}

print(json.dumps(result))
`;

let pulseDatasetPromise: Promise<PulseDataset> | undefined;

function getEmptyPulseDataset(sourceNote: string): PulseDataset {
  return {
    overview: {
      title: "Pulse Repository Evidence",
      sourcePath: pulseOutputRoot,
      sourceNote,
      lastRunAt: "",
      lastFetchAt: "",
    },
    filters: {
      teams: [],
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
    aiFileActivity: [],
  };
}

export async function getPulseDataset(): Promise<PulseDataset> {
  if (!pulseDatasetPromise) {
    pulseDatasetPromise = Promise.resolve().then(async () => {
      try {
        const teamConfig = await getPulseTeamAssignments();
        const output = execFileSync(
          "python",
          ["-c", pulsePythonScript, pulseOutputRoot, pulseReportsRoot, JSON.stringify(teamConfig)],
          {
            cwd: process.cwd(),
            encoding: "utf-8",
            maxBuffer: 24 * 1024 * 1024,
          },
        ).trim();

        if (!output) {
          return getEmptyPulseDataset("Pulse SQLite export returned no rows at build time.");
        }

        return JSON.parse(output) as PulseDataset;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Pulse loader error";
        return getEmptyPulseDataset(`Pulse SQLite export could not be loaded at build time: ${message}`);
      }
    });
  }

  return pulseDatasetPromise;
}
