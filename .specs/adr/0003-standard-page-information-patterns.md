# ADR 0003: Standard Page Information Patterns

## Status

Accepted

## Context

The current `Tech Radar` page already makes several strong decisions about how operational
content should be expressed:

- the page explains a structured dataset without becoming dense or document-like
- it uses a small number of blocks with clear responsibilities
- it keeps status, scope, and ownership visible while still allowing deeper drill-down
- it balances overview, selection, and index views without competing layouts

Those decisions are valuable beyond the radar itself. If they remain implicit in one page
implementation, the rest of the website will drift toward inconsistent content structure and tone.

## Decision

We adopt the current `Tech Radar` information model as the baseline for other operational pages.

That means standard pages should reuse these decisions where they fit the content:

- a concise intro that explains what the page is for and how to read it
- early exposure of the source of truth or governing artifact
- a small set of named information blocks, each with one clear job
- operational language centered on status, scope, ownership, and guidance
- a primary overview block before the full index or detailed catalog
- a focused detail or selection block near the overview when the page supports exploration
- list entries that keep summary, metadata, and next action in a predictable order

## Reusable block roles

When a page is data-backed or decision-heavy, prefer this block order:

1. orientation block
2. source-of-truth summary block
3. state model or explanatory model block
4. primary visual or structural overview block
5. active detail block
6. filterable or browsable index

Pages do not need every block, but they should avoid replacing these roles with unstructured prose.

## Language rules

- Use direct and compact wording.
- Prefer internal-reference language over marketing language.
- Name important dimensions explicitly instead of implying them through surrounding prose.
- Keep top-level summaries short enough to scan in place.
- Reserve extended rationale for detail pages, deeper sections, or linked documentation.

## Consequences

### Positive

- operational pages gain a shared voice and structure
- users learn one reading pattern and can reuse it across the site
- structured data remains visible as governed content rather than hidden implementation detail
- future pages can stay aligned with the radar without copying it literally

### Negative

- some pages will need deliberate editing to fit the shared model
- designers and implementers need to think in block roles instead of freeform sections
- exceptions must be justified when a page intentionally breaks the pattern

## Implementation Guidance

- use `.specs/designs.md` as the cross-site reference for these patterns
- treat `Tech Radar` as the canonical example of this standard-page model
- when building a new operational page, decide the block roles before writing detailed copy
- keep metadata labels and action placement consistent with the radar where the same concepts apply
