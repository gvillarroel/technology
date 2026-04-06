import {
  getDocumentDetailMarkdown,
  getDocumentStaticPaths,
  getDocumentTree,
  type DocumentPage,
} from "../../lib/documents";

export async function getStaticPaths() {
  return getDocumentStaticPaths();
}

export async function GET({
  props,
}: {
  props: { page: DocumentPage };
}) {
  const tree = await getDocumentTree(props.page.repositorySlug, props.page.slugSegments);

  return new Response(getDocumentDetailMarkdown(props.page, tree), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
