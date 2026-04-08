import { createMarkdownDocument, markdownResponse } from "../lib/markdown";
import {
  getLandingMarkdownCommands,
  getLandingMarkdownPrimaryRoutes,
  getLandingMarkdownSupportingRoutes,
} from "../lib/home-markdown";
import { withBasePath } from "../lib/site-url";

const rights = [
  "Know which technologies are approved for enterprise use.",
  "Request review for a new tool or framework.",
  "Withdraw an unsupported stack before scale-up.",
  "Escalate architectural conflicts to the platform group.",
];

export async function GET() {
  const [landingCommands, primaryRoutes, supportingRoutes] = await Promise.all([
    getLandingMarkdownCommands(),
    Promise.resolve(getLandingMarkdownPrimaryRoutes()),
    getLandingMarkdownSupportingRoutes(),
  ]);
  const doc = createMarkdownDocument({
    title: "e*f(x) Technology",
    description: "Markdown companion for the landing page terminal.",
    canonicalHtml: withBasePath("/"),
  });

  doc.heading("e*f(x) Technology");
  doc.paragraph("Landing page terminal for technology standards, decision support, and engineering direction.");
  doc.section("Available Commands", () => doc.bullets(landingCommands));
  doc.section("Technology Sections", () =>
    doc.bullets(primaryRoutes));
  doc.section("Page System", () => {
    doc.paragraph("Each page has an HTML route and a sibling Markdown route with the same path plus a `.md` suffix.");
    doc.bullets(supportingRoutes);
  });
  doc.section("Team Rights", () => doc.bullets(rights));
  doc.section("Usage", () => {
    doc.bullets([
      "Type a command in the terminal input.",
      "Use `/help` to list the configured commands.",
      "Use `/tech-radar`, `/models`, `/documents`, `/ai-sdlc`, `/adrs`, or `/communities` to read the Markdown companion for those pages.",
    ]);
  });

  return markdownResponse(doc.finish());
}
