import { getAiSdlcData, getAiSdlcIndexMarkdown } from "../lib/ai-sdlc";

export async function GET() {
  const { overview, topics } = await getAiSdlcData();

  return new Response(getAiSdlcIndexMarkdown(overview, topics), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
