# Claude Code Example

## Goal

Use Claude Code as a terminal-first assistant that reads the Technology site as a Markdown graph
instead of relying on browser rendering.

## Prompt Pattern

Example:

> Navigate the site from `/index.md` using only Markdown links. Build a map of the AI SDLC and
> Skills sections, then identify which pages a new skill repository maintainer should read first.

## Recommended Workflow

1. load `/index.md`
2. follow `.md` links into `/ai-sdlc.md` and `/ai-sdlc/skills.md`
3. collect the relevant detail pages
4. produce the requested summary or implementation plan

## Why This Fits Claude Code

This pattern is useful when the assistant is strongest in terminal or text-heavy workflows and
should avoid HTML parsing overhead.

## Important Constraint

The workflow depends on internal Markdown links being complete. If new sections are added without
updating shared navigation sources, the assistant may miss valid content even when the HTML page
exists.
