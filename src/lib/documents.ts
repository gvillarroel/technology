import { posix } from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { createMarkdownDocument, markdownLink, type MarkdownDocument } from "./markdown";
import { withBasePath } from "./site-url";

interface GitHubTreeEntry {
  path: string;
  type: string;
}

interface GitHubTreeResponse {
  tree?: GitHubTreeEntry[];
}

interface GitHubRepositoryResponse {
  full_name?: string;
  default_branch?: string;
  archived?: boolean;
  disabled?: boolean;
  fork?: boolean;
}

interface GitHubCommitResponse {
  commit?: {
    committer?: {
      date?: string;
    };
  };
}

export interface DocumentScanRuleConfig {
  sourceSlug: string;
  sourceName: string;
  slug: string;
  name: string;
  domains: string[];
  include: string[];
  exclude: string[];
}

interface DocumentSourceConfig {
  slug: string;
  name: string;
  account: string;
  repository?: string;
  ref?: string;
  owner: string;
  includeRepositories: string[];
  excludeRepositories: string[];
  documents: DocumentScanRuleConfig[];
}

interface ResolvedDocumentRepository {
  repositorySlug: string;
  repositoryName: string;
  repository: string;
  account: string;
  ref: string;
  owner: string;
  localPath?: string;
  sourceSlugs: string[];
  sourceNames: string[];
  documentRules: DocumentScanRuleConfig[];
}

interface DocumentMatch {
  path: string;
  rules: DocumentScanRuleConfig[];
}

export interface DocumentRepositorySummary {
  repositorySlug: string;
  repositoryName: string;
  repository: string;
  repositoryUrl: string;
  owner: string;
  updated: string;
  status: string;
  docType: string;
  summary: string;
  htmlUrl: string;
  markdownUrl: string;
  fileCount: number;
  folderCount: number;
  ruleCount: number;
  sourceCount: number;
  roots: string[];
}

export interface DocumentPage {
  pageType: "repository" | "document";
  title: string;
  summary: string;
  status: string;
  owner: string;
  updated: string;
  docType: string;
  body: string;
  bodyHtml: string;
  relativePath: string;
  slugSegments: string[];
  htmlUrl: string;
  markdownUrl: string;
  repositorySlug: string;
  repositoryName: string;
  repository: string;
  repositoryRef: string;
  repositoryUrl: string;
  sourceUrl: string;
  rawUrl: string;
  isFolderIndex: boolean;
  ruleLabels: string[];
  domainRoots: string[];
  sourceNames: string[];
  fileCount?: number;
  folderCount?: number;
  lastScannedAt?: string;
  latestDocumentTitle?: string;
  latestDocumentUpdated?: string;
  latestDocumentHtmlUrl?: string;
  latestDocumentPath?: string;
  datedDocumentCount?: number;
}

export interface DocumentSearchEntry {
  pageType: "repository" | "document";
  title: string;
  summary: string;
  repository: string;
  repositorySlug: string;
  relativePath: string;
  htmlUrl: string;
  markdownUrl: string;
  headings: string[];
}

export interface DocumentTreeNode {
  kind: "folder" | "file";
  title: string;
  href?: string;
  status: string;
  docType: string;
  depth: number;
  isActive: boolean;
  hasActiveDescendant: boolean;
  shouldOpen: boolean;
  children: DocumentTreeNode[];
}

interface DocumentsSourceDocument {
  repositories?: Array<Record<string, unknown>>;
}

interface DocumentsData {
  pages: DocumentPage[];
  searchEntries: DocumentSearchEntry[];
  repositorySummaries: DocumentRepositorySummary[];
  sourceConfigs: DocumentSourceConfig[];
  scannedRepositories: ResolvedDocumentRepository[];
  matchedRepositories: ResolvedDocumentRepository[];
  documentCount: number;
}

interface MutableFolderNode {
  title: string;
  href?: string;
  status: string;
  docType: string;
  slugSegments: string[];
  page?: DocumentPage;
  folders: Map<string, MutableFolderNode>;
  documents: DocumentPage[];
}

const documentsRepositoriesYamlPath = posix.join(
  process.cwd().replaceAll("\\", "/"),
  "data",
  "document-repositories.yaml",
);
const githubTreeCache = new Map<string, GitHubTreeEntry[]>();
const githubTextCache = new Map<string, string>();
const githubCommitDateCache = new Map<string, string>();
const githubAccountRepositoriesCache = new Map<string, ResolvedDocumentRepository[]>();
let documentsDataPromise: Promise<DocumentsData> | undefined;

