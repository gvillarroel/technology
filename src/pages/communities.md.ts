import { createMarkdownDocument, markdownLink, markdownResponse } from "../lib/markdown";
import { withBasePath } from "../lib/site-url";
import { getTechCommunities } from "../lib/tech-communities";

export async function GET() {
  const communities = await getTechCommunities();
  const doc = createMarkdownDocument({
    title: "Technology Communities",
    description: "Markdown companion for the technology communities directory.",
    canonicalHtml: withBasePath("/communities/"),
  });

  doc.heading("Technology Communities");
  doc.paragraph("Directory of Berkeley Facts communities across AI, InnerSource, product, data, and adjacent practices.");
  doc.section("Community Index");

  for (const community of communities) {
    doc.subheading(community.name, 3);
    doc.keyValueList([
      { label: "Track", value: community.track },
      { label: "Category", value: community.category },
      { label: "Cadence", value: community.cadence },
      { label: "Audience", value: community.audience.join(", ") },
      { label: "Tags", value: community.tags.join(", ") },
      { label: "Summary", value: community.summary },
      { label: "Link", value: markdownLink(community.linkLabel, community.link) },
    ]);
  }

  doc.paragraph(markdownLink("Back to home", withBasePath("/index.md")));

  return markdownResponse(doc.finish());
}
