import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { markdownLink } from "./markdown";
import { getStandardPageNavGroups, type StandardNavGroup } from "./standard-page-nav";
import { getTerminalCommandConfigs } from "./terminal-commands";
import { withBasePath } from "./site-url";
import { toMarkdownHref } from "./dual-format";

interface MarkdownCommandLink {
  label: string;
  href: string | null;
}

interface MarkdownSectionLink {
  label: string;
  href: string;
}

function toTitleCaseLabel(value: string) {
  return value
    .replace(/\.md\.ts$/i, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toMarkdownLink(label: string, href: string) {
  return markdownLink(label, toMarkdownHref(href));
}

function flattenStandardNavGroups(groups: StandardNavGroup[]) {
  return groups.flatMap((group) => group.items.map((item) => ({
    label: item.label,
    href: toMarkdownHref(item.href),
  })));
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      return [fullPath];
    }),
  );

  return files.flat();
}

export async function getLandingMarkdownCommands(): Promise<string[]> {
  const commands = await getTerminalCommandConfigs();

  return commands.map((command) => {
    const link: MarkdownCommandLink = {
      label: command.command,
      href: command.markdownUrl,
    };

    return link.href ? toMarkdownLink(link.label, link.href) : `\`${link.label}\``;
  });
}

export function getLandingMarkdownPrimaryRoutes() {
  return flattenStandardNavGroups(getStandardPageNavGroups("home")).map((item) =>
    toMarkdownLink(item.label, item.href),
  );
}

export async function getLandingMarkdownSupportingRoutes() {
  const pagesRoot = join(process.cwd(), "src", "pages");
  const files = await collectFiles(join(pagesRoot, "spikes"));
  const ignoredRoutes = new Set<string>();
  const supportingLinks: MarkdownSectionLink[] = [];

  for (const filePath of files) {
    const normalizedPath = relative(pagesRoot, filePath).replaceAll("\\", "/");

    if (!normalizedPath.endsWith(".md.ts") || normalizedPath.includes("[")) {
      continue;
    }

    const routePath = normalizedPath.replace(/\.md\.ts$/i, ".md");
    const href = withBasePath(`/${routePath}`);

    if (ignoredRoutes.has(href)) {
      continue;
    }

    ignoredRoutes.add(href);
    supportingLinks.push({
      label: toTitleCaseLabel(routePath.split("/").at(-1) ?? routePath),
      href,
    });
  }

  return supportingLinks
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((link) => toMarkdownLink(link.label, link.href));
}
