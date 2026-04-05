const alternatives = [
  {
    name: "Query parameter mode",
    verdict: "Rejected",
    summary:
      "One route plus ?format=md is simple in theory, but it does not map cleanly to static hosting or file-like Markdown URLs.",
    markdownHref: null,
  },
  {
    name: "Prefix route tree",
    verdict: "Rejected",
    summary:
      "A separate /md/ tree works, but it creates two mental models and makes linking rules harder to scale.",
    markdownHref: null,
  },
  {
    name: "Twin routes from Markdown collection",
    verdict: "Works",
    summary:
      "The baseline approach. Markdown is the source of truth, HTML is canonical, and .md is emitted from the same entry.",
    markdownHref: "/spikes/dual-format/overview.md",
  },
  {
    name: "Twin routes from JSON loader",
    verdict: "Works",
    summary:
      "Useful when another pipeline preprocesses metadata into JSON and keeps Markdown bodies separate.",
    markdownHref: "/spikes/json-format/overview.md",
  },
  {
    name: "Twin routes from CSV loader",
    verdict: "Works",
    summary:
      "Validates that CSV-backed metadata can be normalized into the same page model with no route changes.",
    markdownHref: "/spikes/csv-format/overview.md",
  },
  {
    name: "Twin routes from GitHub remote loader",
    verdict: "Works",
    summary:
      "Fetches remote Markdown at build time and still produces matching HTML and .md outputs with the same linking rule.",
    markdownHref: "/spikes/github-format/overview.md",
  },
];

export function GET() {
  const lines = [
    "---",
    "title: Format Architecture Spike",
    "description: Markdown companion for the HTML and Markdown route architecture spike.",
    "canonical_html: /spikes/format-architecture/",
    "---",
    "",
    "# HTML + Markdown Page Strategy",
    "",
    "Goal: one repeatable pattern for all pages, regardless of whether the content starts in Markdown, JSON, CSV, or a remote collector.",
    "",
    "Recommendation: keep HTML as the canonical route, expose Markdown as the same route with a .md suffix, and normalize every source into a shared page model.",
    "",
    "## Alternatives",
    "",
  ];

  for (const alternative of alternatives) {
    lines.push(`### ${alternative.name}`);
    lines.push("");
    lines.push(`- Verdict: ${alternative.verdict}`);
    lines.push(`- Summary: ${alternative.summary}`);
    if (alternative.markdownHref) {
      lines.push(`- Example: [Open Markdown route](${alternative.markdownHref})`);
    } else {
      lines.push("- Example: Documented in `.specs/spikes/*/README.md`.");
    }
    lines.push("");
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
