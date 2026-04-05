# Dual Format Markdown and HTML Spike

## Goal

Validate a simple authoring model where:

- each page is written once in Markdown,
- the HTML version lives at the canonical route,
- the Markdown version lives at the same route plus `.md`,
- internal links automatically stay in the matching mode.

## Alternatives Considered

### Alternative 1: Separate HTML and Markdown sources

- Works, but doubles authoring and review effort.
- High risk of link drift and content mismatch.

### Alternative 2: Markdown source plus `.md` endpoint with link rewriting

- Uses a single Markdown source of truth.
- HTML is rendered from the same content collection entry.
- Markdown output is served from a sibling endpoint and rewrites internal links to `.md`.
- This is the simplest workable model found in the spike.

## Result

The spike works with:

- HTML page at `/spikes/dual-format/overview/`
- Markdown page at `/spikes/dual-format/overview.md`
- HTML-to-HTML links in rendered pages
- Markdown-to-Markdown links in `.md` responses

## Recommendation

Use content collections as the source of truth for any page that needs both formats.

Authoring rule:

1. Write internal links once using the canonical HTML route.
2. Render HTML directly from the collection entry.
3. Serve Markdown from a sibling `.md` endpoint that rewrites internal links.

This keeps authoring simple and satisfies the requirement that the same logical link can
be used for both formats, with `.md` selecting the Markdown view.

## Related Files

- `src/content.config.ts`
- `src/content/dual-format-pages/overview.md`
- `src/content/dual-format-pages/standards.md`
- `src/lib/dual-format.ts`
- `src/pages/spikes/dual-format/[slug].astro`
- `src/pages/spikes/dual-format/[slug].md.ts`
