import { getAdrDetailMarkdown, getAdrStaticPaths, type AdrPage } from "../../lib/adrs";

export async function getStaticPaths() {
  return getAdrStaticPaths();
}

export async function GET({
  props,
}: {
  props: { page: AdrPage };
}) {
  return new Response(getAdrDetailMarkdown(props.page), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