function toScalar(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePath(value: string) {
  return value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
}

function toLabel(value: string) {
  return value
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getDocumentsUrls(slugSegments: string[]) {
  if (slugSegments.length === 0) {
    return {
      htmlUrl: withBasePath("/documents/"),
      markdownUrl: withBasePath("/documents.md"),
    };
  }

  const slugPath = slugSegments.join("/");

  return {
    htmlUrl: withBasePath(`/documents/${slugPath}/`),
    markdownUrl: withBasePath(`/documents/${slugPath}.md`),
  };
}

function getGitHubRepositoryUrl(repository: string) {
  return `https://github.com/${repository}`;
}

function getGitHubBlobUrl(repository: string, ref: string, filePath: string) {
  const encodedPath = normalizePath(filePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://github.com/${repository}/blob/${encodeURIComponent(ref)}/${encodedPath}`;
}

function getGitHubTreeUrl(repository: string, ref: string, filePath: string) {
  const encodedPath = normalizePath(filePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://github.com/${repository}/tree/${encodeURIComponent(ref)}/${encodedPath}`;
}

function getGitHubRawUrl(repository: string, ref: string, filePath: string) {
  const encodedPath = normalizePath(filePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(ref)}/${encodedPath}`;
}

function getLocalWorkspaceRoot() {
  return posix.dirname(process.cwd().replaceAll("\\", "/"));
}

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function wildcardToRegex(pattern: string) {
  const normalized = normalizePath(pattern);
  let regex = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];
    const third = normalized[index + 2];

    if (current === "*" && next === "*" && third === "/") {
      regex += "(?:[^/]+/)*";
      index += 2;
      continue;
    }

    if (current === "*" && next === "*") {
      regex += ".*";
      index += 1;
      continue;
    }

    if (current === "*") {
      regex += "[^/]*";
      continue;
    }

    regex += escapeRegex(current);
  }

  return new RegExp(`^${regex}$`);
}

function matchesPattern(target: string, pattern: string) {
  return wildcardToRegex(pattern).test(target);
}

function matchesRepositoryPattern(repository: string, pattern: string) {
  const normalizedRepository = repository.toLowerCase();
  const leaf = normalizedRepository.split("/").at(-1) ?? normalizedRepository;
  const normalizedPattern = pattern.trim().toLowerCase();

  if (!normalizedPattern) {
    return false;
  }

  if (normalizedPattern.includes("/")) {
    return matchesPattern(normalizedRepository, normalizedPattern);
  }

  return matchesPattern(leaf, normalizedPattern);
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

function matchesGitHubStatus(message: string, statuses: number[]) {
  return statuses.some((status) => message.includes(`: ${status}`));
}

async function getGitHubTree(repository: string, ref: string) {
  const cacheKey = `${repository}@${ref}`;
  const cached = githubTreeCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const treeUrl = `https://api.github.com/repos/${repository}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  let payload: GitHubTreeResponse;

  try {
    payload = await fetchJson<GitHubTreeResponse>(treeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (matchesGitHubStatus(message, [403, 404, 409, 429])) {
      githubTreeCache.set(cacheKey, []);
      return [];
    }

    throw error;
  }

  const tree = payload.tree ?? [];
  githubTreeCache.set(cacheKey, tree);
  return tree;
}

async function getGitHubCommitDate(repository: string, ref: string, filePath: string) {
  const normalizedPath = normalizePath(filePath);
  const cacheKey = `${repository}@${ref}:${normalizedPath}`;
  const cached = githubCommitDateCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const commitsUrl =
    `https://api.github.com/repos/${repository}/commits?sha=${encodeURIComponent(ref)}` +
    `&path=${encodeURIComponent(normalizedPath)}&per_page=1`;
  let payload: GitHubCommitResponse[];

  try {
    payload = await fetchJson<GitHubCommitResponse[]>(commitsUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (matchesGitHubStatus(message, [403, 404, 429]) || message.includes("fetch failed")) {
      githubCommitDateCache.set(cacheKey, "");
      return "";
    }

    throw error;
  }

  const isoDate = payload[0]?.commit?.committer?.date ?? "";
  const date = isoDate ? isoDate.slice(0, 10) : "";
  githubCommitDateCache.set(cacheKey, date);
  return date;
}

function parseGitHubRepositoryFromRemote(url: string, account: string) {
  const trimmed = url.trim();
  const match = trimmed.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/i);

  if (!match) {
    return "";
  }

  const owner = match[1];
  const repo = match[2];

  if (owner.toLowerCase() !== account.toLowerCase()) {
    return "";
  }

  return `${owner}/${repo}`;
}

function buildResolvedRepository(
  source: DocumentSourceConfig,
  repository: string,
  ref: string,
  localPath?: string,
) {
  const repositorySlug = repository.replace("/", "-");

  return {
    repositorySlug,
    repositoryName: repository,
    repository,
    account: source.account,
    ref,
    owner: source.owner,
    localPath,
    sourceSlugs: [source.slug],
    sourceNames: [source.name],
    documentRules: [...source.documents],
  } satisfies ResolvedDocumentRepository;
}

async function getLocalAccountRepositories(source: DocumentSourceConfig) {
  const workspaceRoot = getLocalWorkspaceRoot();
  const entries = await readdir(workspaceRoot, { withFileTypes: true });
  const repositories: ResolvedDocumentRepository[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const repositoryRoot = posix.join(workspaceRoot, entry.name);
    const gitConfigPath = posix.join(repositoryRoot, ".git", "config");
    const gitHeadPath = posix.join(repositoryRoot, ".git", "HEAD");

    try {
      const [gitConfig, gitHead] = await Promise.all([
        readFile(gitConfigPath, "utf-8"),
        readFile(gitHeadPath, "utf-8"),
      ]);
      const remoteMatch = gitConfig.match(/\[remote "origin"\][\s\S]*?url = (.+)/);
      const repository = parseGitHubRepositoryFromRemote(remoteMatch?.[1] ?? "", source.account);

      if (!repository) {
        continue;
      }

      const headMatch = gitHead.match(/ref:\s+refs\/heads\/(.+)\s*$/);
      const currentRef = headMatch?.[1]?.trim() || source.ref || "main";

      repositories.push(buildResolvedRepository(source, repository, currentRef, repositoryRoot));
    } catch {
      continue;
    }
  }

  return repositories.sort((left, right) => left.repository.localeCompare(right.repository));
}

function repositoryMatchesSource(source: DocumentSourceConfig, repository: string) {
  const includePatterns = source.includeRepositories.length > 0 ? source.includeRepositories : ["*"];
  const includeMatch = includePatterns.some((pattern) => matchesRepositoryPattern(repository, pattern));
  const excludeMatch = source.excludeRepositories.some((pattern) => matchesRepositoryPattern(repository, pattern));

  return includeMatch && !excludeMatch;
}

async function getGitHubAccountRepositories(source: DocumentSourceConfig) {
  const cacheKey = `${source.account}:${source.repository ?? "*"}:${source.ref ?? ""}:${source.includeRepositories.join("|")}:${source.excludeRepositories.join("|")}`;
  const cached = githubAccountRepositoriesCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  if (source.repository) {
    const localRepositories = await getLocalAccountRepositories(source);
    const localMatch = localRepositories.find((repository) => repository.repository === source.repository);
    const repositories = repositoryMatchesSource(source, source.repository)
      ? [buildResolvedRepository(source, source.repository, source.ref ?? "main", localMatch?.localPath)]
      : [];
    githubAccountRepositoriesCache.set(cacheKey, repositories);
    return repositories;
  }

  const userRepositoriesUrl =
    `https://api.github.com/users/${encodeURIComponent(source.account)}/repos?per_page=100&sort=updated`;
  let payload: GitHubRepositoryResponse[];
  const localRepositories = await getLocalAccountRepositories(source);
  const localFallback = localRepositories.filter((repository) =>
    repositoryMatchesSource(source, repository.repository),
  );

  try {
    payload = await fetchJson<GitHubRepositoryResponse[]>(userRepositoriesUrl);
  } catch (error) {
    githubAccountRepositoriesCache.set(cacheKey, localFallback);
    return localFallback;
  }

  const localRepositoryMap = new Map(
    localRepositories.map((repository) => [repository.repository, repository] as const),
  );

  const repositories = payload
    .filter((repository) => repository.full_name)
    .filter((repository) => !repository.archived && !repository.disabled && !repository.fork)
    .map((repository) => {
      const resolved = buildResolvedRepository(
        source,
        repository.full_name ?? "",
        source.ref ?? repository.default_branch ?? "main",
      );
      const localMatch = localRepositoryMap.get(resolved.repository);

      if (localMatch?.localPath) {
        resolved.localPath = localMatch.localPath;
        resolved.ref = localMatch.ref || resolved.ref;
      }

      return resolved;
    })
    .filter((repository) => repository.repository)
    .filter((repository) => repositoryMatchesSource(source, repository.repository));

  const mergedRepositories = mergeResolvedRepositories([...repositories, ...localFallback]);

  githubAccountRepositoriesCache.set(cacheKey, mergedRepositories);
  return mergedRepositories;
}

function mergeResolvedRepositories(repositories: ResolvedDocumentRepository[]) {
  const merged = new Map<string, ResolvedDocumentRepository>();

  for (const repository of repositories) {
    const existing = merged.get(repository.repository);

    if (!existing) {
      merged.set(repository.repository, {
        ...repository,
        sourceSlugs: [...repository.sourceSlugs],
        sourceNames: [...repository.sourceNames],
        documentRules: [...repository.documentRules],
      });
      continue;
    }

    existing.sourceSlugs = [...new Set([...existing.sourceSlugs, ...repository.sourceSlugs])];
    existing.sourceNames = [...new Set([...existing.sourceNames, ...repository.sourceNames])];

    const ruleMap = new Map<string, DocumentScanRuleConfig>();

    for (const rule of [...existing.documentRules, ...repository.documentRules]) {
      ruleMap.set(`${rule.sourceSlug}:${rule.slug}`, rule);
    }

    existing.documentRules = [...ruleMap.values()];

    if (!existing.localPath && repository.localPath) {
      existing.localPath = repository.localPath;
    }
  }

  return [...merged.values()].sort((left, right) => left.repository.localeCompare(right.repository));
}

function parseFrontmatter(markdownSource: string) {
  if (!markdownSource.startsWith("---\n")) {
    return {
      data: {} as Record<string, unknown>,
      body: markdownSource.trim(),
    };
  }

  const endIndex = markdownSource.indexOf("\n---\n", 4);

  if (endIndex === -1) {
    return {
      data: {} as Record<string, unknown>,
      body: markdownSource.trim(),
    };
  }

  const frontmatterSource = markdownSource.slice(4, endIndex);
  const body = markdownSource.slice(endIndex + 5).trim();

  return {
    data: (parseYaml(frontmatterSource) as Record<string, unknown> | null) ?? {},
    body,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const ABSOLUTE_LINK_PATTERN = /^(?:[a-z]+:)?\/\//i;
const NON_NAVIGABLE_LINK_PATTERN = /^(#|mailto:|tel:|data:)/i;

function isRewritableMarkdownLink(url: string) {
  return !ABSOLUTE_LINK_PATTERN.test(url) && !NON_NAVIGABLE_LINK_PATTERN.test(url);
}

function normalizeComparableMarkdownText(value: string) {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingHeadingAndSummary(markdown: string, title: string, summary: string) {
  let remaining = markdown.trim();
  const headingMatch = remaining.match(/^#\s+(.+?)\s*(?:\n+|$)/);

  if (
    headingMatch &&
    normalizeComparableMarkdownText(headingMatch[1] ?? "") === normalizeComparableMarkdownText(title)
  ) {
    remaining = remaining.slice(headingMatch[0].length).replace(/^\s+/, "");
  }

  const firstParagraphMatch = remaining.match(/^([^\n#][\s\S]*?)(?:\n\s*\n|$)/);
  const firstParagraph = firstParagraphMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";

  if (
    firstParagraph &&
    normalizeComparableMarkdownText(firstParagraph) === normalizeComparableMarkdownText(summary)
  ) {
    remaining = remaining.slice(firstParagraphMatch?.[0].length ?? 0).replace(/^\s+/, "");
  }

  return remaining.trim();
}

function getDocumentLinkCandidates(filePath: string) {
  const normalizedPath = normalizePath(filePath);

  if (!normalizedPath) {
    return [];
  }

  const trimmedPath = normalizedPath.replace(/\/+$/g, "");
  const candidates = new Set<string>([normalizedPath, trimmedPath]);

  if (trimmedPath.toLowerCase().endsWith(".md")) {
    candidates.add(trimmedPath.slice(0, -3));
  } else {
    candidates.add(`${trimmedPath}.md`);
    candidates.add(`${trimmedPath}/README.md`);
    candidates.add(`${trimmedPath}/index.md`);
  }

  if (trimmedPath.toLowerCase().endsWith("/readme.md")) {
    candidates.add(trimmedPath.slice(0, -"/README.md".length));
  }

  if (trimmedPath.toLowerCase().endsWith("/index.md")) {
    candidates.add(trimmedPath.slice(0, -"/index.md".length));
  }

  return [...candidates].filter(Boolean);
}

function resolveRepositoryRelativePath(rawPath: string, repository: ResolvedDocumentRepository) {
  const slashNormalizedRawPath = rawPath.replaceAll("\\", "/");
  const normalizedRawPath = normalizePath(slashNormalizedRawPath);

  if (!slashNormalizedRawPath.startsWith("/") && !/^[a-z]:\//i.test(slashNormalizedRawPath)) {
    return normalizedRawPath;
  }

  const localPath = repository.localPath ? normalizePath(repository.localPath.replaceAll("\\", "/")) : "";
  const localPathWithoutDrive = localPath.replace(/^[a-z]:/i, "");
  const rawPathWithoutDrive = normalizedRawPath.replace(/^[a-z]:/i, "");

  if (localPath && rawPathWithoutDrive.startsWith(localPathWithoutDrive)) {
    return normalizePath(rawPathWithoutDrive.slice(localPathWithoutDrive.length));
  }

  const repositoryLeaf = repository.repository.split("/").at(-1)?.toLowerCase() ?? "";
  const marker = repositoryLeaf ? `/${repositoryLeaf}/` : "";
  const lowerPath = normalizedRawPath.toLowerCase();
  const markerIndex = marker ? lowerPath.indexOf(marker) : -1;

  if (markerIndex >= 0) {
    return normalizePath(normalizedRawPath.slice(markerIndex + marker.length));
  }

  return normalizedRawPath;
}

function rewriteDocumentBodyLinks(
  markdown: string,
  currentPath: string,
  pagesBySourcePath: Map<string, DocumentPage>,
  repository: ResolvedDocumentRepository,
  repositoryPaths: Set<string>,
  mode: "html" | "markdown",
) {
  return markdown.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    if (!isRewritableMarkdownLink(href)) {
      return `[${label}](${href})`;
    }

    const [rawPath, rawHash = ""] = href.split("#");

    if (!rawPath) {
      return `[${label}](${href})`;
    }

    const resolvedPath = rawPath.startsWith("/")
      ? resolveRepositoryRelativePath(rawPath, repository)
      : normalizePath(
          posix.join(posix.dirname(currentPath) === "." ? "" : posix.dirname(currentPath), rawPath),
        );

    const targetPage = getDocumentLinkCandidates(resolvedPath)
      .map((candidate) => pagesBySourcePath.get(candidate.toLowerCase()))
      .find((page): page is DocumentPage => Boolean(page));

    if (!targetPage) {
      const fallbackCandidates = [
        resolvedPath,
        ...getDocumentLinkCandidates(resolvedPath).filter((candidate) => candidate !== resolvedPath),
      ];
      const fallbackPath = fallbackCandidates.find((candidate) => repositoryPaths.has(candidate.toLowerCase()));

      if (!fallbackPath) {
        return `[${label}](${href})`;
      }

      const hash = rawHash ? `#${rawHash}` : "";
      return `[${label}](${getGitHubBlobUrl(repository.repository, repository.ref, fallbackPath)}${hash})`;
    }

    const nextHref = mode === "markdown" ? targetPage.markdownUrl : targetPage.htmlUrl;
    const hash = rawHash ? `#${rawHash}` : "";
    return `[${label}](${nextHref}${hash})`;
  });
}

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function renderInlineMarkdown(line: string) {
  let html = escapeHtml(line);

  html = html.replace(/`([^`]+)`/g, (_match, content: string) => `<code>${content}</code>`);
  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_match, label: string, href: string) => `<a href="${escapeHtml(href)}">${label}</a>`,
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return html;
}

function parseMarkdownTableRow(line: string) {
  const trimmed = line.trim();

  if (!trimmed.includes("|")) {
    return [];
  }

  const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutOuterPipes.split("|").map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string) {
  const cells = parseMarkdownTableRow(line);

  if (cells.length === 0) {
    return false;
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function getMarkdownTableAlignments(line: string) {
  return parseMarkdownTableRow(line).map((cell) => {
    const trimmed = cell.trim();

    if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
      return "center";
    }

    if (trimmed.endsWith(":")) {
      return "right";
    }

    if (trimmed.startsWith(":")) {
      return "left";
    }

    return "";
  });
}

function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  const paragraphBuffer: string[] = [];
  const listBuffer: Array<{ type: "ul" | "ol"; html: string }> = [];
  const codeBuffer: string[] = [];
  let codeFenceLanguage = "";
  let isInCodeFence = false;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    blocks.push(`<p>${paragraphBuffer.map((line) => renderInlineMarkdown(line)).join(" ")}</p>`);
    paragraphBuffer.length = 0;
  };

  const flushList = () => {
    if (listBuffer.length === 0) {
      return;
    }

    const listType = listBuffer[0]?.type ?? "ul";
    blocks.push(`<${listType}>${listBuffer.map((item) => `<li>${item.html}</li>`).join("")}</${listType}>`);
    listBuffer.length = 0;
  };

  const flushCodeFence = () => {
    if (!isInCodeFence) {
      return;
    }

    const normalizedLanguage = codeFenceLanguage.toLowerCase();

    if (normalizedLanguage === "mermaid") {
      blocks.push(
        `<div class="bat-mermaid-diagram" aria-label="Documentation diagram"><div class="mermaid">${escapeHtml(codeBuffer.join("\n"))}</div></div>`,
      );
    } else {
      const languageClass = codeFenceLanguage ? ` class="language-${escapeHtml(codeFenceLanguage)}"` : "";
      blocks.push(`<pre><code${languageClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    }

    codeBuffer.length = 0;
    codeFenceLanguage = "";
    isInCodeFence = false;
  };

  const flushTable = (startIndex: number) => {
    const headerCells = parseMarkdownTableRow(lines[startIndex] ?? "");
    const separatorLine = lines[startIndex + 1] ?? "";

    if (headerCells.length === 0 || !isMarkdownTableSeparator(separatorLine)) {
      return startIndex;
    }

    const alignments = getMarkdownTableAlignments(separatorLine);
    const bodyRows: string[][] = [];
    let cursor = startIndex + 2;

    while (cursor < lines.length) {
      const candidate = lines[cursor] ?? "";

      if (!candidate.trim() || !candidate.includes("|")) {
        break;
      }

      const rowCells = parseMarkdownTableRow(candidate);

      if (rowCells.length === 0) {
        break;
      }

      bodyRows.push(rowCells);
      cursor += 1;
    }

    const renderTableCells = (cells: string[], tagName: "th" | "td") =>
      cells
        .map((cell, index) => {
          const alignment = alignments[index] ? ` style="text-align:${alignments[index]}"` : "";
          return `<${tagName}${alignment}>${renderInlineMarkdown(cell)}</${tagName}>`;
        })
        .join("");

    blocks.push(
      `<div class="docs-markdown-table-wrap"><table><thead><tr>${renderTableCells(headerCells, "th")}</tr></thead>${bodyRows.length > 0 ? `<tbody>${bodyRows.map((row) => `<tr>${renderTableCells(row, "td")}</tr>`).join("")}</tbody>` : ""}</table></div>`,
    );

    return cursor - 1;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const unorderedMatch = line.match(/^\s*-\s+(.+)$/);
    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    const quoteMatch = line.match(/^\s*>\s+(.+)$/);
    const codeFenceMatch = line.match(/^```(.*)$/);

    if (codeFenceMatch) {
      if (isInCodeFence) {
        flushCodeFence();
      } else {
        flushParagraph();
        flushList();
        isInCodeFence = true;
        codeFenceLanguage = codeFenceMatch[1]?.trim() ?? "";
      }

      continue;
    }

    if (isInCodeFence) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const nextLine = lines[index + 1] ?? "";

    if (line.includes("|") && nextLine && isMarkdownTableSeparator(nextLine)) {
      flushParagraph();
      flushList();
      index = flushTable(index);
      continue;
    }

    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      blocks.push(`<h${level} id="${slugifyHeading(content)}">${renderInlineMarkdown(content)}</h${level}>`);
      continue;
    }

    if (unorderedMatch) {
      flushParagraph();
      if (listBuffer.length > 0 && listBuffer[0]?.type !== "ul") {
        flushList();
      }
      listBuffer.push({ type: "ul", html: renderInlineMarkdown(unorderedMatch[1].trim()) });
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      if (listBuffer.length > 0 && listBuffer[0]?.type !== "ol") {
        flushList();
      }
      listBuffer.push({ type: "ol", html: renderInlineMarkdown(orderedMatch[1].trim()) });
      continue;
    }

    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote><p>${renderInlineMarkdown(quoteMatch[1].trim())}</p></blockquote>`);
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCodeFence();

  return blocks.join("\n");
}

function getHeadingTitle(body: string) {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function getBodySummary(body: string) {
  const paragraphs = body
    .split(/\n\s*\n/g)
    .map((section) => section.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((section) => !section.startsWith("#"));

  return paragraphs.find((section) => section.split(/\s+/).length > 4) ?? paragraphs[0] ?? "";
}

function getDocumentHeadings(body: string) {
  return [...body.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
}

function buildDocumentSlugSegments(repositorySlug: string, filePath: string) {
  const normalizedPath = normalizePath(filePath);
  const segments = normalizedPath.split("/");
  const fileName = segments.pop() ?? "";
  const stem = fileName.replace(/\.md$/i, "");

  if (stem.toLowerCase() === "readme" || stem.toLowerCase() === "index") {
    return [repositorySlug, ...segments];
  }

  return [repositorySlug, ...segments, stem];
}

function getFileTitle(body: string, frontmatterTitle: string, filePath: string) {
  return (
    frontmatterTitle ||
    getHeadingTitle(body) ||
    toLabel(posix.basename(filePath.replace(/\.md$/i, "")))
  );
}

function matchesDocumentRule(rule: DocumentScanRuleConfig, filePath: string) {
  const normalizedPath = normalizePath(filePath);
  const domainMatches =
    rule.domains.length === 0 ||
    rule.domains.some((domain) => {
      const normalizedDomain = normalizePath(domain);
      return normalizedPath === normalizedDomain || normalizedPath.startsWith(`${normalizedDomain}/`);
    });
  const includeMatches =
    rule.include.length === 0 ||
    rule.include.some((pattern) => wildcardToRegex(pattern).test(normalizedPath));
  const excludeMatches = rule.exclude.some((pattern) => wildcardToRegex(pattern).test(normalizedPath));

  return domainMatches && includeMatches && !excludeMatches && normalizedPath.endsWith(".md");
}

async function listLocalRepositoryFiles(repositoryRoot: string, currentPath = ""): Promise<string[]> {
  const absolutePath = currentPath
    ? posix.join(repositoryRoot.replaceAll("\\", "/"), currentPath)
    : repositoryRoot.replaceAll("\\", "/");
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = currentPath ? posix.join(currentPath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") {
          return [];
        }

        return listLocalRepositoryFiles(repositoryRoot, relativePath);
      }

      if (entry.isFile()) {
        return [relativePath.replaceAll("\\", "/")];
      }

      return [];
    }),
  );

  return files.flat();
}

async function getRepositoryFilePaths(repository: ResolvedDocumentRepository) {
  try {
    const tree = await getGitHubTree(repository.repository, repository.ref);
    const remotePaths = [...new Set(
      tree.filter((entry) => entry.type === "blob").map((entry) => normalizePath(entry.path)),
    )].sort((left, right) => left.localeCompare(right));

    if (remotePaths.length > 0 || !repository.localPath) {
      return remotePaths;
    }
  } catch (error) {
    if (!repository.localPath) {
      throw error;
    }
  }

  return [...new Set((await listLocalRepositoryFiles(repository.localPath)).map(normalizePath))].sort(
    (left, right) => left.localeCompare(right),
  );
}

async function getRemoteRepositoryFilePaths(repository: ResolvedDocumentRepository) {
  try {
    const tree = await getGitHubTree(repository.repository, repository.ref);
    return [...new Set(
      tree.filter((entry) => entry.type === "blob").map((entry) => normalizePath(entry.path)),
    )].sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function getRepositoryDocumentMatches(repository: ResolvedDocumentRepository, paths?: string[]) {
  const repositoryPaths = paths ?? (await getRepositoryFilePaths(repository));

  const matches = new Map<string, DocumentMatch>();

  for (const path of repositoryPaths) {
    if (!path.endsWith(".md")) {
      continue;
    }

    const matchedRules = repository.documentRules.filter((rule) => matchesDocumentRule(rule, path));

    if (matchedRules.length === 0) {
      continue;
    }

    matches.set(normalizePath(path), {
      path: normalizePath(path),
      rules: matchedRules,
    });
  }

  return [...matches.values()].sort((left, right) => left.path.localeCompare(right.path));
}

async function readDocumentSource(repository: ResolvedDocumentRepository, filePath: string) {
  const normalizedPath = normalizePath(filePath);
  const rawUrl = getGitHubRawUrl(repository.repository, repository.ref, normalizedPath);
  const sourceUrl = getGitHubBlobUrl(repository.repository, repository.ref, normalizedPath);

  if (repository.localPath) {
    const localPath = posix.join(repository.localPath.replaceAll("\\", "/"), normalizedPath);
    try {
      return {
        markdownSource: await readFile(localPath, "utf-8"),
        rawUrl,
        sourceUrl,
      };
    } catch {
      // Fall back to GitHub when the local workspace does not contain the file.
    }
  }

  try {
    return {
      markdownSource: await fetchText(rawUrl),
      rawUrl,
      sourceUrl,
    };
  } catch (error) {
    throw error;
  }
}

async function buildDocumentPage(
  repository: ResolvedDocumentRepository,
  match: DocumentMatch,
  remotePaths: Set<string>,
): Promise<DocumentPage | null> {
  let markdownSource = "";
  let rawUrl = "";
  let sourceUrl = "";

  try {
    const resolved = await readDocumentSource(repository, match.path);
    markdownSource = resolved.markdownSource;
    rawUrl = resolved.rawUrl;
    sourceUrl = resolved.sourceUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes(": 404") || message.includes(": 403")) {
      return null;
    }

    throw error;
  }

  const { data, body } = parseFrontmatter(markdownSource);
  const slugSegments = buildDocumentSlugSegments(repository.repositorySlug, match.path);
  const { htmlUrl, markdownUrl } = getDocumentsUrls(slugSegments);
  const updated =
    toScalar(data.updated) || (await getGitHubCommitDate(repository.repository, repository.ref, match.path));
  const hasRemoteSource = remotePaths.has(match.path.toLowerCase());

  return {
    pageType: "document",
    title: getFileTitle(body, toScalar(data.title), match.path),
    summary: toScalar(data.summary, getBodySummary(body)),
    status: toScalar(data.status, "Published"),
    owner: toScalar(data.owner, repository.owner),
    updated,
    docType: toScalar(data.doc_type, match.rules[0]?.name || "Markdown Document"),
    body,
    bodyHtml: renderMarkdownToHtml(body),
    relativePath: match.path,
    slugSegments,
    htmlUrl,
    markdownUrl,
    repositorySlug: repository.repositorySlug,
    repositoryName: repository.repositoryName,
    repository: repository.repository,
    repositoryRef: repository.ref,
    repositoryUrl: getGitHubRepositoryUrl(repository.repository),
    sourceUrl: hasRemoteSource ? sourceUrl : "",
    rawUrl: hasRemoteSource ? rawUrl : "",
    isFolderIndex: ["readme.md", "index.md"].includes(posix.basename(match.path).toLowerCase()),
    ruleLabels: [...new Set(match.rules.map((rule) => rule.name))],
    domainRoots: [...new Set(match.rules.flatMap((rule) => rule.domains))],
    sourceNames: [...repository.sourceNames],
  };
}

function getLatestDocumentDate(pages: DocumentPage[]) {
  return [...pages]
    .map((page) => page.updated)
    .filter(Boolean)
    .sort()
    .at(-1) ?? "";
}

function compareDocumentPagePrecedence(left: DocumentPage, right: DocumentPage) {
  const leftBaseName = posix.basename(left.relativePath).toLowerCase();
  const rightBaseName = posix.basename(right.relativePath).toLowerCase();
  const folderIndexPriority = (value: string) => {
    if (value === "readme.md") {
      return 0;
    }

    if (value === "index.md") {
      return 1;
    }

    return 2;
  };

  return (
    folderIndexPriority(leftBaseName) - folderIndexPriority(rightBaseName) ||
    left.relativePath.localeCompare(right.relativePath) ||
    left.title.localeCompare(right.title)
  );
}

function dedupeDocumentPages(pages: DocumentPage[]) {
  const bySlug = new Map<string, DocumentPage>();

  for (const page of pages) {
    const key = page.slugSegments.join("/");
    const current = bySlug.get(key);

    if (!current || compareDocumentPagePrecedence(page, current) < 0) {
      bySlug.set(key, page);
    }
  }

  return [...bySlug.values()];
}

function buildRepositoryContentTree(repositoryPages: DocumentPage[]) {
  const repositoryPage = repositoryPages.find((page) => page.pageType === "repository");

  if (!repositoryPage) {
    return null;
  }

  const root: MutableFolderNode = {
    title: repositoryPage.title,
    href: repositoryPage.htmlUrl,
    status: repositoryPage.status,
    docType: repositoryPage.docType,
    slugSegments: repositoryPage.slugSegments,
    folders: new Map<string, MutableFolderNode>(),
    documents: [],
  };

  const getOrCreateFolder = (parent: MutableFolderNode, folderSlugSegments: string[]) => {
    const key = folderSlugSegments.join("/");
    const existing = parent.folders.get(key);

    if (existing) {
      return existing;
    }

    const pageForFolder = repositoryPages.find(
      (page) => page.pageType === "document" && page.isFolderIndex && page.slugSegments.join("/") === key,
    );

    const folder = {
      title: pageForFolder?.title ?? toLabel(folderSlugSegments.at(-1) ?? ""),
      href: pageForFolder?.htmlUrl,
      status: pageForFolder?.status ?? "",
      docType: pageForFolder?.docType ?? "Folder",
      slugSegments: folderSlugSegments,
      page: pageForFolder,
      folders: new Map<string, MutableFolderNode>(),
      documents: [],
    } satisfies MutableFolderNode;

    parent.folders.set(key, folder);
    return folder;
  };

  for (const page of repositoryPages) {
    if (page.pageType !== "document") {
      continue;
    }

    const relativeSegments = page.slugSegments.slice(1);
    const folderSegments = page.isFolderIndex ? relativeSegments : relativeSegments.slice(0, -1);
    let cursor = root;
    let accumulatedSegments = [repositoryPage.repositorySlug];

    for (const segment of folderSegments) {
      accumulatedSegments = [...accumulatedSegments, segment];
      cursor = getOrCreateFolder(cursor, accumulatedSegments);
    }

    if (!page.isFolderIndex) {
      cursor.documents.push(page);
    }
  }

  return root;
}

function flattenRepositoryDocumentSequence(root: MutableFolderNode) {
  const ordered: DocumentPage[] = [];

  const visitFolder = (folder: MutableFolderNode, isRoot = false) => {
    if (!isRoot && folder.page) {
      ordered.push(folder.page);
    }

    const documents = [...folder.documents].sort((left, right) => left.title.localeCompare(right.title));
    const childFolders = [...folder.folders.values()].sort((left, right) => left.title.localeCompare(right.title));

    for (const document of documents) {
      ordered.push(document);
    }

    for (const childFolder of childFolders) {
      visitFolder(childFolder);
    }
  };

  visitFolder(root, true);
  return ordered;
}

function getLatestDocumentPage(pages: DocumentPage[]) {
  return [...pages]
    .filter((page) => page.pageType === "document")
    .filter((page) => Boolean(page.updated))
    .sort(
      (left, right) =>
        right.updated.localeCompare(left.updated) ||
        left.relativePath.localeCompare(right.relativePath) ||
        left.title.localeCompare(right.title),
    )
    .at(0);
}

function buildSyntheticFolderOverviewMarkdown(
  repository: ResolvedDocumentRepository,
  folderPath: string,
  title: string,
  childFolders: string[],
  childPages: DocumentPage[],
) {
  const lines = [
    `# ${title}`,
    "",
    `Generated folder landing page for \`${folderPath}\` in \`${repository.repository}\`.`,
    "",
    "## Overview",
    "",
    `- Child folders: ${childFolders.length}`,
    `- Child pages: ${childPages.length}`,
    "",
  ];

  if (childFolders.length > 0) {
    lines.push("## Child folders");
    lines.push("");

    for (const childFolder of childFolders) {
      lines.push(`- ${toLabel(posix.basename(childFolder))}`);
    }

    lines.push("");
  }

  if (childPages.length > 0) {
    lines.push("## Child pages");
    lines.push("");

    for (const childPage of childPages) {
      lines.push(`- ${childPage.title}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function createSyntheticFolderPages(repository: ResolvedDocumentRepository, pages: DocumentPage[]) {
  const existingBySlug = new Map(pages.map((page) => [page.slugSegments.join("/"), page] as const));
  const targetFolders = new Set<string>();

  for (const page of pages) {
    const relativeSegments = page.slugSegments.slice(1);
    const maxDepth = page.isFolderIndex ? relativeSegments.length - 1 : relativeSegments.length - 1;

    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const folderSegments = [repository.repositorySlug, ...relativeSegments.slice(0, depth)];
      targetFolders.add(folderSegments.join("/"));
    }
  }

  const syntheticPages: DocumentPage[] = [];

  for (const folderSlug of [...targetFolders].sort()) {
    if (existingBySlug.has(folderSlug)) {
      continue;
    }

    const slugSegments = folderSlug.split("/");
    const relativeSegments = slugSegments.slice(1);
    const folderPath = relativeSegments.join("/");
    const descendantPages = pages.filter((page) => {
      const pageSlug = page.slugSegments.join("/");
      return pageSlug.startsWith(`${folderSlug}/`) || pageSlug === folderSlug;
    });
    const childFolders = new Set<string>();
    const childPages: DocumentPage[] = [];

    for (const page of descendantPages) {
      const pageRelativeSegments = page.slugSegments.slice(slugSegments.length);

      if (pageRelativeSegments.length === 0) {
        continue;
      }

      if (page.isFolderIndex) {
        if (pageRelativeSegments.length === 1) {
          childPages.push(page);
        } else {
          childFolders.add([...relativeSegments, pageRelativeSegments[0]].join("/"));
        }
        continue;
      }

      if (pageRelativeSegments.length === 1) {
        childPages.push(page);
      } else {
        childFolders.add([...relativeSegments, pageRelativeSegments[0]].join("/"));
      }
    }

    const updated = descendantPages
      .map((page) => page.updated)
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";
    const { htmlUrl, markdownUrl } = getDocumentsUrls(slugSegments);
    const title = toLabel(relativeSegments.at(-1) ?? repository.repositorySlug);
    const body = buildSyntheticFolderOverviewMarkdown(
      repository,
      folderPath,
      title,
      [...childFolders].sort(),
      childPages.sort((left, right) => left.title.localeCompare(right.title)),
    );

    syntheticPages.push({
      pageType: "document",
      title,
      summary: `Generated folder landing page for ${folderPath} in ${repository.repository}.`,
      status: "Generated",
      owner: repository.owner,
      updated,
      docType: "Folder Index",
      body,
      bodyHtml: renderMarkdownToHtml(body),
      relativePath: folderPath,
      slugSegments,
      htmlUrl,
      markdownUrl,
      repositorySlug: repository.repositorySlug,
      repositoryName: repository.repositoryName,
      repository: repository.repository,
      repositoryRef: repository.ref,
      repositoryUrl: getGitHubRepositoryUrl(repository.repository),
      sourceUrl: getGitHubTreeUrl(repository.repository, repository.ref, folderPath),
      rawUrl: "",
      isFolderIndex: true,
      ruleLabels: [...new Set(descendantPages.flatMap((page) => page.ruleLabels))],
      domainRoots: [...new Set(descendantPages.flatMap((page) => page.domainRoots))],
      sourceNames: [...repository.sourceNames],
    });
  }

  return syntheticPages;
}

function buildRepositoryOverviewMarkdown(
  repository: ResolvedDocumentRepository,
  pages: DocumentPage[],
  folderCount: number,
) {
  const roots = [...new Set(pages.flatMap((page) => page.domainRoots).filter(Boolean))].sort();
  const ruleLabels = [...new Set(pages.flatMap((page) => page.ruleLabels).filter(Boolean))].sort();
  const lines = [
    `# ${repository.repository}`,
    "",
    `Documentation discovered from GitHub using configured repository filters and document scan rules for \`${repository.repository}\`.`,
    "",
    "## Repository metadata",
    "",
    `- Owner: ${repository.owner}`,
    `- Branch: ${repository.ref}`,
    `- Files discovered: ${pages.length}`,
    `- Folders discovered: ${folderCount}`,
    `- Scan rules: ${ruleLabels.join(", ") || "None"}`,
    `- Roots: ${roots.join(", ") || "None"}`,
    "",
    "## Discovery model",
    "",
    "Each repository page is generated after the site expands the configured repository filters, scans the GitHub tree for Markdown files that match the declared document rules, and maps the surviving files into a folder-aware navigation tree.",
    "",
    "## Source configs",
    "",
    ...repository.sourceNames.map((name) => `- ${name}`),
    "",
  ];

  return lines.join("\n");
}

function buildRepositoryPage(
  repository: ResolvedDocumentRepository,
  pages: DocumentPage[],
  scanGeneratedAt: string,
): DocumentPage {
  const slugSegments = [repository.repositorySlug];
  const { htmlUrl, markdownUrl } = getDocumentsUrls(slugSegments);
  const folderCount = new Set(
    pages
      .map((page) => page.relativePath.split("/").slice(0, -1).join("/"))
      .filter(Boolean),
  ).size;
  const body = buildRepositoryOverviewMarkdown(repository, pages, folderCount);
  const roots = [...new Set(pages.flatMap((page) => page.domainRoots).filter(Boolean))].sort();
  const ruleLabels = [...new Set(pages.flatMap((page) => page.ruleLabels).filter(Boolean))].sort();
  const latestDocumentPage = getLatestDocumentPage(pages);
  const datedDocumentCount = pages.filter((page) => Boolean(page.updated)).length;

  return {
    pageType: "repository",
    title: repository.repository,
    summary: `Repository landing page for ${repository.repository} and its discovered Markdown documentation.`,
    status: "Scanned",
    owner: repository.owner,
    updated: getLatestDocumentDate(pages),
    docType: "Repository Index",
    body,
    bodyHtml: renderMarkdownToHtml(body),
    relativePath: "",
    slugSegments,
    htmlUrl,
    markdownUrl,
    repositorySlug: repository.repositorySlug,
    repositoryName: repository.repositoryName,
    repository: repository.repository,
    repositoryRef: repository.ref,
    repositoryUrl: getGitHubRepositoryUrl(repository.repository),
    sourceUrl: getGitHubRepositoryUrl(repository.repository),
    rawUrl: "",
    isFolderIndex: false,
    ruleLabels,
    domainRoots: roots,
    sourceNames: [...repository.sourceNames],
    fileCount: pages.length,
    folderCount,
    lastScannedAt: scanGeneratedAt,
    latestDocumentTitle: latestDocumentPage?.title ?? "",
    latestDocumentUpdated: latestDocumentPage?.updated ?? "",
    latestDocumentHtmlUrl: latestDocumentPage?.htmlUrl ?? "",
    latestDocumentPath: latestDocumentPage?.relativePath ?? "",
    datedDocumentCount,
  };
}

async function getDocumentSourceConfigs() {
  const rawFile = await readFile(documentsRepositoriesYamlPath, "utf-8");
  const document = (parseYaml(rawFile) as DocumentsSourceDocument | null) ?? {};
  const repositories = document.repositories ?? [];

  return repositories
    .map((repository) => {
      const slug = toScalar(repository.slug);
      const name = toScalar(repository.name, slug);

      return {
        slug,
        name,
        account: toScalar(repository.account),
        repository: toScalar(repository.repository) || undefined,
        ref: toScalar(repository.ref) || undefined,
        owner: toScalar(repository.owner, "Documentation"),
        includeRepositories: toStringArray(repository.include_repositories),
        excludeRepositories: toStringArray(repository.exclude_repositories),
        documents: ((repository.documents as Array<Record<string, unknown>> | undefined) ?? []).map((rule) => ({
          sourceSlug: slug,
          sourceName: name,
          slug: toScalar(rule.slug),
          name: toScalar(rule.name, toScalar(rule.slug)),
          domains: toStringArray(rule.domains).map(normalizePath),
          include: toStringArray(rule.include).map(normalizePath),
          exclude: toStringArray(rule.exclude).map(normalizePath),
        })),
      } satisfies DocumentSourceConfig;
    })
    .filter((repository) => repository.slug && repository.account && repository.documents.length > 0);
}

async function loadDocumentsData(): Promise<DocumentsData> {
  const scanGeneratedAt = new Date().toISOString();
  const sourceConfigs = await getDocumentSourceConfigs();
  const scannedRepositories = mergeResolvedRepositories(
    (await Promise.all(sourceConfigs.map((source) => getGitHubAccountRepositories(source)))).flat(),
  );

  const documentPagesByRepository = await Promise.all(
    scannedRepositories.map(async (repository) => {
      const remoteRepositoryPaths = await getRemoteRepositoryFilePaths(repository);
      const repositoryPaths = await getRepositoryFilePaths(repository);
      const matches = await getRepositoryDocumentMatches(repository, repositoryPaths);
      const remotePathSet = new Set(remoteRepositoryPaths.map((path) => path.toLowerCase()));
      const basePages = dedupeDocumentPages((
        await Promise.all(matches.map((match) => buildDocumentPage(repository, match, remotePathSet)))
      ).filter((page): page is DocumentPage => Boolean(page)));
      const syntheticPages = createSyntheticFolderPages(repository, basePages);
      const pages = [...basePages, ...syntheticPages].sort((left, right) =>
        left.relativePath.localeCompare(right.relativePath) || left.title.localeCompare(right.title),
      );

      return {
        repository,
        repositoryPaths,
        pages,
      };
    }),
  );
  for (const entry of documentPagesByRepository) {
    const pagesBySourcePath = new Map(
      entry.pages.map((page) => [normalizePath(page.relativePath).toLowerCase(), page] as const),
    );
    const repositoryPaths = new Set(entry.repositoryPaths.map((path) => path.toLowerCase()));

    for (const page of entry.pages) {
      const sourceBody = page.body;
      page.body = rewriteDocumentBodyLinks(
        sourceBody,
        page.relativePath,
        pagesBySourcePath,
        entry.repository,
        repositoryPaths,
        "markdown",
      );
      page.bodyHtml = renderMarkdownToHtml(
        rewriteDocumentBodyLinks(
          sourceBody,
          page.relativePath,
          pagesBySourcePath,
          entry.repository,
          repositoryPaths,
          "html",
        ),
      );
    }
  }

  const matchedRepositories = documentPagesByRepository
    .filter((entry) => entry.pages.length > 0)
    .map((entry) => entry.repository)
    .sort((left, right) => left.repository.localeCompare(right.repository));

  const repositoryPages = documentPagesByRepository
    .filter((entry) => entry.pages.length > 0)
    .map((entry) => buildRepositoryPage(entry.repository, entry.pages, scanGeneratedAt))
    .sort((left, right) => left.title.localeCompare(right.title));

  const documentPages = documentPagesByRepository
    .flatMap((entry) => entry.pages)
    .sort((left, right) =>
      left.repository.localeCompare(right.repository) ||
      left.relativePath.localeCompare(right.relativePath) ||
      left.title.localeCompare(right.title),
    );

  const repositorySummaries = repositoryPages.map((page) => ({
    repositorySlug: page.repositorySlug,
    repositoryName: page.repositoryName,
    repository: page.repository,
    repositoryUrl: page.repositoryUrl,
    owner: page.owner,
    updated: page.updated,
    status: page.status,
    docType: page.docType,
    summary: page.summary,
    htmlUrl: page.htmlUrl,
    markdownUrl: page.markdownUrl,
    fileCount: page.fileCount ?? 0,
    folderCount: page.folderCount ?? 0,
    ruleCount: page.ruleLabels.length,
    sourceCount: page.sourceNames.length,
    roots: page.domainRoots,
  }));
  const searchEntries = documentPages.map((page) => ({
    pageType: page.pageType,
    title: page.title,
    summary: page.summary,
    repository: page.repository,
    repositorySlug: page.repositorySlug,
    relativePath: page.relativePath,
    htmlUrl: page.htmlUrl,
    markdownUrl: page.markdownUrl,
    headings: getDocumentHeadings(page.body),
  }));

  return {
    pages: [...repositoryPages, ...documentPages],
    searchEntries,
    repositorySummaries,
    sourceConfigs,
    scannedRepositories,
    matchedRepositories,
    documentCount: documentPages.length,
  };
}

async function getDocumentsData() {
  documentsDataPromise ??= loadDocumentsData();
  return documentsDataPromise;
}

export async function getDocumentIndexData() {
  return getDocumentsData();
}

export async function getDocumentRepositorySummaries() {
  const { repositorySummaries } = await getDocumentsData();
  return repositorySummaries;
}

export async function getDocumentPages() {
  const { pages } = await getDocumentsData();
  return pages;
}

export async function getDocumentSearchEntries() {
  const { searchEntries } = await getDocumentsData();
  return searchEntries;
}

export async function getDocumentPageBySlug(slugSegments: string[]) {
  const pages = await getDocumentPages();
  const normalized = slugSegments.join("/");
  return pages.find((page) => page.slugSegments.join("/") === normalized);
}

export async function getDocumentStaticPaths() {
  const pages = await getDocumentPages();
  return pages.map((page) => ({
    params: {
      slug: page.slugSegments.join("/"),
    },
    props: {
      page,
    },
  }));
}

export async function getDocumentTree(repositorySlug: string, activeSlugSegments: string[]) {
  const pages = await getDocumentPages();
  const repositoryPages = pages.filter((page) => page.repositorySlug === repositorySlug);
  const root = buildRepositoryContentTree(repositoryPages);

  if (!root) {
    return [];
  }

  const isActivePath = (candidateSegments: string[]) =>
    candidateSegments.every((segment, index) => activeSlugSegments[index] === segment);

  const toTreeNode = (folder: MutableFolderNode, depth: number): DocumentTreeNode => {
    const folderChildren = [...folder.folders.values()]
      .sort((left, right) => left.title.localeCompare(right.title))
      .map((child) => toTreeNode(child, depth + 1));
    const documentChildren = [...folder.documents]
      .sort((left, right) => left.title.localeCompare(right.title))
      .map((page) => ({
        kind: "file",
        title: page.title,
        href: page.htmlUrl,
        status: page.status,
        docType: page.docType,
        depth: depth + 1,
        isActive: page.slugSegments.join("/") === activeSlugSegments.join("/"),
        hasActiveDescendant: false,
        shouldOpen: false,
        children: [],
      }) satisfies DocumentTreeNode);

    const children = [...folderChildren, ...documentChildren];
    const isActive = isActivePath(folder.slugSegments);
    const hasActiveDescendant = children.some((child) => child.isActive || child.hasActiveDescendant);

    return {
      kind: "folder",
      title: folder.title,
      href: folder.href,
      status: folder.status,
      docType: folder.docType,
      depth,
      isActive,
      hasActiveDescendant,
      shouldOpen: depth === 0 || isActive || hasActiveDescendant,
      children,
    };
  };

  return [toTreeNode(root, 0)];
}

export function getDocumentsIndexMarkdown(data: DocumentsData) {
  const { repositorySummaries, sourceConfigs, scannedRepositories, documentCount } = data;
  const doc = createMarkdownDocument({
    title: "Documentation",
    description: "Markdown companion for the repository-driven documentation index.",
    canonicalHtml: withBasePath("/documents/"),
  });

  doc.heading("Documentation");
  doc.paragraph("Repository-driven documentation index built from repository filters and document scan rules declared in `data/document-repositories.yaml`.");
  doc.keyValueList([
    { label: "Config entries", value: String(sourceConfigs.length) },
    { label: "Repositories scanned", value: String(scannedRepositories.length) },
    { label: "Repositories with matching docs", value: String(repositorySummaries.length) },
    { label: "Markdown files discovered", value: String(documentCount) },
  ]);
  doc.section("Repository index");

  for (const repository of repositorySummaries) {
    doc.subheading(repository.repository, 3);
    doc.keyValueList([
      { label: "Owner", value: repository.owner },
      { label: "Updated", value: repository.updated || "Unknown" },
      { label: "Files", value: String(repository.fileCount) },
      { label: "Folders", value: String(repository.folderCount) },
      { label: "Rules", value: String(repository.ruleCount) },
      { label: "Roots", value: repository.roots.join(", ") || "None" },
      { label: "Open", value: markdownLink("View repository docs", repository.markdownUrl) },
    ]);
  }

  doc.paragraph(markdownLink("Back to home", withBasePath("/index.md")));

  return doc.finish();
}

function appendTreeMarkdown(doc: MarkdownDocument, nodes: DocumentTreeNode[], depth = 0) {
  for (const node of nodes) {
    const label = node.href
      ? markdownLink(node.title, node.href.endsWith("/") ? `${node.href.slice(0, -1)}.md` : `${node.href}.md`)
      : node.title;
    doc.bullet(label, depth);

    if (node.children.length > 0) {
      appendTreeMarkdown(doc, node.children, depth + 1);
    }
  }
}

export function getDocumentDetailMarkdown(page: DocumentPage, tree: DocumentTreeNode[]) {
  const documentBody = stripLeadingHeadingAndSummary(page.body, page.title, page.summary);
  const doc = createMarkdownDocument({
    title: page.title,
    description: page.summary,
    canonicalHtml: page.htmlUrl,
  });

  doc.heading(page.title);
  doc.paragraph(page.summary);
  doc.section("Metadata", () => {
    doc.keyValueList([
      { label: "Repository", value: page.repository },
      { label: "Owner", value: page.owner },
      { label: "Updated", value: page.updated || "Unknown" },
      { label: "Type", value: page.docType },
      { label: "Status", value: page.status },
      { label: "Scan rules", value: page.ruleLabels.join(", ") || "None" },
      { label: "Roots", value: page.domainRoots.join(", ") || "None" },
      ...(page.pageType === "document" ? [{ label: "Source file", value: page.relativePath }] : []),
      ...(page.rawUrl ? [{ label: "Raw source", value: page.rawUrl }] : []),
    ]);
  });
  doc.section("Folder index", () => {
    appendTreeMarkdown(doc, tree);
    doc.blank();
  });
  doc.section(page.pageType === "repository" ? "Repository overview" : "Document body", () => {
    doc.raw(documentBody);
  });
  doc.paragraph(markdownLink("Back to documents index", withBasePath("/documents.md")));

  return doc.finish();
}
