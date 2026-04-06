import { createMarkdownDocument, markdownResponse } from "../lib/markdown";
import { withBasePath } from "../lib/site-url";

const landingCommands = [
  "/help",
  "/home",
  "/tech-radar",
  "/documents",
  "/ai-sdlc",
  "/adrs",
  "/communities",
];

const landingDomains = [
  "Core Platforms",
  "Delivery Systems",
  "Decision Intelligence",
  "Documentation",
  "AI SDLC",
  "ADRs",
];

const rights = [
  "Know which technologies are approved for enterprise use.",
  "Request review for a new tool or framework.",
  "Withdraw an unsupported stack before scale-up.",
  "Escalate architectural conflicts to the platform group.",
];

export function GET() {
  const doc = createMarkdownDocument({
    title: "e*f(x) Technology",
    description: "Markdown companion for the landing page terminal.",
    canonicalHtml: withBasePath("/"),
  });

  doc.heading("e*f(x) Technology");
  doc.paragraph("Landing page terminal for technology standards, decision support, and engineering direction.");
  doc.section("Available Commands", () => doc.bullets(landingCommands));
  doc.section("Primary Routes", () => doc.bullets(landingDomains));
  doc.section("Team Rights", () => doc.bullets(rights));
  doc.section("Usage", () => {
    doc.bullets([
      "Type a command in the terminal input.",
      "Use `/help` to list the configured commands.",
      "Use `/tech-radar`, `/documents`, `/ai-sdlc`, `/adrs`, or `/communities` to read the Markdown companion for those pages.",
    ]);
  });

  return markdownResponse(doc.finish());
}
