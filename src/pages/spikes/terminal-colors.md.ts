import { createMarkdownDocument, markdownLink, markdownResponse } from "../../lib/markdown";
import { withBasePath } from "../../lib/site-url";

const variants = [
  {
    name: "Variant A",
    title: "Balanced Official",
    description: "Closest to the current version, but with official palette values mapped more directly.",
  },
  {
    name: "Variant B",
    title: "Brand Forward",
    description: "Leans harder into the official red and gray relationship for a more branded feel.",
  },
  {
    name: "Variant C",
    title: "Cool Enterprise",
    description: "Uses the official blue and gray system more aggressively for a quieter enterprise mood.",
  },
];

export function GET() {
  const doc = createMarkdownDocument({
    title: "Terminal Color Spike",
    description: "Markdown companion for the landing-page terminal color exploration.",
    canonicalHtml: withBasePath("/spikes/terminal-colors/"),
  });

  doc.heading("Terminal Palette Variations");
  doc.paragraph("Color exploration spike for the e*f(x) terminal landing page.");
  doc.section("Related Navigation", () => {
    doc.bullets([
      markdownLink("Tech Radar", withBasePath("/tech-radar.md")),
      markdownLink("Technology sections", withBasePath("/index.md#technology-sections")),
      markdownLink("Page system", withBasePath("/index.md#page-system")),
    ]);
  });
  doc.section("Variants");

  for (const variant of variants) {
    doc.subheading(`${variant.name}: ${variant.title}`, 3);
    doc.paragraph(variant.description);
  }

  doc.paragraph(markdownLink("Back to home", withBasePath("/index.md")));

  return markdownResponse(doc.finish());
}
