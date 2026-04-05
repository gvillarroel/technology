# CSV Custom Loader Spike

## Goal

Validate that CSV-backed content can participate in the same HTML and Markdown dual-route
system.

## Result

Works.

## Pattern

- CSV provides structured metadata and a body file pointer per row.
- A custom loader parses CSV rows and normalizes them into the shared page model.
- HTML is served at `/spikes/csv-format/<slug>/`.
- Markdown is served at `/spikes/csv-format/<slug>.md`.

## Why It Matters

This is a good fit for spreadsheet-like sources and exports from governance tools.

## Related Files

- `data/spikes/spike-csv-pages.csv`
- `src/loaders/spike-page-loaders.ts`
- `src/pages/spikes/csv-format/[slug].astro`
- `src/pages/spikes/csv-format/[slug].md.ts`
