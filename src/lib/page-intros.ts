import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export type StandardIntroPageKey =
  | "adrs"
  | "cloud-enablement"
  | "communities"
  | "documents"
  | "models"
  | "tech-radar";

export interface StandardPageIntroContent {
  eyebrow: string;
  title: string;
  summary: string;
}

const pageIntrosPath = join(process.cwd(), "data", "page-intros.yaml");

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

export async function getStandardPageIntro(
  pageKey: StandardIntroPageKey,
): Promise<StandardPageIntroContent> {
  const rawFile = await readFile(pageIntrosPath, "utf-8");
  const document = parse(rawFile) as {
    pages?: Record<string, Record<string, unknown>>;
  };
  const entry = document.pages?.[pageKey];

  if (!entry) {
    throw new Error(`Missing standard page intro for "${pageKey}".`);
  }

  return {
    eyebrow: toScalar(entry.eyebrow),
    title: toScalar(entry.title),
    summary: toScalar(entry.summary),
  };
}
