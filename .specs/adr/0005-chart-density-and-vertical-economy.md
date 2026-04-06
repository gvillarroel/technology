---
adr: 0005
title: "ADR 0005: Chart Density And Vertical Economy"
summary: "Operational charts and diagrams should avoid excessive vertical whitespace and favor compact layouts that preserve readability."
status: "Accepted"
date: "2026-04-06"
product: "Technology Site"
owner: "Platform Architecture"
area: "Visualization"
tags:
  - visualization
  - charts
  - layout
  - design-system
---

# ADR 0005: Chart Density And Vertical Economy

## Status

Accepted

## Context

Operational pages in this repository are long by design. They combine filters, summaries, charts,
lists, and explanatory blocks in a single scrollable reference surface.

When charts or diagrams consume too much vertical space, two problems appear:

- the page loses scanning efficiency because too few insights fit in one viewport
- bar charts and similar categorical views create obvious empty gaps between rows

This is especially noticeable on metrics pages, where multiple visualizations are expected to
stack one after another under a persistent filter rail.

## Decision

Operational charts and diagrams should use compact vertical layouts by default.

This means:

- chart canvases should be only as tall as their labels and data density require
- categorical bar charts should minimize dead space between categories
- bar charts should default to descending order by magnitude
- visual frames and diagram surfaces should avoid generous vertical padding unless the content
  specifically needs it
- pie charts should be avoided on operational pages in favor of bar-based comparisons
- compactness must not come at the cost of label overlap or unreadable tooltips

## Consequences

### Positive

- more analytical content fits into a single viewport
- long operational pages remain easier to scan
- stacked charts feel like one cohesive dashboard instead of disconnected tall panels
- future pages can reuse a single visual density rule

### Negative

- some dense charts may need more careful label sizing and grid tuning
- very small datasets can feel visually tighter than conventional presentation slides
- chart-specific tuning may still be required when the number of categories changes significantly

## Implementation Guidance

- prefer explicit chart heights over large generic canvas heights
- tune categorical spacing with chart-library controls such as category gaps, grid padding, and
  bar width rather than adding extra outer whitespace
- sort bar-chart categories from highest to lowest unless there is a stronger semantic order that
  the page needs to preserve
- keep visual containers compact before reducing text size
- apply the same density rule to `ECharts`, Mermaid blocks, and radar-style diagram frames
- prefer horizontal or vertical bar charts over pie charts for filtered operational comparisons
