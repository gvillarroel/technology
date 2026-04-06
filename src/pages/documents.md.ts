import { getDocumentIndexData, getDocumentsIndexMarkdown } from "../lib/documents";

export async function GET() {
  const data = await getDocumentIndexData();

  return new Response(getDocumentsIndexMarkdown(data), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
