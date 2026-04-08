# Code Assistant Examples

This folder contains assistant-specific examples for consuming the Technology site through its
Markdown surface.

The examples are not meant to describe product integrations. They describe prompt and workflow
patterns that rely on the repository guarantees documented in the Markdown-first navigation use
case.

## Shared Pattern

All assistants should follow the same high-level pattern:

1. start at `/index.md`
2. stay on `.md` routes when following internal links
3. use section indexes before jumping into detail pages
4. use backlinks to return to the nearest Markdown index instead of switching to HTML

## Pages

- [Codex Example](./codex.md)
- [Claude Code Example](./claude-code.md)
- [GitHub Copilot Chat Example](./github-copilot-chat.md)

## Adding New Assistant Examples

When adding a new assistant page:

- keep the example grounded in the Markdown route graph, not in vendor-specific UI details
- include one short prompt example and one short walkthrough
- mention any constraints the assistant has around browsing, file access, or link following
