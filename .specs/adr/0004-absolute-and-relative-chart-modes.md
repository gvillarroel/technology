---
adr: 0004
title: "ADR 0004: Absolute And Relative Chart Modes"
summary: "Operational charts should support both absolute values and normalized ratios when users compare filtered subsets."
status: "Accepted"
date: "2026-04-05"
product: "Technology Site"
owner: "Platform Architecture"
area: "Visualization"
tags:
  - visualization
  - metrics
  - filters
---

# ADR 0004: Absolute And Relative Chart Modes

## Status

Accepted

## Context

Operational pages increasingly support filtered views over teams, owners, repositories, or other
subsets. Absolute values are necessary because they show scale, but they are often insufficient
when the selected subset changes.

For example, when a metrics page is filtered down to two teams, a chart value such as `46 users`
or `27 users` does not by itself explain whether that value is dominant or marginal inside the
current selection. Users need both:

- the real total
- the normalized share inside an explicit denominator

Without this, filtered charts are easy to misread and cross-team comparisons become weaker.

## Decision

Operational charts that compare filtered subsets should support two display modes:

- `Total`: absolute values from the selected dataset
- `Ratio`: normalized values derived from an explicit denominator

The UI should expose this as a direct toggle near the relevant filters or chart controls.

## Normalization rules

- Ratio mode must state or imply its denominator clearly.
- By default, ratio mode should normalize against the currently visible filtered set, not the full
  site dataset, unless the chart is explicitly about portfolio share.
- Summary cards may normalize against the full portfolio when that is the more useful comparison,
  but that choice should stay explicit in implementation and labeling.
- Absolute and relative views must be driven by the same underlying dataset and filter state.

## Consequences

### Positive

- filtered comparisons become easier to interpret
- users can move between scale and share without leaving the page
- chart decisions stay consistent across operational pages
- future pages can reuse one visualization rule instead of inventing local behavior

### Negative

- client-side chart logic becomes slightly more complex
- labels and summaries must be clearer about denominators
- some charts will need careful design to avoid mixing incompatible ratio definitions

## Implementation Guidance

- place the value-mode toggle near the main filter rail when practical
- default to `Total` unless the page has a strong reason to do otherwise
- keep query-string state stable so filtered and normalized views can be shared
- document special denominators in the page copy when they differ from the visible subset
