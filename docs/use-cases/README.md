# Use Cases

This section documents example ways to use the Technology site as an operational surface,
especially when the consumer is another code assistant or agent rather than a human browsing
the HTML UI.

## What This Covers

- example workflows that rely on the Markdown route graph
- how to prompt different code assistants to consume the site reliably
- what guarantees the site must provide for those workflows to keep working
- a repeatable structure for adding new use cases without rewriting the section

## Recommended Structure For New Use Cases

Add each new example as one Markdown file under `docs/use-cases/` or a focused subfolder when
the example needs multiple assistant-specific pages.

Use this outline:

1. `Goal`: what the assistant or user is trying to accomplish
2. `Why Markdown`: why the `.md` surface is a better fit than the HTML route
3. `Entry Point`: which Markdown route the workflow should start from
4. `Navigation Contract`: which links or sections the assistant is expected to follow
5. `Examples`: one or more prompts or walkthroughs
6. `Failure Modes`: what breaks the workflow
7. `Implementation Notes`: which repository files enforce the behavior

## Pages

- [Markdown-First Navigation For Code Assistants](./markdown-first-navigation.md)
- [Code Assistant Examples](./code-assistants/README.md)

## Reading Order

Start with the Markdown-first navigation page to understand the core use case. Then read the
assistant-specific examples if you need prompt patterns for a particular coding assistant.
