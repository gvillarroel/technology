import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, posix, relative } from "node:path";
import { parse } from "yaml";

export interface SkillRepositoryConfig {
  slug: string;
  name: string;
  source: string;
  location: string;
  allowed: boolean;
  purpose: string;
  repository: string;
  ref: string;
  skillRoot: string;
  installPackage: string;
}

export interface ApprovedSkill {
  slug: string;
  name: string;
  description: string;
  repositorySlug: string;
  repositoryName: string;
  repositorySource: string;
  repositoryPurpose: string;
  repositoryLabel: string;
  repositoryUrl: string;
  repositoryRef: string;
  localPath: string;
  relativePath: string;
  installPath: string;
  tags: string[];
  installCommand: string;
  installAvailable: boolean;
}

export interface SkillsCatalogData {
  repositories: Array<SkillRepositoryConfig & { skillCount: number }>;
  skills: ApprovedSkill[];
}

const skillsRepositoriesYamlPath = join(process.cwd(), "data", "skills-repositories.yaml");

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
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));

  return lines[0] ?? "";
}

function parseSkillDocument(markdown: string, skillDirName: string) {
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontmatter = frontmatterMatch ? (parse(frontmatterMatch[1]) as Record<string, unknown>) : {};
  const name = toScalar(frontmatter.name) || skillDirName;
  const description = toScalar(frontmatter.description) || getDescriptionFallback(markdown);

  return { name, description };
}

async function findSkillFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const matches: string[] = [];

  for (const entry of entries) {
    const entryPath = join(rootPath, entry.name);

    if (entry.isDirectory()) {
      matches.push(...(await findSkillFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      matches.push(entryPath);
    }
  }

  return matches;
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

function getInstallCommand(repository: SkillRepositoryConfig, skillSlug: string) {
  if (!repository.installPackage) {
    return "";
  }

  return `npx skills add ${repository.installPackage}@${skillSlug}`;
}

export async function getTrustedSkillRepositories(): Promise<SkillRepositoryConfig[]> {
  const rawFile = await readFile(skillsRepositoriesYamlPath, "utf-8");
  const document = parse(rawFile) as { repositories?: Array<Record<string, unknown>> };
  const repositories = document.repositories ?? [];

  return repositories
    .map((repository) => ({
      slug: toScalar(repository.slug),
      name: toScalar(repository.name),
      source: toScalar(repository.source) || "local",
      location: toScalar(repository.location),
      allowed: toBoolean(repository.allowed),
      purpose: toScalar(repository.purpose),
      repository: toScalar(repository.repository),
      ref: toScalar(repository.ref) || "main",
      skillRoot: toScalar(repository.skill_root) || "skills",
      installPackage: toScalar(repository.install_package),
    }))
    .filter((repository) => repository.allowed && repository.location);
}

export async function getApprovedSkills(): Promise<ApprovedSkill[]> {
  const repositories = await getTrustedSkillRepositories();
  const skills = await Promise.all(
    repositories.map(async (repository) => {
      const skillFiles = await findSkillFiles(repository.location);
      const repositoryTags = getRepositoryTags(repository);

      return Promise.all(
        skillFiles.map(async (skillFile) => {
          const markdown = await readFile(skillFile, "utf-8");
          const skillDir = dirname(skillFile);
          const skillDirectoryName = basename(skillDir);
          const relativePath = relative(repository.location, skillDir)
            .replace(/\\/g, "/")
            .replace(/^\.\//, "");
          const relativeSegments = relativePath
            .split("/")
            .map((segment) => segment.trim())
            .filter(Boolean);
          const skillSlug = relativeSegments.at(-1) ?? skillDirectoryName;
          const parentTags = relativeSegments.slice(0, -1).map((segment) => normalizeTag(segment)).filter(Boolean);
          const tags = [...new Set([...repositoryTags, ...parentTags])];
          const { name, description } = parseSkillDocument(markdown, skillSlug);
          const installPath = posix.join(repository.skillRoot.replace(/\\/g, "/"), relativePath);

          return {
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
            localPath: skillFile.replace(/\\/g, "/").replace(/\/SKILL\.md$/, ""),
            relativePath,
            installPath,
            tags,
            installCommand: getInstallCommand(repository, skillSlug),
            installAvailable: Boolean(repository.installPackage),
          } satisfies ApprovedSkill;
        }),
      );
    }),
  );

  return skills
    .flat()
    .sort((left, right) => left.name.localeCompare(right.name) || left.repositoryName.localeCompare(right.repositoryName));
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
