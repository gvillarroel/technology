# JSON File Loader Spike

## Goal

Validate that dual-format pages can come from structured JSON rather than Markdown files.

## Result

Works.

## Pattern

- JSON manifest provides page metadata and a pointer to a Markdown body file.
- A custom loader normalizes the entry, renders Markdown to HTML, and stores the raw body.
- HTML is served at `/spikes/json-format/<slug>/`.
- Markdown is served at `/spikes/json-format/<slug>.md`.

## Why It Matters

This is a simple fit for preprocessed data pipelines that already emit JSON.

## Related Files

- `data/spikes/spike-json-pages.json`
- `src/loaders/spike-page-loaders.ts`
- `src/pages/spikes/json-format/[slug].astro`
- `src/pages/spikes/json-format/[slug].md.ts`
