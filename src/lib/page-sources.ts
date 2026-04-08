import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export type StandardSourcePageKey =
  | "adrs"
  | "ai-sdlc"
  | "cloud-enablement"
  | "communities"
  | "documents"
  | "models"
  | "tech-radar";

export interface StandardPageSourceContent {
  file: string;
  lang: string;
  title: string;
  summary: string;
}

const pageSourcesPath = join(process.cwd(), "data", "page-sources.yaml");

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

export async function getStandardPageSource(
  pageKey: StandardSourcePageKey,
): Promise<StandardPageSourceContent> {
  const rawFile = await readFile(pageSourcesPath, "utf-8");
  const document = parse(rawFile) as {
    pages?: Record<string, Record<string, unknown>>;
  };
  const entry = document.pages?.[pageKey];

  if (!entry) {
    throw new Error(`Missing standard page source for "${pageKey}".`);
  }

  return {
    file: toScalar(entry.file),
    lang: toScalar(entry.lang),
    title: toScalar(entry.title),
    summary: toScalar(entry.summary),
  };
}
