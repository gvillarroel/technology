import { getRoutes, resolveRoute, routeParameter, type ResolvedRoute } from "../lib/catalog";
import { markdownResponse, renderMarkdown } from "../lib/markdown";

export async function getStaticPaths() {
  const routes = (await getRoutes()).filter((route) => route.path !== "/");
  return Promise.all(routes.map(async (route) => ({
    params: { route: routeParameter(route.path) },
    props: await resolveRoute(route),
  })));
}

export async function GET({ props }: { props: ResolvedRoute }) {
  return markdownResponse(renderMarkdown(props, await getRoutes()));
}
