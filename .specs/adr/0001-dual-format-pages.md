# ADR 0001: Dual-Format Pages for the Technology Site

## Status

Accepted

## Context

The technology site needs every page to exist in two formats:

- HTML for the normal browsing experience
- Markdown for text-first access, sharing, and downstream reuse

This behavior must work across the whole system, not only for hand-authored Markdown pages.
The same rule should also support content coming from different sources, including:

- Markdown collections
- JSON manifests
- CSV-backed data
- Remote content fetched from GitHub
- Future Astro collectors or custom preprocessing pipelines

The main constraint is operational simplicity. The chosen approach must be easy to replicate,
easy to reason about, and easy to apply in different contexts without inventing a new routing
model for each source.

## Decision

We will use the following pattern across the system:

- HTML remains the canonical route for every page, for example `/tech-radar/`
- Markdown is exposed as the same route plus a `.md` suffix, for example `/tech-radar.md`
- Internal links rendered in HTML point to HTML routes
- Internal links rendered in Markdown are rewritten to their `.md` equivalents
- All content sources are normalized into a shared page model before routing

The shared page model is conceptually:

- `slug`
- `title`
- `description`
- `body`
- optional source metadata

Route behavior is therefore independent from content origin. A page produced from Markdown,
JSON, CSV, GitHub, or another collector follows the same output contract.

## Alternatives Considered

### Query Parameter Mode

Example: `/tech-radar/?format=md`

Rejected because:

- query-string variants are a poor fit for static hosting
- they do not satisfy the desired file-like `.md` URL behavior
- they require format state to be preserved across links

### Prefix Route Tree

Example: `/md/tech-radar/`

Rejected because:

- it creates a second route tree
- it is less intuitive than a simple suffix rule
- link generation becomes more complex than necessary

### Twin Routes with `.md` Suffix

Example: `/tech-radar/` and `/tech-radar.md`

Accepted because:

- the rule is simple and memorable
- it works naturally with static output
- it scales across multiple content sources
- it keeps HTML canonical while preserving Markdown as a first-class output

## Consequences

### Positive

- One routing rule for the entire system
- Clear mental model for authors and developers
- Easy to implement in Astro with static routes and endpoint outputs
- Compatible with custom loaders and preprocessed content
- Low cognitive cost when adding new sections or sources

### Negative

- Markdown output needs explicit link rewriting
- Content pipelines must normalize entries into a shared page shape
- Some sources, such as remote GitHub content, still require build-time loading logic

## Implementation Guidance

- Prefer a shared utility layer for:
  - canonical HTML route generation
  - Markdown route generation
  - Markdown link rewriting
- Prefer loaders or preprocessing steps that normalize source data into a common page shape
- Keep HTML as the default route everywhere in navigation and UX
- Use Markdown endpoints only as alternate representations of the same logical page

## Validation

This decision was validated through working spikes for:

- Markdown collection source
- JSON-backed source
- CSV-backed source
- GitHub remote source

Rejected alternatives were also documented:

- query-parameter mode
- prefix route tree mode

See:

- `.specs/spikes/dual-format-markdown-html/README.md`
- `.specs/spikes/json-file-loader/README.md`
- `.specs/spikes/csv-custom-loader/README.md`
- `.specs/spikes/github-remote-loader/README.md`
- `.specs/spikes/query-param-mode/README.md`
- `.specs/spikes/md-prefix-route-tree/README.md`

## Decision Summary

The simplest option is:

`HTML canonical route + sibling .md route + source normalization into one page model`
