import { basename, posix } from "node:path";
import { parse } from "yaml";
import {
  getSkillEvaluationsBySkillKey,
  summarizeSkillEvaluations,
  type SkillEvaluation,
  type SkillEvaluationSummary,
} from "./skill-evaluations";
import { readSourceJson, readSourceText } from "./connectors";
import { getDataset } from "./site-catalog";

type RepositorySource = "github";

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

interface SkillsRepositoriesDocument {
  repositories?: Array<Record<string, unknown>>;
}

interface SkillsCatalogCacheDocument {
  repositories?: Array<{
    slug?: string;
    skills?: Array<Record<string, unknown>>;
  }>;
}

type ApprovedSkillStatic = Omit<ApprovedSkill, "evaluations" | "evaluationSummary">;

const githubTreeCache = new Map<string, GitHubTreeEntry[]>();

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

function toBoolean(value: unknown) {
  return value !== false && String(value ?? "").trim().toLowerCase() !== "false";
}

function normalizeTag(segment: string) {
  return segment.replace(/^\.+/, "").replace(/[-_]+/g, " ").trim().toLowerCase();
}

function getDescriptionFallback(markdown: string) {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !line.startsWith("#")) ?? "";
}

function flattenMetadata(value: unknown, prefix = ""): Array<{ key: string; value: string }> {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    const listValue = value.map(toScalar).filter(Boolean).join(", ");
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

  return {
    name,
    description,
    metadata: Object.fromEntries(metadataPairs.map((item) => [item.key, item.value])),
  };
}

async function getGitHubTree(repository: string, ref: string) {
  const cacheKey = `${repository}@${ref}`;
  const cached = githubTreeCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const treeUrl = `https://api.github.com/repos/${repository}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const payload = await readSourceJson<GitHubTreeResponse>(treeUrl);
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
  return [...new Set(
    repository.skillRoot
      .split(/[\\/]+/)
      .map(normalizeTag)
      .filter((segment) => segment && segment !== "skills"),
  )];
}

function getRepositoryUrl(repository: SkillRepositoryConfig) {
  return `https://github.com/${repository.repository}`;
}

function getGitHubRawUrl(repository: string, ref: string, filePath: string) {
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(ref)}/${encodedPath}`;
}

function getGitHubTreeUrl(repository: string, ref: string, directoryPath: string) {
  const encodedPath = directoryPath.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${repository}/tree/${encodeURIComponent(ref)}/${encodedPath}`;
}

function renderInstallSnippet(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => values[key] ?? "");
}

function getUniqueMetadataPairs(metadataPairs: Array<{ key: string; value: string }>) {
  const seen = new Set<string>();
  return metadataPairs.filter((item) => {
    const cacheKey = `${item.key.toLowerCase()}:${item.value.toLowerCase()}`;
    if (seen.has(cacheKey)) return false;
    seen.add(cacheKey);
    return true;
  });
}

async function loadSkillsCatalogCache() {
  const document = await getDataset<SkillsCatalogCacheDocument>("skills-catalog-cache");

  return (document.repositories ?? []).reduce((map, repository) => {
    const slug = toScalar(repository.slug);
    if (!slug) return map;

    const skills = (repository.skills ?? []).map((skill) => ({
      id: toScalar(skill.id),
      slug: toScalar(skill.slug),
      name: toScalar(skill.name),
      description: toScalar(skill.description),
      repositorySlug: toScalar(skill.repositorySlug),
      repositoryName: toScalar(skill.repositoryName),
      repositorySource: "github" as const,
      repositoryPurpose: toScalar(skill.repositoryPurpose),
      repositoryLabel: toScalar(skill.repositoryLabel),
      repositoryUrl: toScalar(skill.repositoryUrl),
      repositoryRef: toScalar(skill.repositoryRef),
      localPath: "",
      relativePath: toScalar(skill.relativePath),
      installPath: toScalar(skill.installPath),
      sourcePath: toScalar(skill.sourcePath),
      sourceUrl: toScalar(skill.sourceUrl),
      tags: Array.isArray(skill.tags) ? skill.tags.map(toScalar).filter(Boolean) : [],
      metadata: skill.metadata && typeof skill.metadata === "object"
        ? Object.fromEntries(Object.entries(skill.metadata as Record<string, unknown>).map(([key, value]) => [key, toScalar(value)]))
        : {},
      metadataPairs: Array.isArray(skill.metadataPairs)
        ? skill.metadataPairs.map((item) => ({ key: toScalar(item.key), value: toScalar(item.value) }))
        : [],
      installSnippet: toScalar(skill.installSnippet),
      installAvailable: toBoolean(skill.installAvailable),
      searchText: toScalar(skill.searchText),
    } satisfies ApprovedSkillStatic));

    map.set(slug, skills);
    return map;
  }, new Map<string, ApprovedSkillStatic[]>());
}

