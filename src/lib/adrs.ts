import { posix } from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { createMarkdownDocument, markdownLink } from "./markdown";
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

interface AdrSourceConfig {
  slug: string;
  name: string;
  account: string;
  repository?: string;
  ref?: string;
  product: string;
  owner: string;
  domains: string[];
  include: string[];
  exclude: string[];
}

interface ResolvedAdrRepository {
  slug: string;
  name: string;
  account: string;
  repository: string;
  ref: string;
  localPath?: string;
  product: string;
  owner: string;
  domains: string[];
  include: string[];
  exclude: string[];
}

interface AdrSourcesDocument {
  repositories?: Array<Record<string, unknown>>;
}

export interface AdrPage {
  adrNumber: string;
  title: string;
  summary: string;
  status: string;
  product: string;
  date: string;
  year: string;
  owner: string;
  area: string;
  tags: string[];
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
}

interface AdrsData {
  pages: AdrPage[];
  products: string[];
  statuses: string[];
  years: string[];
  areas: string[];
  repositories: AdrSourceConfig[];
  scannedRepositories: ResolvedAdrRepository[];
}

const adrSourcesYamlPath = posix.join(process.cwd().replaceAll("\\", "/"), "data", "adr-repositories.yaml");
const githubTreeCache = new Map<string, GitHubTreeEntry[]>();
const githubTextCache = new Map<string, string>();
const githubCommitDateCache = new Map<string, string>();
const githubAccountRepositoriesCache = new Map<string, ResolvedAdrRepository[]>();
let adrsDataPromise: Promise<AdrsData> | undefined;

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

