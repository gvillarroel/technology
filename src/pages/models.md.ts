import { markdownResponse } from "../lib/markdown";
import { getModelCatalogData, getModelsMarkdown } from "../lib/models";

export async function GET() {
  const catalog = await getModelCatalogData();
  return markdownResponse(getModelsMarkdown(catalog));
}
