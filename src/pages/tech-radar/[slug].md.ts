import { getRadarEntries, getRadarEntryMarkdown } from "../../lib/tech-radar";

export async function getStaticPaths() {
  const entries = await getRadarEntries();

  return entries.map((entry) => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

export async function GET({ props }: { props: { entry: Awaited<ReturnType<typeof getRadarEntries>>[number] } }) {
  return new Response(getRadarEntryMarkdown(props.entry), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