function toLabel(value: string) {
  return value
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizePath(value: string) {
  return value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
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

function getAdrUrls(slugSegments: string[]) {
  const slugPath = slugSegments.join("/");

  return {
    htmlUrl: withBasePath(`/adrs/${slugPath}/`),
    markdownUrl: withBasePath(`/adrs/${slugPath}.md`),
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

function getGitHubRawUrl(repository: string, ref: string, filePath: string) {
  const encodedPath = normalizePath(filePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(ref)}/${encodedPath}`;
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

    if (matchesGitHubStatus(message, [403, 404, 429])) {
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

async function getGitHubAccountRepositories(source: AdrSourceConfig) {
  const cacheKey = `${source.account}:${source.repository ?? "*"}:${source.ref ?? ""}`;
  const cached = githubAccountRepositoriesCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  if (source.repository) {
    const repositories = [
      {
        slug: source.slug,
        name: source.name,
        account: source.account,
        repository: source.repository,
        ref: source.ref ?? "main",
        localPath: undefined,
        product: source.product,
        owner: source.owner,
        domains: source.domains,
        include: source.include,
        exclude: source.exclude,
      } satisfies ResolvedAdrRepository,
    ];
    githubAccountRepositoriesCache.set(cacheKey, repositories);
    return repositories;
  }

  const userRepositoriesUrl =
    `https://api.github.com/users/${encodeURIComponent(source.account)}/repos?per_page=100&sort=updated`;
  let payload: GitHubRepositoryResponse[];

  try {
    payload = await fetchJson<GitHubRepositoryResponse[]>(userRepositoriesUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (matchesGitHubStatus(message, [403, 429])) {
      const localFallback = await getLocalAccountRepositories(source);
      githubAccountRepositoriesCache.set(cacheKey, localFallback);
      return localFallback;
    }

    throw error;
  }

  const repositories = payload
    .filter((repository) => repository.full_name)
    .filter((repository) => !repository.archived && !repository.disabled)
    .map((repository) => ({
      slug: repository.full_name?.split("/").join("-") ?? source.slug,
      name: repository.full_name ?? source.name,
      account: source.account,
      repository: repository.full_name ?? "",
      ref: source.ref ?? repository.default_branch ?? "main",
      product: source.product || toLabel(repository.full_name?.split("/").at(-1) ?? source.account),
      owner: source.owner,
      domains: source.domains,
      include: source.include,
      exclude: source.exclude,
    }))
    .filter((repository) => repository.repository);

  githubAccountRepositoriesCache.set(cacheKey, repositories);
  return repositories;
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

async function getLocalAccountRepositories(source: AdrSourceConfig) {
  const workspaceRoot = getLocalWorkspaceRoot();
  const entries = await readdir(workspaceRoot, { withFileTypes: true });
  const repositories: ResolvedAdrRepository[] = [];

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

      repositories.push({
        slug: repository.replace("/", "-"),
        name: repository,
        account: source.account,
        repository,
        ref: currentRef,
        localPath: repositoryRoot,
        product: toLabel(repository.split("/").at(-1) ?? source.account),
        owner: source.owner,
        domains: source.domains,
        include: source.include,
        exclude: source.exclude,
      });
    } catch {
      continue;
    }
  }

  return repositories.sort((left, right) => left.repository.localeCompare(right.repository));
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

    const languageClass = codeFenceLanguage ? ` class="language-${escapeHtml(codeFenceLanguage)}"` : "";
    blocks.push(`<pre><code${languageClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    codeBuffer.length = 0;
    codeFenceLanguage = "";
    isInCodeFence = false;
  };

  for (const line of lines) {
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
  const bodyWithoutStatus = body.replace(/^##\s+Status\s+[\s\S]*?(?=\n##\s+|\n#\s+|$)/m, "");
  const paragraphs = bodyWithoutStatus
    .split(/\n\s*\n/g)
    .map((section) => section.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((section) => !section.startsWith("#"));

  return paragraphs.find((section) => section.split(/\s+/).length > 3) ?? paragraphs[0] ?? "";
}

function getStatusFromBody(body: string) {
  const statusSectionMatch = body.match(/^##\s+Status\s+([\s\S]*?)(?:\n##\s+|\n#\s+|$)/m);
  return statusSectionMatch?.[1]?.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

function parseAdrHeading(heading: string) {
  const match = heading.match(/^ADR\s+(\d+):\s+(.+)$/i);

  if (!match) {
    return {
      adrNumber: "",
      title: heading,
    };
  }

  return {
    adrNumber: match[1],
    title: match[2].trim(),
  };
}

function buildArea(source: ResolvedAdrRepository, filePath: string) {
  const normalizedPath = normalizePath(filePath);

  for (const domain of source.domains) {
    const normalizedDomain = normalizePath(domain);

    if (normalizedPath === normalizedDomain || normalizedPath.startsWith(`${normalizedDomain}/`)) {
      const domainLeaf = normalizedDomain.split("/").at(-1) ?? normalizedDomain;
      if (domainLeaf.toLowerCase() === "adr") {
        return "Architecture Decisions";
      }
      return toLabel(domainLeaf);
    }
  }

  const parent = posix.dirname(normalizedPath);
  return parent && parent !== "." ? toLabel(parent.split("/").at(-1) ?? parent) : source.name;
}

function matchesConfiguredPath(source: ResolvedAdrRepository, filePath: string) {
  const normalizedPath = normalizePath(filePath);
  const domainMatches =
    source.domains.length === 0 ||
    source.domains.some((domain) => {
      const normalizedDomain = normalizePath(domain);
      return normalizedPath.startsWith(`${normalizedDomain}/`) || normalizedPath === normalizedDomain;
    });
  const includeMatches =
    source.include.length === 0 ||
    source.include.some((pattern) => wildcardToRegex(pattern).test(normalizedPath));
  const excludeMatches = source.exclude.some((pattern) => wildcardToRegex(pattern).test(normalizedPath));

  return domainMatches && includeMatches && !excludeMatches && normalizedPath.endsWith(".md");
}

async function getAdrSourceConfigs() {
  const rawFile = await readFile(adrSourcesYamlPath, "utf-8");
  const document = (parseYaml(rawFile) as AdrSourcesDocument | null) ?? {};
  const repositories = document.repositories ?? [];

  return repositories
    .map((repository) => ({
      slug: toScalar(repository.slug),
      name: toScalar(repository.name),
      account: toScalar(repository.account, toScalar(repository.owner_account)),
      repository: toScalar(repository.repository) || undefined,
      ref: toScalar(repository.ref) || undefined,
      product: toScalar(repository.product, toScalar(repository.name)),
      owner: toScalar(repository.owner, "Architecture"),
      domains: toStringArray(repository.domains).map(normalizePath),
      include: toStringArray(repository.include).map(normalizePath),
      exclude: toStringArray(repository.exclude).map(normalizePath),
    }))
    .filter((repository) => repository.slug && repository.account);
}

async function getRepositoryAdrPaths(source: ResolvedAdrRepository) {
  let tree: GitHubTreeEntry[] = [];

  try {
    tree = await getGitHubTree(source.repository, source.ref);
  } catch (error) {
    if (!source.localPath) {
      throw error;
    }
  }

  if (tree.length === 0 && source.localPath) {
    const localPaths = await listLocalRepositoryFiles(source.localPath);
    return localPaths.filter((path) => matchesConfiguredPath(source, path));
  }

  return tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((path) => matchesConfiguredPath(source, path));
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
        if (entry.name === ".git" || entry.name === "node_modules") {
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

function buildSlugSegments(sourceSlug: string, filePath: string) {
  const pathWithoutExtension = normalizePath(filePath).replace(/\.md$/i, "");
  return [sourceSlug, ...pathWithoutExtension.split("/").filter(Boolean)];
}

async function buildAdrPage(source: ResolvedAdrRepository, filePath: string): Promise<AdrPage | null> {
  const normalizedPath = normalizePath(filePath);
  const rawUrl = getGitHubRawUrl(source.repository, source.ref, normalizedPath);
  const sourceUrl = getGitHubBlobUrl(source.repository, source.ref, normalizedPath);
  let markdownSource = "";

  try {
    markdownSource = await fetchText(rawUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes(": 404") || message.includes(": 403")) {
      return null;
    }

    throw error;
  }

  const { data, body } = parseFrontmatter(markdownSource);
  const heading = toScalar(data.title, getHeadingTitle(body) || toLabel(posix.basename(normalizedPath, ".md")));
  const parsedHeading = parseAdrHeading(heading);
  const date = toScalar(data.date) || (await getGitHubCommitDate(source.repository, source.ref, normalizedPath));
  const area = toScalar(data.area, buildArea(source, normalizedPath));
  const slugSegments = buildSlugSegments(source.slug, normalizedPath);
  const { htmlUrl, markdownUrl } = getAdrUrls(slugSegments);

  return {
    adrNumber: toScalar(data.adr, parsedHeading.adrNumber),
    title: parsedHeading.title,
    summary: toScalar(data.summary, getBodySummary(body)),
    status: toScalar(data.status, getStatusFromBody(body) || "Draft"),
    product: toScalar(data.product, source.product),
    date,
    year: date.slice(0, 4),
    owner: toScalar(data.owner, source.owner),
    area,
    tags: toStringArray(data.tags),
    body,
    bodyHtml: renderMarkdownToHtml(body),
    relativePath: normalizedPath,
    slugSegments,
    htmlUrl,
    markdownUrl,
    repositorySlug: source.slug,
    repositoryName: source.name,
    repository: source.repository,
    repositoryRef: source.ref,
    repositoryUrl: getGitHubRepositoryUrl(source.repository),
    sourceUrl,
    rawUrl,
  };
}

async function loadAdrsData(): Promise<AdrsData> {
  const repositories = await getAdrSourceConfigs();
  const scannedRepositories = (
    await Promise.all(repositories.map((source) => getGitHubAccountRepositories(source)))
  ).flat();
  const pages = (
    await Promise.all(
      scannedRepositories.map(async (source) => {
        const paths = await getRepositoryAdrPaths(source);
        return Promise.all(paths.map((path) => buildAdrPage(source, path)));
      }),
    )
  )
    .flat()
    .filter((page): page is AdrPage => Boolean(page))
    .sort((left, right) => {
      if (left.date && right.date && left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }

      return (
        left.product.localeCompare(right.product) ||
        left.adrNumber.localeCompare(right.adrNumber, undefined, { numeric: true }) ||
        left.title.localeCompare(right.title)
      );
    });

  return {
    pages,
    products: [...new Set(pages.map((page) => page.product).filter(Boolean))].sort(),
    statuses: [...new Set(pages.map((page) => page.status).filter(Boolean))].sort(),
    years: [...new Set(pages.map((page) => page.year).filter(Boolean))].sort().reverse(),
    areas: [...new Set(pages.map((page) => page.area).filter(Boolean))].sort(),
    repositories,
    scannedRepositories,
  };
}

async function getAdrsData() {
  adrsDataPromise ??= loadAdrsData();
  return adrsDataPromise;
}

export async function getAdrIndexData() {
  return getAdrsData();
}

export async function getAdrPages() {
  const { pages } = await getAdrsData();
  return pages;
}

export async function getAdrPageBySlug(slugSegments: string[]) {
  const pages = await getAdrPages();
  const normalized = slugSegments.join("/");
  return pages.find((page) => page.slugSegments.join("/") === normalized);
}

export async function getAdrStaticPaths() {
  const pages = await getAdrPages();
  return pages.map((page) => ({
    params: {
      slug: page.slugSegments.join("/"),
    },
    props: {
      page,
    },
  }));
}

export function getAdrIndexMarkdown({
  pages,
  products,
  statuses,
  years,
  areas,
  repositories,
  scannedRepositories,
}: AdrsData) {
  const doc = createMarkdownDocument({
    title: "ADRs",
    description: "Markdown companion for the architecture decision records index.",
    canonicalHtml: withBasePath("/adrs/"),
  });

  doc.heading("ADRs");
  doc.paragraph("Architecture decision records fetched directly from GitHub repositories declared in `data/adr-repositories.yaml`.");
  doc.keyValueList([
    { label: "ADR count", value: String(pages.length) },
    { label: "Configuration entries", value: String(repositories.length) },
    { label: "Repositories scanned", value: String(scannedRepositories.length) },
    { label: "Products", value: products.join(", ") || "None" },
    { label: "Statuses", value: statuses.join(", ") || "None" },
    { label: "Years", value: years.join(", ") || "None" },
    { label: "Areas", value: areas.join(", ") || "None" },
  ]);
  doc.section("ADR index");

  for (const page of pages) {
    doc.subheading(`${page.adrNumber ? `ADR ${page.adrNumber}: ` : ""}${page.title}`, 3);
    doc.keyValueList([
      { label: "Product", value: page.product },
      { label: "Status", value: page.status },
      { label: "Date", value: page.date || "Not set" },
      { label: "Area", value: page.area },
      { label: "Repository", value: page.repository },
      { label: "Source file", value: page.relativePath },
      { label: "Open", value: markdownLink("View ADR", page.markdownUrl) },
    ]);
  }

  return doc.finish();
}

export function getAdrDetailMarkdown(page: AdrPage) {
  const bodyWithoutRepeatedHeading = page.body
    .replace(/^#\s+.+?\s*(?:\n+|$)/, "")
    .replace(/^\s+/, "")
    .trim();
  const doc = createMarkdownDocument({
    title: page.adrNumber ? `ADR ${page.adrNumber}: ${page.title}` : page.title,
    description: page.summary,
    canonicalHtml: page.htmlUrl,
  });

  doc.heading(page.adrNumber ? `ADR ${page.adrNumber}: ${page.title}` : page.title);
  doc.paragraph(page.summary);
  doc.section("Metadata", () => {
    doc.keyValueList([
      { label: "Product", value: page.product },
      { label: "Status", value: page.status },
      { label: "Date", value: page.date || "Not set" },
      { label: "Area", value: page.area },
      { label: "Owner", value: page.owner },
      { label: "Repository", value: page.repository },
      { label: "Source file", value: page.relativePath },
      { label: "Source URL", value: page.sourceUrl },
      { label: "Raw source", value: page.rawUrl },
    ]);
  });
  doc.section("Decision Record", () => doc.raw(bodyWithoutRepeatedHeading));

  return doc.finish();
}
