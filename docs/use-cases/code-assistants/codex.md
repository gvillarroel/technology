# Codex Example

## Goal

Use Codex as a repository-aware assistant that can inspect the Technology site through Markdown
routes before making implementation or documentation changes.

## Prompt Pattern

Use prompts that explicitly constrain the assistant to the Markdown surface. Example:

> Start at `/index.md` and navigate the site using only Markdown routes. Summarize the relevant
> pages for the Documentation section and tell me if any route is unreachable from the Markdown
> graph.

## Recommended Workflow

1. open `/index.md`
2. follow a section route such as `/documents.md`
3. continue into detail pages using only `.md` links
4. return through backlinks instead of switching to HTML
5. only after understanding the content, modify repository files

## Why This Fits Codex

This works well when the assistant has repository access and can:

- read generated or source Markdown directly
- compare implementation files with published site behavior
- run the Markdown graph audit after making changes

## Validation After Changes

After modifying generation logic, run:

- `npm run check`
- `npm run build`

That sequence verifies both source-level parity and built Markdown traversability.
