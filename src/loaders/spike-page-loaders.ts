import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}

async function readMarkdownFile(path: string) {
  return readFile(path, "utf-8");
}

function parseCsv(text: string) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");

  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function storePageEntry(context: any, rawEntry: any) {
  const body = await readMarkdownFile(rawEntry.bodyPath);
  const data = await context.parseData({
    id: rawEntry.id,
    data: {
      title: rawEntry.title,
      description: rawEntry.description,
      slug: rawEntry.slug,
      source: rawEntry.source,
    },
    filePath: normalizePath(rawEntry.bodyPath),
  });
  const rendered = await context.renderMarkdown(body, {
    fileURL: pathToFileURL(rawEntry.bodyPath),
  });

  context.store.set({
    id: rawEntry.id,
    data,
    body,
    filePath: normalizePath(rawEntry.bodyPath),
    rendered,
    digest: context.generateDigest(`${rawEntry.id}:${body}`),
  });
}

export function jsonPageLoader(filePath: string) {
  return {
    name: "json-page-loader",
    async load(context: any) {
      context.store.clear();
      const fileContents = await readFile(filePath, "utf-8");
      const entries = JSON.parse(fileContents).map((entry: any) => ({
        ...entry,
        source: "json",
      }));

      for (const entry of entries) {
        await storePageEntry(context, entry);
      }
    },
  };
}

export function csvPageLoader(filePath: string) {
  return {
    name: "csv-page-loader",
    async load(context: any) {
      context.store.clear();
      const fileContents = await readFile(filePath, "utf-8");
      const entries = parseCsv(fileContents).map((entry: any) => ({
        ...entry,
        source: "csv",
      }));

      for (const entry of entries) {
        await storePageEntry(context, entry);
      }
    },
  };
}

export function githubRemotePageLoader() {
  return {
    name: "github-remote-page-loader",
    async load(context: any) {
      context.store.clear();
      const entries = [
        {
          id: "github-overview",
          title: "GitHub Remote Loader Overview",
          description: "A dual-format page generated from remote Markdown fetched at build time.",
          slug: "overview",
          source: "github",
          bodyUrl:
            "https://raw.githubusercontent.com/github/gitignore/main/README.md",
        },
      ];

      for (const entry of entries) {
        const response = await fetch(entry.bodyUrl);
        const remoteBody = await response.text();
        const excerpt = remoteBody
          .split(/\r?\n/)
          .slice(0, 10)
          .join("\n");
        const body = [
          "# GitHub remote loader overview",
          "",
          "This spike fetches Markdown from GitHub at build time, normalizes it into the same page model, and exposes both output modes.",
          "",
          "- HTML route: `/spikes/github-format/overview/`",
          "- Markdown route: `/spikes/github-format/overview.md`",
          "",
          "Remote excerpt:",
          "",
          "```md",
          excerpt,
          "```",
          "",
          "- [Open JSON spike](/spikes/json-format/overview)",
          "- [Open CSV spike](/spikes/csv-format/overview)",
        ].join("\n");

        const data = await context.parseData({
          id: entry.id,
          data: {
            title: entry.title,
            description: entry.description,
            slug: entry.slug,
            source: entry.source,
          },
        });
        const rendered = await context.renderMarkdown(body);

        context.store.set({
          id: entry.id,
          data,
          body,
          rendered,
          digest: context.generateDigest(`${entry.id}:${body}`),
        });
      }
    },
  };
}
