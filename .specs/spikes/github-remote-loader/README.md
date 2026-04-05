# GitHub Remote Loader Spike

## Goal

Validate that remote Markdown fetched from GitHub at build time can be normalized into the
same dual-format system.

## Result

Works.

## Pattern

- A custom loader fetches remote Markdown from GitHub during the build.
- The loader normalizes metadata, stores the raw body, and stores rendered HTML.
- HTML is served at `/spikes/github-format/<slug>/`.
- Markdown is served at `/spikes/github-format/<slug>.md`.

## Why It Matters

This proves the pattern can support remote repositories or GitHub-based content pipelines.

## Related Files

- `src/loaders/spike-page-loaders.ts`
- `src/pages/spikes/github-format/[slug].astro`
- `src/pages/spikes/github-format/[slug].md.ts`
