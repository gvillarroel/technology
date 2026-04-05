import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export interface TechCommunity {
  slug: string;
  name: string;
  track: string;
  category: string;
  tags: string[];
  summary: string;
  audience: string[];
  cadence: string;
  link: string;
  linkLabel: string;
}

const techCommunitiesYamlPath = join(process.cwd(), "data", "tech-communities.yaml");

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

function toList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getTechCommunities(): Promise<TechCommunity[]> {
  const rawFile = await readFile(techCommunitiesYamlPath, "utf-8");
  const document = parse(rawFile) as { communities?: Array<Record<string, unknown>> };
  const communities = document.communities ?? [];

  return communities
    .map((community) => ({
      slug: toScalar(community.slug),
      name: toScalar(community.name),
      track: toScalar(community.track),
      category: toScalar(community.category),
      tags: toList(community.tags),
      summary: toScalar(community.summary),
      audience: toList(community.audience),
      cadence: toScalar(community.cadence),
      link: toScalar(community.link),
      linkLabel: toScalar(community.link_label) || "Visit community",
    }))
    .sort((left, right) => {
      const categoryOrder = left.category.localeCompare(right.category);

      if (categoryOrder !== 0) {
        return categoryOrder;
      }

      return left.name.localeCompare(right.name);
    });
}
