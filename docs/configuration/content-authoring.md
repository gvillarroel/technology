# Content Authoring Guide

This repository is designed so that most day-to-day content changes happen in `data/`
without editing Astro pages or loaders.

## Default Rule

When you are adding inventory content, update the matching YAML file first:

- `data/models.yaml` for AI model families and sources
- `data/tech-communities.yaml` for community directory entries
- `data/tech-radar.yaml` for technology radar entries
- `data/cloud-enablement.yaml` for cloud providers and products
- `data/page-intros.yaml` for page intro copy
- `data/page-sources.yaml` for source-card metadata

If the change is a new record inside an existing inventory, it should normally require no
code changes.

## Add A Model Family

Add a source only when the provider or delivery channel is new. Then add a new family
under `catalog.families`.

```yaml
catalog:
  sources:
    - slug: example-managed
      name: Example Managed Models
      provider: Example Cloud
      delivery: Managed API
      source_url: https://example.com/models
      pricing_url: https://example.com/pricing

  families:
    - slug: example-family
      family_name: Example Family
      source: example-managed
      status: explore
      regions_available:
        - global
        - us-east1
      price: Example pricing summary for operators.
      models:
        - Example 1
        - Example 2
      notes:
        - Short operational guidance for adopters.
      source_urls:
        - https://example.com/models
```

Notes:

- `source` must match one of the source `slug` values.
- `status` should stay within the existing governed states used by the page.
- new families and new sources appear automatically in the filters and index.

## Add A Community

Add a new item under `communities`.

```yaml
communities:
  - slug: ai-evals-guild
    name: AI Evals Guild
    track: AI
    category: Evaluation
    tags:
      - AI
      - Evaluation
      - Quality
    summary: Working group for evaluation methods, scorecards, and release gates.
    audience:
      - Engineering
      - Product
      - Data Science
    cadence: Weekly
    link: https://example.com/ai-evals-guild
    link_label: Open community home
```

Notes:

- new tracks are discovered from the YAML automatically and become filter buttons without page edits.
- keep `slug` stable because search and generated references use it as an identifier.

## Add A Tech Radar Entry

Add a new item under `entries` in `data/tech-radar.yaml`.

```yaml
entries:
  - slug: example-runtime
    name: Example Runtime
    ring: Explore
    primary_scope: Platform
    archetypes:
      - Infrastructure
    source_type: non-oss
    status: emerging
    domain: Platform
    owner: Platform Engineering
    summary: Short operator-facing summary of what this technology is for.
    reasoning: Why it belongs in this lifecycle state.
    maturity: pilot
    operation_scope: Where it is allowed to run.
    operation_model: How teams should operate it.
    review_cadence: Every 6 weeks
    updated: 2026-04-12
    capabilities:
      - Capability one
    guardrails:
      - Guardrail one
    signals:
      - Signal one
    actions:
      - Action one
    alternatives:
      - Alternative one
```

Notes:

- keep `ring`, `source_type`, and `archetypes` within the values already supported by the loader.
- source-type filter buttons are derived from the entries that actually exist in the dataset.

## Add A Cloud Product

Add a product inside the matching provider in `data/cloud-enablement.yaml`.

```yaml
providers:
  - slug: gcp
    products:
      - slug: example-service
        name: Example Service
        archetype: Product
        category: Application development
        summary: Short description of the service.
        product_url: https://example.com/product
        feature_source_url: https://example.com/docs
        feature_coverage: Partial
        known_features:
          - Feature one
          - Feature two
```

Notes:

- the cloud page derives visible archetype filters from the loaded products.
- add `iam_source_url` and `iam_permissions` only when the service needs access-mapping detail.

## Update Shared Page Copy

For copy that should stay editable outside page templates:

- edit `data/page-intros.yaml` to change the eyebrow, title, or summary of a standard page
- edit `data/page-sources.yaml` to change the source card shown near the top of a standard page

This keeps explanatory copy configurable without mixing it into the Astro route files.

## When Code Changes Are Actually Needed

Edit loaders or pages only when one of these is true:

- the YAML schema itself needs a new field
- the filtering logic needs a new dimension
- the rendered layout needs a new visual treatment
- a brand-new page family is being introduced

For routine content growth, prefer staying inside `data/`.
