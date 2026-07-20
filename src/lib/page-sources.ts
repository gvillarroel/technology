import { getSiteRoute } from "./site-catalog";

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

export async function getStandardPageSource(
  pageKey: StandardSourcePageKey,
): Promise<StandardPageSourceContent> {
  const entry = (await getSiteRoute(pageKey)).source;

  if (!entry) {
    throw new Error(`Missing standard page source for "${pageKey}".`);
  }

  return {
    file: entry.file,
    lang: entry.lang,
    title: entry.title,
    summary: entry.summary,
  };
}
