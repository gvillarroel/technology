import { getSiteRoute } from "./site-catalog";

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

export async function getStandardPageIntro(
  pageKey: StandardIntroPageKey,
): Promise<StandardPageIntroContent> {
  const entry = (await getSiteRoute(pageKey)).intro;

  if (!entry) {
    throw new Error(`Missing standard page intro for "${pageKey}".`);
  }

  return {
    eyebrow: entry.eyebrow,
    title: entry.title,
    summary: entry.summary,
  };
}
