import { createMarkdownDocument, markdownLink, markdownResponse } from "../../lib/markdown";
import { withBasePath } from "../../lib/site-url";

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
    markdownHref: withBasePath("/spikes/dual-format/overview.md"),
  },
  {
    name: "Twin routes from JSON loader",
    verdict: "Works",
    summary:
      "Useful when another pipeline preprocesses metadata into JSON and keeps Markdown bodies separate.",
    markdownHref: withBasePath("/spikes/json-format/overview.md"),
  },
  {
    name: "Twin routes from CSV loader",
    verdict: "Works",
    summary:
      "Validates that CSV-backed metadata can be normalized into the same page model with no route changes.",
    markdownHref: withBasePath("/spikes/csv-format/overview.md"),
  },
  {
    name: "Twin routes from GitHub remote loader",
    verdict: "Works",
    summary:
      "Fetches remote Markdown at build time and still produces matching HTML and .md outputs with the same linking rule.",
    markdownHref: withBasePath("/spikes/github-format/overview.md"),
  },
];

export function GET() {
  const doc = createMarkdownDocument({
    title: "Format Architecture Spike",
    description: "Markdown companion for the HTML and Markdown route architecture spike.",
    canonicalHtml: withBasePath("/spikes/format-architecture/"),
  });

  doc.heading("HTML + Markdown Page Strategy");
  doc.paragraph("Goal: one repeatable pattern for all pages, regardless of whether the content starts in Markdown, JSON, CSV, or a remote collector.");
  doc.paragraph("Recommendation: keep HTML as the canonical route, expose Markdown as the same route with a .md suffix, and normalize every source into a shared page model.");
  doc.section("Alternatives");

  for (const alternative of alternatives) {
    doc.subheading(alternative.name, 3);
    doc.keyValueList([
      { label: "Verdict", value: alternative.verdict },
      { label: "Summary", value: alternative.summary },
      {
        label: "Example",
        value: alternative.markdownHref
          ? markdownLink("Open Markdown route", alternative.markdownHref)
          : "Documented in `.specs/spikes/*/README.md`.",
      },
    ]);
  }

  return markdownResponse(doc.finish());
}
