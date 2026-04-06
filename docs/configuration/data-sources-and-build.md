# Data Sources And Build Composition

The configuration model for this repository is centered on checked-in YAML files under
`data/`. Each major page family reads a dedicated source file and transforms that source
into a page model during `astro build`.

## High-Value Configuration Files

The following files are the most important for day-to-day maintenance:

- `data/document-repositories.yaml`: repository scanning rules for documentation pages
- `data/tech-radar.yaml`: technology inventory and radar metadata
- `data/products.yaml`: products referenced across the site
- `data/models.yaml`: model catalog used by AI-facing content
- `data/ai-communities.yaml` and `data/tech-communities.yaml`: community inventories
- `data/skills-repositories.yaml` and `data/skill-evaluations.yaml`: skills catalog sources
- `data/terminal-commands.yaml`: command definitions shown by the fake terminal

## Configuration To Route Flow

```mermaid
flowchart LR
    A["data/*.yaml"] --> B["src/lib/*.ts loaders"]
    B --> C["src/pages/*.astro"]
    B --> D["src/pages/*.md.ts"]
    C --> E["HTML routes"]
    D --> F["Markdown routes"]
```

## How Documentation Scanning Works

The `documents` surface is the most dynamic configuration-driven page family in the
repository.

### Source Of Truth

`data/document-repositories.yaml` defines:

- which GitHub account or repositories should be scanned
- which repository name filters are allowed
- which document rules apply inside each repository
- which folder domains and path patterns are publishable

### Resolution Pipeline

During build, `src/lib/documents.ts` performs these steps:

1. load the repository scan configuration from `data/document-repositories.yaml`
2. expand repository candidates from GitHub or local workspace fallbacks
3. fetch repository trees and match Markdown files against configured rules
4. read Markdown sources, frontmatter, and commit dates
5. normalize each file into a `DocumentPage`
6. collapse folder landing pages through `README.md` or `index.md`
7. emit repository landing pages, folder pages, and document pages

```mermaid
flowchart TD
    A["data/document-repositories.yaml"] --> B["Repository source configs"]
    B --> C["GitHub account repos or local clones"]
    C --> D["Repository trees"]
    D --> E["Matching Markdown files"]
    E --> F["DocumentPage models"]
    F --> G["Repository summary pages"]
    F --> H["Folder-aware tree navigation"]
    G --> I["/documents/... HTML and .md routes"]
    H --> I
```

## External Sources Used During Build

The build can compose pages from three kinds of inputs:

### Checked-In Local Data

This is the default and safest source:

- YAML and Markdown under `data/`
- Markdown under `docs/`
- content collections under `src/content/`

### GitHub API Metadata

Some loaders query GitHub for repository metadata or repository trees. For example,
`documents.ts` can call:

- repository listing endpoints
- Git trees endpoints
- commits endpoints for latest file dates

The loader keeps in-memory caches during the build to avoid repeated requests.

### Local Workspace Fallbacks

When GitHub rate limits or denies access, some loaders fall back to local sibling clones.
That is how the documentation scanner can still resolve repository-backed pages while
working offline or under API restrictions.

## Update Strategy By Change Type

Use this update model when maintaining the site:

- update `data/*.yaml` when inventories or classifications change
- update `docs/**/*.md` when repository documentation should appear in the Documentation section
- update `src/lib/*.ts` when composition logic, URL rewriting, or derived metadata changes
- update `src/pages/*.astro` when information architecture or page layout changes

## Build Guardrails

The build has a few important safety constraints:

- `npm run check:markdown-pages` enforces HTML and Markdown route parity
- `npm run build` runs the parity check before Astro build
- documentation routes are generated statically, so scan results are frozen at build time

## Operational Consequences

This configuration approach gives the project a few useful properties:

- the site remains inspectable and reproducible from Git state
- configuration changes are reviewable as plain diffs
- repository-backed documentation can be published without a separate CMS
- the same content can be browsed as HTML or consumed as Markdown
