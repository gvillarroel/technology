---
title: Documentation Publishing Standard
summary: Internal standard for authoring, approving, versioning, and retiring company documents stored in Markdown.
status: Approved
owner: Knowledge Systems
updated: 2026-03-06
doc_type: Publishing Standard
---

# Documentation Publishing Standard

## Purpose

This standard explains how internal Markdown documents should be created and maintained so they remain discoverable, reviewable, and operationally trustworthy. The target state is a documentation system that behaves more like a maintained codebase than a static file dump.

## Authoring Rules

Documents should:

- use clear titles and short summaries
- declare ownership and status in frontmatter
- keep sections scannable and operational in tone
- link to subordinate documents when the topic is broad

## Versioning

Documentation changes should move through normal source control review. Material changes to policy, process, or security posture should not be merged silently. The commit history must make it possible to identify when the guidance changed and who approved the update.

## Retirement

If a document is replaced, the obsolete document should not simply disappear. It should either be removed through a tracked change with a clear replacement path or converted into a short stub that points readers to the new source of truth until downstream references are updated.

## Quality Standard

A maintained document should answer four questions quickly:

1. What is this document for?
2. Who owns it?
3. What is its current status?
4. Where should the reader go next if they need more detail?
