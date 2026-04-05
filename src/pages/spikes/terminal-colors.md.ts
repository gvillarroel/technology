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
  const lines = [
    "---",
    "title: Terminal Color Spike",
    "description: Markdown companion for the landing-page terminal color exploration.",
    `canonical_html: ${withBasePath("/spikes/terminal-colors/")}`,
    "---",
    "",
    "# Terminal Palette Variations",
    "",
    "Color exploration spike for the e*f(x) terminal landing page.",
    "",
    "## Related Navigation",
    "",
    `- [Tech Radar](${withBasePath("/tech-radar.md")})`,
    `- [Technology sections](${withBasePath("/index.md#technology-sections")})`,
    `- [Page system](${withBasePath("/index.md#page-system")})`,
    "",
    "## Variants",
    "",
  ];

  for (const variant of variants) {
    lines.push(`### ${variant.name}: ${variant.title}`);
    lines.push("");
    lines.push(variant.description);
    lines.push("");
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
