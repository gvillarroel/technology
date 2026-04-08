# Markdown-First Navigation For Code Assistants

## Goal

Allow a code assistant to traverse the entire Technology site through Markdown routes only,
starting at `/index.md` and continuing through internal `.md` links without needing the HTML UI.

## Why Markdown

Markdown is the better machine-facing contract for this use case because:

- it is smaller and easier to parse than the rendered HTML
- link intent is explicit and stable
- text extraction does not depend on CSS, client-side rendering, or DOM heuristics
- the same route graph works for local tools, terminal agents, and remote assistants

## Entry Point

The canonical starting point for this workflow is:

- `/index.md`

That route must function as a real hub, not a passive export. It should expose links to the
major sections and enough supporting routes for an assistant to continue traversing the site.

## Navigation Contract

For this use case to remain valid, the site must guarantee:

1. every public HTML page has a Markdown sibling route
2. internal Markdown navigation prefers `.md` links over HTML links
3. `/index.md` links into the main section graph
4. generated detail pages include a Markdown return path to an index or parent route
5. the built Markdown graph is reachable from `/index.md`

## Example Workflow

An assistant can use the site like this:

1. open `/index.md`
2. choose a section such as `/documents.md` or `/tech-radar.md`
3. follow internal `.md` links to repository indexes, detail pages, or subtopics
4. use backlinks to move back to the relevant index
5. continue until the required information is gathered

## Failure Modes

This workflow breaks when:

- `index.md` lists sections as plain text instead of links
- a generated detail page has no Markdown backlink
- relative links are rewritten incorrectly and point to missing `.md` routes
- new sections are added in HTML but omitted from shared Markdown navigation sources

## Implementation Notes

The repository currently enforces this use case through:

- `src/pages/index.md.ts`, which renders the Markdown landing page
- `src/lib/home-markdown.ts`, which builds that landing page from shared sources
- `src/lib/dual-format.ts`, which rewrites HTML-style links to Markdown routes
- `scripts/verify-markdown-page-pairs.mjs`, which verifies both route parity and the generated
  Markdown graph after build

## Validation

The operational validation for this use case is:

- `npm run check:markdown-pages`
- `npm run check:markdown-pages:dist`

The second check is the stronger guarantee. It crawls generated `dist/**/*.md` from `/index.md`
and fails if any internal Markdown route is unreachable or any internal `.md` link is broken.
