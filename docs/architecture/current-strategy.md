# Current Strategy

The repository publishes one static, dual-format technology reference surface. The strategy is:

- use the original GitHub repository for repository-backed ADRs, documentation, and skills
- use one private GCS JSON catalog for governed datasets, route definitions, and snapshots
- keep all governed data outside the code repository
- normalize source records in `src/lib/` and render HTML plus `.md` twins
- use one generic catalog template for directory-style pages and specialized templates only where the
  interaction model genuinely differs

## Operating Model

1. A data owner updates an original source or the private `site.json` object.
2. `connectors.ts` reads the source without copying it into the repository.
3. `site-catalog.ts` exposes routes and named datasets.
4. Domain loaders normalize the records.
5. Astro templates emit static HTML and Markdown.
6. build checks enforce route parity and Markdown graph reachability.

Navigation, intros, source disclosures, dataset selection, and generic field projections are defined in
the remote route registry. Presentation and normalization logic remain versioned in Git.

The site is intentionally static-first, governed-data-first, dual-format, and operational rather than a
general-purpose CMS.
