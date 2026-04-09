# Current Strategy

This document summarizes the repository strategy as it stands today, based on the accepted
ADRs, the current implementation, and the existing documentation set.

## Strategic Intent

The repository is building one static technology reference surface that works well for both
human browsing and agent-oriented, Markdown-first consumption.

The current strategy is to keep the system simple in its content model, explicit in its
governance, and reusable across multiple knowledge domains.

In practice, that means:

- one repository publishes multiple operational knowledge surfaces
- structured content stays under `data/` as the single local data root
- repository-scanned Markdown is normalized into the same publication model as local YAML-backed pages
- every important route is available in both HTML and Markdown
- page structure, copy, and metadata follow explicit operational rules instead of page-by-page improvisation

## What The Site Is Optimizing For

The project is not trying to become a generic CMS. It is optimizing for a narrower and more
intentional model:

- publish governed technology knowledge from Git-tracked sources
- keep source-of-truth files inspectable and easy to change
- support static hosting through Astro and GitHub Pages
- make the same information usable in browser-first and text-first workflows
- let new domains reuse the same route, loader, and page-composition patterns

## Core Strategic Decisions

### 1. One site, many knowledge surfaces

The repository hosts multiple operational surfaces such as `Tech Radar`, `ADRs`, `Documents`,
`AI SDLC`, `Cloud Enablement`, `Models`, and `Communities`.

The strategy is to treat these as separate domain views inside one coherent system rather than
independent microsites. Shared layout, navigation, and page conventions reduce drift while
allowing each domain to keep its own loader and data model.

### 2. Dual-format publishing is a platform rule

ADR 0001 established that each logical page should exist as:

- canonical HTML for normal navigation
- a sibling `.md` route for text-first access and downstream reuse

This is one of the strongest repository-level decisions so far. It shapes route design,
navigation behavior, Markdown link rewriting, and the loader contract used across domains.

### 3. Normalize different content sources into one page model

The site accepts multiple source types:

- local YAML
- local Markdown
- CSV-backed content
- JSON-backed content
- repository-scanned Markdown from GitHub

The strategy is not to give each source family its own publishing logic. Instead, loaders in
`src/lib/` normalize them into route-ready page models so Astro pages can render them through a
consistent pattern.

### 4. `data/` is the only structured local content root

The repository rules explicitly avoid duplicated structured content roots such as `src/data/`.
That keeps content governance clear:

- facts and inventories live in `data/`
- shaping logic lives in `src/lib/`
- route presentation lives in `src/pages/`

This separation is central to the repo strategy because it makes changes easier to reason about
and keeps content decisions visible in Git.

### 5. `Tech Radar` defines the operational page language

ADR 0002 and ADR 0003 together make `Tech Radar` more than one page. It is the reference pattern
for operational content across the site.

The strategy so far is to reuse its model:

- concise page orientation
- early source-of-truth disclosure
- named blocks with clear jobs
- visible metadata such as status, scope, and ownership
- overview before exhaustive index
- filter state synchronized across summaries, visuals, and lists

This creates a repeatable reading pattern for users instead of a different content philosophy on
every page.

### 6. Operational visuals must stay analytical, not decorative

ADR 0004 and ADR 0005 define the current visualization strategy:

- filtered pages should support both total and ratio views when comparisons require it
- charts should stay compact and vertically efficient
- comparisons should be easy to scan
- pie-chart-style presentation is avoided in favor of more operational bar-based views

The strategy is to treat charts as working analytical tools, not presentation artifacts.

### 7. Repository-driven documentation must preserve provenance

The `Documents` surface is repository-driven. ADR 0007 tightened the strategy here:

- YAML decides what to scan
- scanned files and repository signals decide what metadata may be shown
- manual display metadata should not masquerade as discovered fact

This keeps the documentation library trustworthy. The UI should claim only what the collection
pipeline can actually derive.

### 8. Screenshot knowledge should be converted into text-first artifacts

ADR 0006 captures another important direction: screenshots are not just review artifacts. They are
also content that should become reusable Markdown through multimodal extraction.

That extends the broader repository strategy: valuable knowledge should be representable in both
visual and text-oriented forms whenever practical.

## Operating Model

The current operating model is:

1. define or update governed content in `data/` or scanned Markdown sources
2. normalize that content in `src/lib/`
3. render it through Astro routes in `src/pages/`
4. expose both HTML and Markdown outputs
5. validate route parity and generated Markdown reachability in the build

This keeps the repository close to a publishing pipeline rather than a hand-authored page set.

## Quality And Governance Rules Already In Place

Several repo rules are already acting as strategy guardrails:

- every `.astro` route under `src/pages` needs a matching `.md.ts` companion
- build validation checks generated Markdown graph integrity
- durable technical decisions are recorded as ADRs under `.specs/adr/`
- operational pages should expose their source of truth early
- documentation metadata must be auto-derived when shown as fact

These rules reduce hidden conventions and make the strategy enforceable in code review and build
checks.

## What Has Been Proven So Far

The strategy is no longer hypothetical. It has already been exercised through:

- spikes validating dual-format routing across Markdown, JSON, CSV, and GitHub-loaded content
- implementation of multiple domain surfaces on the same site shell
- repository-backed ADR scanning and publication
- repository-backed documentation scanning and navigation
- shared page intros and page-source summaries driven from centralized YAML

At this point, the pattern is established enough that new page families should fit into the same
model unless there is a strong reason to introduce a new one.

## Current Strategic Boundary

The repository is currently opinionated in these ways:

- static-first rather than CMS-first
- governed data and repository content rather than freeform authoring
- HTML plus Markdown rather than HTML only
- operational reference pages rather than marketing-heavy pages
- reusable composition patterns rather than one-off page architectures

Any future change should be evaluated against those boundaries first.