function withEvaluations(skill: ApprovedSkillStatic, evaluationsBySkillKey: Map<string, SkillEvaluation[]>) {
  const evaluations = evaluationsBySkillKey.get(`${skill.repositorySlug}:${skill.slug}`) ?? [];
  return { ...skill, evaluations, evaluationSummary: summarizeSkillEvaluations(evaluations) } satisfies ApprovedSkill;
}

export async function getTrustedSkillRepositories(): Promise<SkillRepositoryConfig[]> {
  const document = await getDataset<SkillsRepositoriesDocument>("skills-repositories");

  return (document.repositories ?? [])
    .map((repository) => ({
      slug: toScalar(repository.slug),
      name: toScalar(repository.name),
      source: "github" as const,
      location: "",
      allowed: toBoolean(repository.allowed),
      purpose: toScalar(repository.purpose),
      repository: toScalar(repository.repository),
      ref: toScalar(repository.ref) || "main",
      skillRoot: toScalar(repository.skill_root) || "skills",
      installSnippetTemplate: toScalar(repository.install_snippet_template),
    }))
    .filter((repository) => repository.allowed && repository.repository);
}

function getRelativeSkillPath(repository: SkillRepositoryConfig, skillDir: string) {
  return posix.relative(repository.skillRoot.replace(/\\/g, "/"), skillDir.replace(/\\/g, "/"));
}

function buildSkillEntry(repository: SkillRepositoryConfig, skillDir: string, markdown: string) {
  const repositoryTags = getRepositoryTags(repository);
  const relativePath = getRelativeSkillPath(repository, skillDir).replace(/^\.\//, "");
  const relativeSegments = relativePath.split("/").map((segment) => segment.trim()).filter(Boolean);
  const skillSlug = relativeSegments.at(-1) ?? basename(skillDir);
  const tags = [...new Set([
    ...repositoryTags,
    ...relativeSegments.slice(0, -1).map(normalizeTag).filter(Boolean),
  ])];
  const installPath = posix.join(repository.skillRoot.replace(/\\/g, "/"), relativePath);
  const { name, description, metadata } = parseSkillDocument(markdown, skillSlug);
  const metadataPairs = getUniqueMetadataPairs(
    flattenMetadata(metadata).filter(
      (item) => !tags.some((tag) => tag.toLowerCase() === item.value.toLowerCase()),
    ),
  );
  const sourceUrl = getGitHubTreeUrl(repository.repository, repository.ref, installPath);
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

  return {
    id: `${repository.slug}:${relativePath || skillSlug}`,
    slug: skillSlug,
    name,
    description,
    repositorySlug: repository.slug,
    repositoryName: repository.name,
    repositorySource: repository.source,
    repositoryPurpose: repository.purpose,
    repositoryLabel: repository.repository,
    repositoryUrl: getRepositoryUrl(repository),
    repositoryRef: repository.ref,
    localPath: "",
    relativePath,
    installPath,
    sourcePath: installPath,
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
      const skillFiles = await findGitHubSkillFiles(repository.repository, repository.ref, repository.skillRoot);
      const skills = await Promise.all(skillFiles.map(async (skillFilePath) => {
        const markdown = await readSourceText(
          getGitHubRawUrl(repository.repository, repository.ref, skillFilePath),
        );
        return buildSkillEntry(repository, posix.dirname(skillFilePath), markdown);
      }));
      resolvedSkillsByRepository.set(repository.slug, skills);
    } catch (error) {
      const cachedSkills = cachedSkillsByRepository.get(repository.slug) ?? [];
      console.warn(
        cachedSkills.length > 0 ? `Using cached skills for ${repository.slug}` : `Skipping ${repository.slug}`,
        error instanceof Error ? error.message : String(error),
      );
      resolvedSkillsByRepository.set(repository.slug, cachedSkills);
    }
  }

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
      .map((repository) => ({ ...repository, skillCount: repositoryCounts.get(repository.slug) ?? 0 }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    skills,
  };
}

export async function getApprovedSkillByRepoAndSlug(repositorySlug: string, skillSlug: string) {
  return (await getApprovedSkills()).find(
    (skill) => skill.repositorySlug === repositorySlug && skill.slug === skillSlug,
  );
}

export function getSkillDetailHtmlUrl(repositorySlug: string, skillSlug: string) {
  return `/ai-sdlc/skills/${repositorySlug}/${skillSlug}/`;
}

export function getSkillDetailMarkdownUrl(repositorySlug: string, skillSlug: string) {
  return `/ai-sdlc/skills/${repositorySlug}/${skillSlug}.md`;
}
