import { getRoutes, resolveRoute } from "../lib/catalog";
import { markdownResponse, renderMarkdown } from "../lib/markdown";

export async function GET() {
  const routes = await getRoutes();
  const root = routes.find((route) => route.path === "/")!;
  return markdownResponse(renderMarkdown(await resolveRoute(root), routes));
}
