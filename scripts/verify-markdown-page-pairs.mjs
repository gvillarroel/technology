import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const pagesRoot = join(projectRoot, "src", "pages");

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
