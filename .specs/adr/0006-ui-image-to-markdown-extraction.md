---
adr: 0006
title: "ADR 0006: UI Image To Markdown Extraction"
summary: "UI screenshots should be converted to Markdown with a multimodal model that preserves layout structure and approximate region placement, with classical OCR used only as a fallback."
status: "Accepted"
date: "2026-04-08"
product: "Technology Site"
owner: "Platform Architecture"
area: "Content Extraction"
tags:
  - ui
  - markdown
  - ocr
  - multimodal
  - openrouter
---

# ADR 0006: UI Image To Markdown Extraction

## Status

Accepted

## Context

This repository accumulates many screenshots of product pages, dashboards, terminal views, and
other UI states. Those images are useful for review and design history, but they are difficult to
reuse in text-first workflows unless their visible content is converted into Markdown.

Classical OCR was evaluated first. It produced noisy output, weak hierarchy, and poor recovery of
UI structure. That is a bad fit for screenshots because the requirement is not only text
recognition. We also need:

- region-level layout reconstruction
- approximate block positions
- readable Markdown instead of raw OCR fragments
- preservation of UI labels, navigation items, tables, code-like strings, and short descriptive
  text

The extraction pipeline must therefore optimize for structured understanding of screenshots, not
just character recognition.

## Decision

UI screenshot extraction in this repository will use a multimodal model as the primary path.

The default operational workflow is:

- process screenshots through OpenRouter with `google/gemini-3-flash-preview`
- generate Markdown only
- include a short screen summary
- include a layout map with approximate positions and bounds
- include a region-by-region breakdown of visible content
- store one Markdown file per image under `.tmp/img2md/`
- keep an `index.md` summary in `.tmp/img2md/`

The expected Markdown shape is:

- `# Screen Summary`
- `## Layout Map`
- `## Regions`

Each region should include:

- approximate position
- approximate percentage bounds
- UI role when inferable
- visible content in readable bullets

Classical OCR is not the default path for UI screenshots. It may still be used only as a fallback
or auxiliary signal when:

- a multimodal request fails repeatedly
- text is unusually dense or distorted
- a later refinement pipeline needs OCR text as supporting context

## Alternatives Considered

### Classical OCR Only

Rejected because:

- it loses too much layout information
- it returns fragmented text instead of useful document structure
- it performs poorly on complex dashboards, terminal screenshots, and dense navigation layouts

### Direct Provider Integration Only

Rejected as the default operational choice because:

- provider-specific keys and service enablement created avoidable execution friction
- the repository needed a path that could be swapped without rewriting the extraction shape

### Multimodal Model Without Layout Instructions

Rejected because:

- generic caption-style outputs are not precise enough for downstream reuse
- the repository needs location-aware Markdown, not vague descriptions

## Consequences

### Positive

- extracted Markdown is far more useful than raw OCR
- screenshots become easier to search, diff, summarize, and reuse
- region-level structure gives better fidelity for UI documentation
- the pipeline is flexible enough to swap providers while keeping the same output contract

### Negative

- extraction quality depends on model availability and API credentials
- output remains approximate, especially for fine-grained coordinates
- some screenshots may still require isolated retries or later cleanup

## Implementation Guidance

- prefer multimodal screenshot understanding over OCR-first pipelines
- keep the prompt strict: Markdown only, no process narration, no generic image description
- include concrete approximate bounds in percentages whenever layout blocks are visible
- preserve readable UI text, commands, tables, labels, and code-like strings
- write outputs to `.tmp/img2md/<image>.md`
- maintain `.tmp/img2md/index.md` as the batch summary
- use OCR only as fallback or as an auxiliary signal, not as the primary extraction strategy

## Validation

This decision was validated in this repository by:

- running an OCR-first batch and observing low-quality output for UI screenshots
- testing multimodal extraction on representative screenshots
- correcting the OpenRouter model identifier to `google/gemini-3-flash-preview`
- processing the full image batch successfully into `.tmp/img2md/`

## Decision Summary

For UI screenshots, use multimodal image understanding first and emit structured Markdown with
layout regions and approximate bounds. OCR remains a fallback, not the main path.
