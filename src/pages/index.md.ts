const landingCommands = [
  "/help",
  "/home",
  "/tech-radar",
  "/ai-sdlc",
  "/communities",
];

const landingDomains = [
  "Core Platforms",
  "Delivery Systems",
  "Decision Intelligence",
  "AI SDLC",
];

const rights = [
  "Know which technologies are approved for enterprise use.",
  "Request review for a new tool or framework.",
  "Withdraw an unsupported stack before scale-up.",
  "Escalate architectural conflicts to the platform group.",
];

export function GET() {
  const lines = [
    "---",
    "title: e*f(x) Technology",
    "description: Markdown companion for the landing page terminal.",
    "canonical_html: /",
    "---",
    "",
    "# e*f(x) Technology",
    "",
    "Landing page terminal for technology standards, decision support, and engineering direction.",
    "",
    "## Available Commands",
    "",
    ...landingCommands.map((command) => `- ${command}`),
    "",
    "## Primary Routes",
    "",
    ...landingDomains.map((domain) => `- ${domain}`),
    "",
    "## Team Rights",
    "",
    ...rights.map((item) => `- ${item}`),
    "",
    "## Usage",
    "",
    "- Type a command in the terminal input.",
    "- Use `/help` to list the configured commands.",
    "- Use `/tech-radar`, `/ai-sdlc`, or `/communities` to read the Markdown companion for those pages.",
    "",
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
