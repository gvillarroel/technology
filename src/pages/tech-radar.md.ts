import { getRadarEntries, getRadarIndexMarkdown } from "../lib/tech-radar";

export async function GET() {
  const entries = await getRadarEntries();

  return new Response(getRadarIndexMarkdown(entries), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
