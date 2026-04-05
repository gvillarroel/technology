import { withBasePath } from "../lib/site-url";
import { getTechCommunities } from "../lib/tech-communities";

export async function GET() {
  const communities = await getTechCommunities();
  const lines = [
    "---",
    "title: Technology Communities",
    "description: Markdown companion for the technology communities directory.",
    `canonical_html: ${withBasePath("/communities/")}`,
    "---",
    "",
    "# Technology Communities",
    "",
    "Directory of Berkeley Facts communities across AI, InnerSource, product, data, and adjacent practices.",
    "",
    "## Community Index",
    "",
  ];

  for (const community of communities) {
    lines.push(`### ${community.name}`);
    lines.push("");
    lines.push(`- Track: ${community.track}`);
    lines.push(`- Category: ${community.category}`);
    lines.push(`- Cadence: ${community.cadence}`);
    lines.push(`- Audience: ${community.audience.join(", ")}`);
    lines.push(`- Tags: ${community.tags.join(", ")}`);
    lines.push(`- Summary: ${community.summary}`);
    lines.push(`- Link: [${community.linkLabel}](${community.link})`);
    lines.push("");
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
