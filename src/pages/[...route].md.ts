import { getCatalogRouteDefinitions, getRouteParameter, resolveCatalogRoute } from "../lib/catalog-routes";
import { createMarkdownDocument, markdownLink, markdownResponse } from "../lib/markdown";
import { toMarkdownHref } from "../lib/dual-format";
import { withBasePath } from "../lib/site-url";

export async function getStaticPaths() {
  return Promise.all((await getCatalogRouteDefinitions()).map(async (route) => ({
    params: { route: getRouteParameter(route) },
    props: await resolveCatalogRoute(route),
  })));
}

export async function GET({ props }: { props: Awaited<ReturnType<typeof resolveCatalogRoute>> }) {
  const { route, items } = props;
  const doc = createMarkdownDocument({
    title: route.label,
    description: route.intro?.summary ?? "",
    canonicalHtml: withBasePath(route.path),
  });

  doc.heading(route.intro?.title ?? route.label);
  doc.paragraph(route.intro?.summary ?? "");
  doc.section(`${route.label} index`);

  for (const item of items) {
    doc.subheading(item.title, 3);
    doc.keyValueList([
      ...item.metadata,
      { label: "Tags", value: item.tags.join(", ") },
      { label: "Summary", value: item.summary },
      ...(item.link ? [{ label: "Link", value: markdownLink(item.linkLabel, item.link) }] : []),
    ].filter((field) => field.value));
  }

  doc.paragraph(markdownLink("Back to home", toMarkdownHref(withBasePath("/"))));
  return markdownResponse(doc.finish());
}
