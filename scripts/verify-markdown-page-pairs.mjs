import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const pagesRoot = join(projectRoot, "src", "pages");
const distRoot = join(projectRoot, "dist");
const shouldVerifyDist = process.argv.includes("--dist");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      return [fullPath];
    })
  );

  return files.flat();
}

function toProjectPath(filePath) {
  return relative(projectRoot, filePath).replaceAll("\\", "/");
}

function replaceSuffix(filePath, currentSuffix, nextSuffix) {
  return `${filePath.slice(0, -currentSuffix.length)}${nextSuffix}`;
}

const files = (await collectFiles(pagesRoot)).map(toProjectPath);
const astroPages = files.filter((filePath) => filePath.endsWith(".astro"));
const markdownPages = files.filter((filePath) => filePath.endsWith(".md.ts"));
const markdownPageSet = new Set(markdownPages);
const astroPageSet = new Set(astroPages);

const missingMarkdownPages = astroPages
  .map((filePath) => replaceSuffix(filePath, ".astro", ".md.ts"))
  .filter((filePath) => !markdownPageSet.has(filePath));

const orphanMarkdownPages = markdownPages
  .map((filePath) => replaceSuffix(filePath, ".md.ts", ".astro"))
  .filter((filePath) => !astroPageSet.has(filePath));

if (missingMarkdownPages.length > 0 || orphanMarkdownPages.length > 0) {
  console.error("Markdown route parity check failed.");

  if (missingMarkdownPages.length > 0) {
    console.error("");
    console.error("Missing Markdown counterparts for these Astro pages:");
    for (const filePath of missingMarkdownPages) {
      console.error(`- ${replaceSuffix(filePath, ".md.ts", ".astro")} -> ${filePath}`);
    }
  }

  if (orphanMarkdownPages.length > 0) {
    console.error("");
    console.error("Markdown routes without an Astro counterpart:");
    for (const filePath of orphanMarkdownPages) {
      console.error(`- ${replaceSuffix(filePath, ".astro", ".md.ts")} -> ${filePath}`);
    }
  }

  process.exit(1);
}

console.log(`Markdown route parity OK: ${astroPages.length} Astro pages matched with Markdown endpoints.`);

if (!shouldVerifyDist) {
  process.exit(0);
}

function normalizeDistRoute(filePath) {
  return `/${relative(distRoot, filePath).replaceAll("\\", "/")}`;
}

function extractMarkdownLinks(markdownSource) {
  return [...markdownSource.matchAll(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[2]);
}

function isInternalMarkdownLink(href) {
  return !/^(?:[a-z]+:|#|mailto:|tel:|data:)/i.test(href) && href.endsWith(".md");
}

function toResolvedMarkdownRoute(currentRoute, href) {
  const url = new URL(href, `https://markdown.local${currentRoute}`);
  return url.pathname;
}

const distFiles = await collectFiles(distRoot);
const builtMarkdownFiles = distFiles.filter((filePath) => filePath.endsWith(".md"));
const routeToFile = new Map(builtMarkdownFiles.map((filePath) => [normalizeDistRoute(filePath), filePath]));
const brokenLinks = [];
const visitedRoutes = new Set();
const queue = ["/index.md"];

if (!routeToFile.has("/index.md")) {
  console.error("Markdown graph audit failed.");
  console.error("");
  console.error("Missing root Markdown entrypoint: /index.md");
  process.exit(1);
}

while (queue.length > 0) {
  const currentRoute = queue.shift();

  if (!currentRoute || visitedRoutes.has(currentRoute)) {
    continue;
  }

  visitedRoutes.add(currentRoute);

  const sourcePath = routeToFile.get(currentRoute);

  if (!sourcePath) {
    brokenLinks.push({ from: "(graph)", to: currentRoute });
    continue;
  }

  const markdownSource = await readFile(sourcePath, "utf-8");
  const links = extractMarkdownLinks(markdownSource)
    .filter(isInternalMarkdownLink)
    .map((href) => toResolvedMarkdownRoute(currentRoute, href));

  for (const nextRoute of links) {
    if (!routeToFile.has(nextRoute)) {
      brokenLinks.push({ from: currentRoute, to: nextRoute });
      continue;
    }

    if (!visitedRoutes.has(nextRoute)) {
      queue.push(nextRoute);
    }
  }
}

const unreachableRoutes = [...routeToFile.keys()].filter((route) => !visitedRoutes.has(route)).sort();

if (brokenLinks.length > 0 || unreachableRoutes.length > 0) {
  console.error("Markdown graph audit failed.");

  if (brokenLinks.length > 0) {
    console.error("");
    console.error("Broken internal Markdown links:");
    for (const link of brokenLinks) {
      console.error(`- ${link.from} -> ${link.to}`);
    }
  }

  if (unreachableRoutes.length > 0) {
    console.error("");
    console.error("Generated Markdown pages unreachable from /index.md:");
    for (const route of unreachableRoutes) {
      console.error(`- ${route}`);
    }
  }

  process.exit(1);
}

console.log(`Markdown graph OK: ${visitedRoutes.size} generated Markdown pages reachable from /index.md.`);
