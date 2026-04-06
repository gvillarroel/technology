import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, posix, relative } from "node:path";
import { parse, stringify } from "yaml";
import {
  getSkillEvaluationsBySkillKey,
  summarizeSkillEvaluations,
  type SkillEvaluation,
  type SkillEvaluationSummary,
} from "./skill-evaluations";

type RepositorySource = "github" | "local";

interface GitHubTreeEntry {
  path: string;
  type: string;
}

interface GitHubTreeResponse {
  tree?: GitHubTreeEntry[];
}

export interface SkillRepositoryConfig {
  slug: string;
  name: string;
  source: RepositorySource;
  location: string;
  allowed: boolean;
  purpose: string;
  repository: string;
  ref: string;
  skillRoot: string;
  installSnippetTemplate: string;
}

export interface ApprovedSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  repositorySlug: string;
  repositoryName: string;
  repositorySource: RepositorySource;
  repositoryPurpose: string;
  repositoryLabel: string;
  repositoryUrl: string;
  repositoryRef: string;
  localPath: string;
  relativePath: string;
  installPath: string;
  sourcePath: string;
  sourceUrl: string;
  tags: string[];
  metadata: Record<string, string>;
  metadataPairs: Array<{ key: string; value: string }>;
  installSnippet: string;
  installAvailable: boolean;
  searchText: string;
  evaluations: SkillEvaluation[];
  evaluationSummary: SkillEvaluationSummary;
}

export interface SkillsCatalogData {
  repositories: Array<SkillRepositoryConfig & { skillCount: number }>;
  skills: ApprovedSkill[];
}

const skillsRepositoriesYamlPath = join(process.cwd(), "data", "skills-repositories.yaml");
const skillsCatalogCacheYamlPath = join(process.cwd(), "data", "skills-catalog-cache.yaml");
const githubTreeCache = new Map<string, GitHubTreeEntry[]>();
const githubTextCache = new Map<string, string>();
type ApprovedSkillStatic = Omit<ApprovedSkill, "evaluations" | "evaluationSummary">;

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

function toBoolean(value: unknown) {
  return value !== false && String(value ?? "").trim().toLowerCase() !== "false";
}

function normalizeSource(value: unknown): RepositorySource {
  return toScalar(value) === "github" ? "github" : "local";
}

function normalizeTag(segment: string) {
  return segment.replace(/^\.+/, "").replace(/[-_]+/g, " ").trim().toLowerCase();
}

function getDescriptionFallback(markdown: string) {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));

  return lines[0] ?? "";
}

function flattenMetadata(value: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    const listValue = value.map((item) => toScalar(item)).filter(Boolean).join(", ");
    return listValue ? [{ key: prefix || "items", value: listValue }] : [];
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
      flattenMetadata(nestedValue, prefix ? `${prefix}.${key}` : key),
    );
  }

  const scalar = toScalar(value);
  return scalar ? [{ key: prefix || "value", value: scalar }] : [];
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseSkillDocument(markdown: string, skillDirName: string) {
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontmatter = frontmatterMatch ? (parse(frontmatterMatch[1]) as Record<string, unknown>) : {};
  const name = toScalar(frontmatter.name) || skillDirName;
  const description =
    toScalar(frontmatter.description) ||
    toScalar((frontmatter.metadata as Record<string, unknown> | undefined)?.["short-description"]) ||
    getDescriptionFallback(markdown);
  const metadataPairs = flattenMetadata(frontmatter).filter(
    (item) => item.key !== "name" && item.key !== "description",
  );
  const metadata = Object.fromEntries(metadataPairs.map((item) => [item.key, item.value]));

  return { name, description, metadata, metadataPairs };
}

