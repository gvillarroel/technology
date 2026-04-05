import { getCloudEnablementIndexMarkdown, getCloudEnablementProviders } from "../lib/cloud-enablement";

export async function GET() {
  const providers = await getCloudEnablementProviders();

  return new Response(getCloudEnablementIndexMarkdown(providers), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
