import { getCollection } from "astro:content";
import { getHtmlPageUrl, rewriteMarkdownLinks } from "../../../lib/dual-format";

export async function getStaticPaths() {
  const pages = await getCollection("dual-format-pages");

  return pages.map((page) => ({
    params: { slug: page.data.slug },
    props: { page },
  }));
}

export async function GET({ props }: { props: { page: any } }) {
  const { page } = props;
  const markdown = rewriteMarkdownLinks(page.body ?? "");
  const frontmatter = [
    "---",
    `title: ${page.data.title}`,
    `description: ${page.data.description ?? ""}`,
    `canonical_html: ${getHtmlPageUrl(page.data.slug)}`,
    "---",
    "",
  ].join("\n");

  return new Response(`${frontmatter}${markdown}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
