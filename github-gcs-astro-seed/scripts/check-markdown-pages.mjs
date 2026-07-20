import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const pagesRoot = join(root, "src", "pages");
const distRoot = join(root, "dist");
const verifyDist = process.argv.includes("--dist");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }))).flat();
}

const sourceFiles = (await filesUnder(pagesRoot)).map((path) => relative(root, path).replaceAll("\\", "/"));
const htmlPages = sourceFiles.filter((path) => path.endsWith(".astro"));
const markdownPages = new Set(sourceFiles.filter((path) => path.endsWith(".md.ts")));
const missing = htmlPages
  .map((path) => `${path.slice(0, -".astro".length)}.md.ts`)
  .filter((path) => !markdownPages.has(path));

if (missing.length) {
  console.error("Missing Markdown route counterparts:");
  missing.forEach((path) => console.error(`- ${path}`));
  process.exit(1);
}

console.log(`Markdown parity OK: ${htmlPages.length} Astro routes have Markdown counterparts.`);

if (!verifyDist) {
  process.exit(0);
}

const distFiles = await filesUnder(distRoot);
const markdownFiles = distFiles.filter((path) => path.endsWith(".md"));
const routeMap = new Map(markdownFiles.map((path) => [
  `/${relative(distRoot, path).replaceAll("\\", "/")}`,
  path,
]));

if (!routeMap.has("/index.md")) {
  console.error("Missing generated /index.md entrypoint.");
  process.exit(1);
}

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const base = repository && owner && repository !== `${owner}.github.io` ? `/${repository}` : "";
const visited = new Set();
const queue = ["/index.md"];
const broken = [];

while (queue.length) {
  const current = queue.shift();
  if (!current || visited.has(current)) continue;
  visited.add(current);
  const source = await readFile(routeMap.get(current), "utf8");
  const links = [...source.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((match) => match[1]);

  for (const link of links) {
    if (!link.endsWith(".md") || /^(?:[a-z]+:|#)/i.test(link)) continue;
    let target = new URL(link, `https://seed.local${current}`).pathname;
    if (base && target.startsWith(`${base}/`)) target = target.slice(base.length);
    if (!routeMap.has(target)) broken.push(`${current} -> ${target}`);
    else if (!visited.has(target)) queue.push(target);
  }
}

const unreachable = [...routeMap.keys()].filter((route) => !visited.has(route));

if (broken.length || unreachable.length) {
  broken.forEach((link) => console.error(`Broken Markdown link: ${link}`));
  unreachable.forEach((route) => console.error(`Unreachable Markdown route: ${route}`));
  process.exit(1);
}

console.log(`Markdown graph OK: ${visited.size} generated routes are reachable from /index.md.`);
