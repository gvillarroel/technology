import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import {
  csvPageLoader,
  githubRemotePageLoader,
  jsonPageLoader,
} from "./loaders/spike-page-loaders";

const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  source: z.string().optional(),
});

const dualFormatPages = defineCollection({
  loader: glob({
    base: "./src/content/dual-format-pages",
    pattern: "**/*.md",
  }),
  schema: pageSchema,
});

const jsonFormatPages = defineCollection({
  loader: jsonPageLoader("./data/spikes/spike-json-pages.json"),
  schema: pageSchema,
});

const csvFormatPages = defineCollection({
  loader: csvPageLoader("./data/spikes/spike-csv-pages.csv"),
  schema: pageSchema,
});

const githubFormatPages = defineCollection({
  loader: githubRemotePageLoader(),
  schema: pageSchema,
});

export const collections = {
  "dual-format-pages": dualFormatPages,
  "json-format-pages": jsonFormatPages,
  "csv-format-pages": csvFormatPages,
  "github-format-pages": githubFormatPages,
};
