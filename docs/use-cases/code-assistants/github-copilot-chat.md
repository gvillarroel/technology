# GitHub Copilot Chat Example

## Goal

Use GitHub Copilot Chat as a code-adjacent assistant that can reason over the site structure from
Markdown pages and then help with edits in the repository.

## Prompt Pattern

Example:

> Read the Technology site through Markdown routes only, starting at `/index.md`. Find the pages
> that define documentation scanning and Markdown navigation, then explain which files I need to
> update to add a new section safely.

## Recommended Workflow

1. start at `/index.md`
2. follow links into `/documents.md` and the docs pages under `/docs/...` that explain the system
3. extract the relevant implementation files from the published content
4. switch to code editing only after the Markdown reading pass is complete

## Why This Fits Copilot Chat

This is useful when the assistant is embedded near the codebase and should first derive context
from the same Markdown outputs the site publishes.

## What To Verify

If the assistant changes route generation or Markdown link logic, it should validate:

- route parity
- built Markdown reachability
- backlinks from new detail pages to their Markdown index
