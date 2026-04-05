import {
  getCloudEnablementEntries,
  getCloudEnablementProductMarkdown,
} from "../../../lib/cloud-enablement";

export async function getStaticPaths() {
  const entries = await getCloudEnablementEntries();

  return entries.map((entry) => ({
    params: {
      provider: entry.providerSlug,
      slug: entry.slug,
    },
    props: { entry },
  }));
}

export async function GET({
  props,
}: {
  props: { entry: Awaited<ReturnType<typeof getCloudEnablementEntries>>[number] };
}) {
  return new Response(
    getCloudEnablementProductMarkdown(
      {
        slug: props.entry.providerSlug,
        name: props.entry.providerName,
        shortName: props.entry.providerShortName,
      },
      props.entry,
    ),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    },
  );
}
