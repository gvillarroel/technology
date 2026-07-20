# ADR 0009: Remote Catalog, Connectors, Routes, and Templates

- Status: Accepted
- Date: 2026-07-19

## Context

The site previously repeated YAML file loading across domain modules, defined navigation separately from
route content, and copied a private archive into a local `data/` directory before every build. Adding data
or a page required knowing several unrelated files. Local fallbacks also made CI and workstation builds
behave differently.

The architecture should use little code, make extension points obvious, prefer original sources, and keep
governed data outside the repository.

## Decision

Use one private JSON catalog at `gs://limited-502918-cheap-gcs/technology/site.json`. The catalog has three
top-level contracts:

```json
{
  "schemaVersion": 1,
  "navigationGroups": [{ "id": "practice", "label": "Practice" }],
  "routes": [{
    "id": "communities",
    "path": "/communities/",
    "template": "catalog",
    "dataset": "tech-communities",
    "navigation": true,
    "group": "practice",
    "intro": { "eyebrow": "Communities", "title": "...", "summary": "..." },
    "source": { "file": "gs://...#datasets.tech-communities", "lang": "json", "title": "...", "summary": "..." },
    "catalog": { "collection": "communities", "titleField": "name", "summaryField": "summary" }
  }],
  "datasets": { "tech-communities": { "communities": [] } }
}
```

`src/lib/connectors.ts` is the only transport boundary. It supports exact-object `gs://` reads through
the authenticated Google Cloud CLI and `https://` reads through `fetch`. It deliberately has no `file://`
or filesystem connector. Add another transport by extending `readSourceText`; domain loaders must not
implement transport logic.

`src/lib/site-catalog.ts` loads and caches the catalog. Domain loaders request a named dataset. Repository
scanners fetch GitHub trees and Markdown from the original repository through the HTTP connector. A GCS
snapshot is the fallback only when the original source cannot be used reliably at build time.

Routes select a template:

- `catalog`: a data-defined flat directory rendered by the shared HTML and Markdown catch-all routes.
- specialized identifiers such as `radar`, `ai-sdlc`, or `document-library`: domain-specific Astro pages
  that still consume navigation, intro, source, and dataset configuration from the route registry.

Adding another `catalog` page requires only a dataset and route entry in the remote JSON. Adding a truly
new interaction model requires one template implementation and a new template identifier. Every rendered
page keeps an HTML route and a `.md` twin.

GitHub Actions authenticates with direct GitHub OIDC Workload Identity Federation. The build identity has
read-only access to the `technology/` managed folder. No archive extraction, service-account key, or
long-lived GitHub secret is used.

## Consequences

- Governed data and route configuration have one external source of truth.
- Local and CI builds use the same connector path and fail clearly if credentials or data are unavailable.
- Navigation and generic catalog routes can grow without code changes.
- The remote catalog is a build dependency; availability and schema compatibility must be monitored.
- Publishing a catalog change is an operational data action outside this repository and should be reviewed
  by the data owner before replacing the object.
- Static output is public even though the input object is private; catalog content must not contain secrets.
