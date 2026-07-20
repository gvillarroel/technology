import { readSourceText } from "../lib/connectors";
import { getDataset } from "../lib/site-catalog";

interface CatalogPageEntry {
  id: string;
  title: string;
  description?: string;
  slug: string;
  source?: string;
  body?: string;
  bodyUrl?: string;
}

export function catalogPageLoader(datasetId: string) {
  return {
    name: `catalog-page-loader:${datasetId}`,
    async load(context: any) {
      context.store.clear();
      const entries = await getDataset<CatalogPageEntry[]>(datasetId);

      for (const entry of entries) {
        const body = entry.body ?? (entry.bodyUrl ? await readSourceText(entry.bodyUrl) : "");
        const data = await context.parseData({
          id: entry.id,
          data: {
            title: entry.title,
            description: entry.description,
            slug: entry.slug,
            source: entry.source,
          },
        });
        const rendered = await context.renderMarkdown(body);

        context.store.set({
          id: entry.id,
          data,
          body,
          rendered,
          digest: context.generateDigest(`${entry.id}:${body}`),
        });
      }
    },
  };
}
