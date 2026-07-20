import type { ResolvedRoute } from "./catalog";
import { markdownPath, withBasePath } from "./paths";

function frontmatter(value: string) {
  return JSON.stringify(value.replace(/\r?\n/g, " ").trim());
}

export function renderMarkdown(page: ResolvedRoute, routes: ResolvedRoute["route"][]) {
  const { route, items } = page;
  const lines = [
    "---",
    `title: ${frontmatter(route.intro.title)}`,
    `description: ${frontmatter(route.intro.summary)}`,
    `canonical_html: ${withBasePath(route.path)}`,
    "---",
    "",
    `# ${route.intro.title}`,
    "",
    route.intro.summary,
    "",
    "## Entries",
    "",
  ];

  for (const item of items) {
    lines.push(`### ${item.title}`, "", item.summary, "");

    if (item.tags.length) {
      lines.push(`- Tags: ${item.tags.join(", ")}`);
    }

    if (item.url) {
      lines.push(`- Link: [Open source](${item.url})`);
    }

    lines.push("");
  }

  lines.push("## Routes", "");

  for (const candidate of routes) {
    lines.push(`- [${candidate.label}](${withBasePath(markdownPath(candidate.path))})`);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function markdownResponse(content: string) {
  return new Response(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
