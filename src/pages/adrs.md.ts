import { getAdrIndexData, getAdrIndexMarkdown } from "../lib/adrs";

export async function GET() {
  const data = await getAdrIndexData();

  return new Response(getAdrIndexMarkdown(data), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
