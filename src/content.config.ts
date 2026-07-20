import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { catalogPageLoader } from "./loaders/catalog-page-loader";

const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  source: z.string().optional(),
});

const dualFormatPages = defineCollection({
  loader: catalogPageLoader("dual-format-pages"),
  schema: pageSchema,
});

const jsonFormatPages = defineCollection({
  loader: catalogPageLoader("json-format-pages"),
  schema: pageSchema,
});

const csvFormatPages = defineCollection({
  loader: catalogPageLoader("csv-format-pages"),
  schema: pageSchema,
});

const githubFormatPages = defineCollection({
  loader: catalogPageLoader("github-format-pages"),
  schema: pageSchema,
});

export const collections = {
  "dual-format-pages": dualFormatPages,
  "json-format-pages": jsonFormatPages,
  "csv-format-pages": csvFormatPages,
  "github-format-pages": githubFormatPages,
};
