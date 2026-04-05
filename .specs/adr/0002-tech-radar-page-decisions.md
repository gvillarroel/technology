# ADR 0002: Tech Radar Page Decisions

## Status

Accepted

## Context

`Tech Radar` is the main operational reference page for technology decisions in the site.
The landing page already carries the high-intensity terminal treatment, so the radar page
must optimize for scanning, filtering, and repeat consultation instead of visual novelty.

The page also has several constraints:

- lifecycle state must be visible at a glance
- scope must be represented visually, not only as metadata
- source ownership must be easy to filter quickly
- the page should remain usable when lateral space is limited
- the content model must remain data-driven from `data/tech-radar.yaml`

## Decision

We use the following page model for `Tech Radar`:

- a calm standard-page shell with header, navigation, and search
- a bat-inspired card language for content blocks and details
- a full-width radial chart as the main visual overview
- a Mermaid `states.mmd` block for the lifecycle flow, using the same color system as the ring states
- lifecycle and scope encoded from YAML data
- a source filter that adapts to available space

The source filter behavior is:

- when there is enough space to the left of the page content, it floats outside the main columns
- the floating rail aligns with the start of the `Tech Radar` top section
- while the user scrolls down, the rail remains visible in the viewport
- when there is not enough lateral space, the filter becomes a horizontal control above the content blocks
- the same filter state must drive every page summary that is derived from the radar dataset, including ring counts, lifecycle diagrams, radial visibility, and list totals

## Data Model

The radar is driven by `data/tech-radar.yaml`.
Each entry is expected to include:

- `ring` for lifecycle state
- `primary_scope` for quadrant placement
- `source_type` for source filtering

This keeps the visual model and the filter model aligned with the same source of truth.

## Lifecycle Model

The lifecycle rings are ordered from the center outward as:

- `Adopt`
- `Explore`
- `To evaluate`
- `Endure`
- `Retired`

The default page view emphasizes:

- `Adopt`
- `Explore`
- `Endure`

An explicit user action reveals the extended lifecycle states.

## Consequences

### Positive

- the page stays visually distinct from the landing page without inheriting the terminal shell
- lifecycle and scope can be understood from the diagram before reading the index
- source ownership remains accessible even during long-page scrolling
- the filter does not reduce content width when there is enough horizontal room
- the page degrades cleanly into a top control when lateral space is constrained

### Negative

- the floating filter requires viewport-aware positioning logic
- the page has more presentation rules than a purely static document layout
- chart, filter, and list need to stay synchronized through shared client-side state

## Implementation Guidance

- keep the radial chart and the entry list driven by the same normalized entry model
- treat the source filter as adaptive UI, not as a permanently fixed layout slot
- prefer explicit lifecycle tokens and source tokens over inferred presentation state
- document future changes to lifecycle semantics in YAML and in the radar utility layer together
