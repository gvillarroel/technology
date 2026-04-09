import {
  getDocumentDetailMarkdown,
  getDocumentPages,
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
  const repositoryPages = (await getDocumentPages())
    .filter((entry) => entry.repositorySlug === props.page.repositorySlug);

  return new Response(getDocumentDetailMarkdown(props.page, tree, { repositoryPages }), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