async function findLocalSkillFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const matches: string[] = [];

  for (const entry of entries) {
    const entryPath = join(rootPath, entry.name);

    if (entry.isDirectory()) {
      matches.push(...(await findLocalSkillFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      matches.push(entryPath);
    }
  }

  return matches;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "codex-technology",
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string) {
  const cached = githubTextCache.get(url);

  if (cached) {
    return cached;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "codex-technology",
      Accept: "text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const text = await response.text();
  githubTextCache.set(url, text);
  return text;
}

async function getGitHubTree(repository: string, ref: string) {
  const cacheKey = `${repository}@${ref}`;
  const cached = githubTreeCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const treeUrl = `https://api.github.com/repos/${repository}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const payload = await fetchJson<GitHubTreeResponse>(treeUrl);
  const tree = payload.tree ?? [];
  githubTreeCache.set(cacheKey, tree);
  return tree;
}

async function findGitHubSkillFiles(repository: string, ref: string, skillRoot: string) {
  const tree = await getGitHubTree(repository, ref);
  const normalizedRoot = skillRoot.replace(/^\/+|\/+$/g, "");

  return tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((path) => path.startsWith(`${normalizedRoot}/`) && path.endsWith("/SKILL.md"));
}

function getRepositoryTags(repository: SkillRepositoryConfig) {
  const segments = repository.skillRoot
    .split(/[\\/]+/)
    .map((segment) => normalizeTag(segment))
    .filter(Boolean)
    .filter((segment) => segment !== "skills");

  return [...new Set(segments)];
}

function getRepositoryUrl(repository: SkillRepositoryConfig) {
  if (!repository.repository) {
    return "";
  }

  return `https://github.com/${repository.repository}`;
}

function getGitHubRawUrl(repository: string, ref: string, filePath: string) {
  const encodedPath = filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(ref)}/${encodedPath}`;
}

function getGitHubTreeUrl(repository: string, ref: string, directoryPath: string) {
  const encodedPath = directoryPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://github.com/${repository}/tree/${encodeURIComponent(ref)}/${encodedPath}`;
}

function renderInstallSnippet(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => values[key] ?? "");
}

function getUniqueMetadataPairs(metadataPairs: Array<{ key: string; value: string }>) {
  const seen = new Set<string>();

  return metadataPairs.filter((item) => {
    const cacheKey = `${item.key.toLowerCase()}:${item.value.toLowerCase()}`;

    if (seen.has(cacheKey)) {
      return false;
    }

    seen.add(cacheKey);
    return true;
  });
}

function serializeCachedSkill(skill: ApprovedSkillStatic) {
  return {
    ...skill,
  };
}

async function loadSkillsCatalogCache() {
  if (!(await pathExists(skillsCatalogCacheYamlPath))) {
    return new Map<string, ApprovedSkillStatic[]>();
  }

  const rawFile = await readFile(skillsCatalogCacheYamlPath, "utf-8");
  const document = parse(rawFile) as {
    repositories?: Array<{
      slug?: string;
      skills?: Array<Record<string, unknown>>;
    }>;
  };

  return (document.repositories ?? []).reduce((map, repository) => {
    const slug = toScalar(repository.slug);

    if (!slug) {
      return map;
    }

    const skills = (repository.skills ?? []).map((skill) => ({
      id: toScalar(skill.id),
      slug: toScalar(skill.slug),
      name: toScalar(skill.name),
      description: toScalar(skill.description),
      repositorySlug: toScalar(skill.repositorySlug),
      repositoryName: toScalar(skill.repositoryName),
      repositorySource: normalizeSource(skill.repositorySource),
      repositoryPurpose: toScalar(skill.repositoryPurpose),
      repositoryLabel: toScalar(skill.repositoryLabel),
      repositoryUrl: toScalar(skill.repositoryUrl),
      repositoryRef: toScalar(skill.repositoryRef),
      localPath: toScalar(skill.localPath),
      relativePath: toScalar(skill.relativePath),
      installPath: toScalar(skill.installPath),
      sourcePath: toScalar(skill.sourcePath),
      sourceUrl: toScalar(skill.sourceUrl),
      tags: Array.isArray(skill.tags) ? skill.tags.map((tag) => toScalar(tag)).filter(Boolean) : [],
      metadata:
        skill.metadata && typeof skill.metadata === "object"
          ? Object.fromEntries(
              Object.entries(skill.metadata as Record<string, unknown>).map(([key, value]) => [key, toScalar(value)]),
            )
          : {},
      metadataPairs: Array.isArray(skill.metadataPairs)
        ? skill.metadataPairs.map((item) => ({
            key: toScalar(item.key),
            value: toScalar(item.value),
          }))
        : [],
      installSnippet: toScalar(skill.installSnippet),
      installAvailable: toBoolean(skill.installAvailable),
      searchText: toScalar(skill.searchText),
    } satisfies ApprovedSkillStatic));

    map.set(slug, skills);
    return map;
  }, new Map<string, ApprovedSkillStatic[]>());
}

async function writeSkillsCatalogCache(skillsByRepository: Map<string, ApprovedSkillStatic[]>) {
  const payload = {
    generated_at: new Date().toISOString(),
    repositories: [...skillsByRepository.entries()]
      .map(([slug, skills]) => ({
        slug,
        skills: skills.map((skill) => serializeCachedSkill(skill)),
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
  };

  await writeFile(skillsCatalogCacheYamlPath, stringify(payload), "utf-8");
}

function withEvaluations(skill: ApprovedSkillStatic, evaluationsBySkillKey: Map<string, SkillEvaluation[]>) {
  const evaluations = evaluationsBySkillKey.get(`${skill.repositorySlug}:${skill.slug}`) ?? [];

  return {
    ...skill,
    evaluations,
    evaluationSummary: summarizeSkillEvaluations(evaluations),
  } satisfies ApprovedSkill;
}

export async function getTrustedSkillRepositories(): Promise<SkillRepositoryConfig[]> {
  const rawFile = await readFile(skillsRepositoriesYamlPath, "utf-8");
  const document = parse(rawFile) as { repositories?: Array<Record<string, unknown>> };
  const repositories = document.repositories ?? [];

  return repositories
    .map((repository) => ({
      slug: toScalar(repository.slug),
      name: toScalar(repository.name),
      source: normalizeSource(repository.source),
      location: toScalar(repository.location),
      allowed: toBoolean(repository.allowed),
      purpose: toScalar(repository.purpose),
      repository: toScalar(repository.repository),
      ref: toScalar(repository.ref) || "main",
      skillRoot: toScalar(repository.skill_root) || "skills",
      installSnippetTemplate: toScalar(repository.install_snippet_template),
    }))
    .filter((repository) => repository.allowed);
}

async function getRepositorySkillFiles(repository: SkillRepositoryConfig) {
  if (repository.source === "github") {
    try {
      return await findGitHubSkillFiles(repository.repository, repository.ref, repository.skillRoot);
    } catch (error) {
      if (repository.location && (await pathExists(repository.location))) {
        return findLocalSkillFiles(repository.location);
      }

      throw error;
    }
  }

  if (!repository.location) {
    return [];
  }

  return findLocalSkillFiles(repository.location);
}

async function readSkillMarkdown(repository: SkillRepositoryConfig, skillFilePath: string) {
  if (repository.source === "github") {
    if (isAbsolute(skillFilePath)) {
      return readFile(skillFilePath, "utf-8");
    }

    try {
      return await fetchText(getGitHubRawUrl(repository.repository, repository.ref, skillFilePath));
    } catch (error) {
      if (repository.location) {
        const localMirrorPath = join(repository.location, skillFilePath.replace(/\//g, "\\"));

        if (await pathExists(localMirrorPath)) {
          return readFile(localMirrorPath, "utf-8");
        }
      }

      throw error;
    }
  }

  return readFile(skillFilePath, "utf-8");
}

function getRelativeSkillPath(repository: SkillRepositoryConfig, skillDir: string) {
  if (repository.source === "github") {
    if (isAbsolute(skillDir) && repository.location) {
      return relative(repository.location, skillDir).replace(/\\/g, "/");
    }

    return posix.relative(repository.skillRoot.replace(/\\/g, "/"), skillDir.replace(/\\/g, "/"));
  }

  return relative(repository.location, skillDir).replace(/\\/g, "/");
}

function buildSkillEntry(
  repository: SkillRepositoryConfig,
  skillDir: string,
  markdown: string,
) {
  const repositoryTags = getRepositoryTags(repository);
  const relativePath = getRelativeSkillPath(repository, skillDir).replace(/^\.\//, "");
  const relativeSegments = relativePath.split("/").map((segment) => segment.trim()).filter(Boolean);
  const skillDirectoryName = basename(skillDir);
  const skillSlug = relativeSegments.at(-1) ?? skillDirectoryName;
  const parentTags = relativeSegments.slice(0, -1).map((segment) => normalizeTag(segment)).filter(Boolean);
  const tags = [...new Set([...repositoryTags, ...parentTags])];
  const installPath = posix.join(repository.skillRoot.replace(/\\/g, "/"), relativePath);
  const { name, description, metadata } = parseSkillDocument(markdown, skillSlug);
  const metadataPairs = getUniqueMetadataPairs(
    flattenMetadata(metadata).filter(
      (item) => !tags.some((tag) => tag.toLowerCase() === item.value.toLowerCase()),
    ),
  );
  const sourcePath = repository.source === "github" ? installPath : skillDir.replace(/\\/g, "/");
  const sourceUrl =
    repository.source === "github"
      ? getGitHubTreeUrl(repository.repository, repository.ref, sourcePath)
      : "";
  const installSnippet = repository.installSnippetTemplate
    ? renderInstallSnippet(repository.installSnippetTemplate, {
        repository: repository.repository,
        repositoryUrl: getRepositoryUrl(repository),
        slug: skillSlug,
        installPath,
        skillUrl: sourceUrl,
      }).trim()
    : "";
  const metadataSearch = metadataPairs.map((item) => `${item.key} ${item.value}`).join(" ");
  const id = `${repository.slug}:${relativePath || skillSlug}`;
  return {
    id,
    slug: skillSlug,
    name,
    description,
    repositorySlug: repository.slug,
    repositoryName: repository.name,
    repositorySource: repository.source,
    repositoryPurpose: repository.purpose,
    repositoryLabel: repository.repository || repository.name,
    repositoryUrl: getRepositoryUrl(repository),
    repositoryRef: repository.ref,
    localPath: repository.source === "local" ? sourcePath : "",
    relativePath,
    installPath,
    sourcePath,
    sourceUrl,
    tags,
    metadata,
    metadataPairs,
    installSnippet,
    installAvailable: Boolean(installSnippet),
    searchText: `${name} ${description} ${tags.join(" ")} ${repository.name} ${repository.repository} ${installPath} ${metadataSearch}`.toLowerCase(),
  } satisfies ApprovedSkillStatic;
}

export async function getApprovedSkills(): Promise<ApprovedSkill[]> {
  const repositories = await getTrustedSkillRepositories();
  const evaluationsBySkillKey = await getSkillEvaluationsBySkillKey();
  const cachedSkillsByRepository = await loadSkillsCatalogCache();
  const resolvedSkillsByRepository = new Map<string, ApprovedSkillStatic[]>();

  for (const repository of repositories) {
    try {
      const skillFiles = await getRepositorySkillFiles(repository);
      const skills = await Promise.all(
        skillFiles.map(async (skillFilePath) => {
          const skillDir =
            repository.source === "github" && !isAbsolute(skillFilePath)
              ? posix.dirname(skillFilePath)
              : dirname(skillFilePath);
          const markdown = await readSkillMarkdown(repository, skillFilePath);

          return buildSkillEntry(repository, skillDir, markdown);
        }),
      );

      resolvedSkillsByRepository.set(repository.slug, skills);
    } catch (error) {
      const cachedSkills = cachedSkillsByRepository.get(repository.slug);

      if (cachedSkills && cachedSkills.length > 0) {
        console.warn(`Using cached skills for ${repository.slug}: ${error instanceof Error ? error.message : String(error)}`);
        resolvedSkillsByRepository.set(repository.slug, cachedSkills);
        continue;
      }

      if (repository.source === "github") {
        console.warn(`Skipping ${repository.slug}: ${error instanceof Error ? error.message : String(error)}`);
        resolvedSkillsByRepository.set(repository.slug, []);
        continue;
      }

      throw error;
    }
  }

  await writeSkillsCatalogCache(resolvedSkillsByRepository);

  return [...resolvedSkillsByRepository.values()]
    .flat()
    .map((skill) => withEvaluations(skill, evaluationsBySkillKey))
    .map((skill) => ({
      ...skill,
      searchText: `${skill.searchText} ${skill.evaluationSummary.evaluated ? "evaluated" : "not evaluated"}`.toLowerCase(),
    }))
    .sort((left, right) =>
      left.name.localeCompare(right.name) ||
      left.repositoryName.localeCompare(right.repositoryName) ||
      left.relativePath.localeCompare(right.relativePath),
    );
}

export async function getSkillsCatalogData(): Promise<SkillsCatalogData> {
  const [repositories, skills] = await Promise.all([getTrustedSkillRepositories(), getApprovedSkills()]);
  const repositoryCounts = skills.reduce((counts, skill) => {
    counts.set(skill.repositorySlug, (counts.get(skill.repositorySlug) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return {
    repositories: repositories
      .map((repository) => ({
        ...repository,
        skillCount: repositoryCounts.get(repository.slug) ?? 0,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    skills,
  };
}

export async function getApprovedSkillByRepoAndSlug(repositorySlug: string, skillSlug: string) {
  const skills = await getApprovedSkills();
  return skills.find((skill) => skill.repositorySlug === repositorySlug && skill.slug === skillSlug);
}

export function getSkillDetailHtmlUrl(repositorySlug: string, skillSlug: string) {
  return `/ai-sdlc/skills/${repositorySlug}/${skillSlug}/`;
}

export function getSkillDetailMarkdownUrl(repositorySlug: string, skillSlug: string) {
  return `/ai-sdlc/skills/${repositorySlug}/${skillSlug}.md`;
}
