# Documents Markdown vs UI Audit

Generated on 2026-04-08 from the image-analysis artifacts under `.tmp/img2md/`.

Legend:
- `match`: the generated `.md` route carries the same substantive information as the UI artifact.
- `partial`: the route carries the core content, but UI state/chrome/card framing is flattened or compressed in Markdown.
- `mismatch`: the artifact belongs to an older prototype, a broader/other route family, or a non-page capture such as a 404/error.

## `documents*.png.md`

- `documents-architecture-folder-page.png.md` | `/documents/gvillarroel-technology/docs/architecture.md` | `partial` | Path, metadata, `On this page`, section-page listing, body headings, and next navigation are present; rail grouping and action-link treatment are compressed.
- `documents-code-highlighting-v1.png.md` | `/documents/gvillarroel-pulse/docs/user-manual.md` | `match` | User Manual structure, TOC, body sections, and code blocks are preserved in Markdown.
- `documents-code-metadata-v1.png.md` | `/documents/gvillarroel-pulse/docs/user-manual.md` | `match` | Metadata, TOC, body sections, and code-heavy content are all present.
- `documents-config-index.png.md` | `/documents.md` | `match` | The Markdown index now carries the same substantive configuration framing as the UI: hero copy, top-level stats, repository discovery explanation, and YAML configuration preview.
- `documents-config-technology-detail.png.md` | no current generated `/documents` route match | `mismatch` | Old context-library viewer for `data/context` content; does not map to the current repository-scanned documents routes.
- `documents-config-technology.png.md` | `/documents/gvillarroel-technology.md` | `mismatch` | Same repository slug exists, but the old UI was a broader `.specs`/`data/context` scan model; current Markdown is docs-only and no longer matches that scope.
- `documents-detail-editorial-v1.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Breadcrumb/path, metadata, TOC, body text, and diagram coverage are all present.
- `documents-detail-live-v2.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Same article structure, headings, metadata, TOC, and body content are represented.
- `documents-detail-live-v3.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Current Markdown covers path, metadata, TOC, body, and previous/next navigation.
- `documents-detail.png.md` | no current generated `/documents` route match | `mismatch` | Old Security Protocols Library/local-data viewer; does not map to the current repository-scanned documents implementation.
- `documents-docs-root-overview-v2.png.md` | `/documents/gvillarroel-technology/docs.md` | `partial` | Same route is covered with path, metadata, explicit `Sections` and `Purpose` framing, section links, and body; the Markdown page still remains broader than the tighter UI snapshot because it preserves the full repository overview content.
- `documents-docs-root-overview.png.md` | `/documents/gvillarroel-technology/docs.md` | `partial` | Title, path, metadata, folder tree, section listings, explicit `Sections` and `Purpose` framing, and body are present; current Markdown still preserves a broader repository overview after that framing.
- `documents-docs-root-subsections.png.md` | `/documents/gvillarroel-technology/docs/documentation.md` | `match` | The artifact maps to the generated `Documentation` folder page, including breadcrumb/path context, generated status, child-page listing, and section-level navigation.
- `documents-folder-index-fix.png.md` | `/documents/gvillarroel-technology/docs/documentation.md` | `match` | Generated-folder framing, metadata, TOC, child-page list, pages-in-section, and previous/next navigation are present.
- `documents-generated-note-v2.png.md` | `/documents/gvillarroel-technology/docs/documentation.md` | `match` | Generated note, path context, metadata, TOC, child pages, section links, and pagination are represented.
- `documents-github-pages.png.md` | `/documents.md` | `match` | Repository-driven intro, GitHub repository discovery explanation, and YAML configuration coverage are now all present in Markdown, with only layout flattening.
- `documents-global-docs-index-full.png.md` | `/documents.md` | `partial` | Repository-driven intro, config preview, repository list, and counts are present; older explainer-card wording and snapshot details are not preserved exactly.
- `documents-global-docs-index.png.md` | `/documents.md` | `match` | Hero copy, repository-discovery explanation, and standalone YAML-configuration coverage are now represented together in Markdown.
- `documents-index-config-files-updated.png.md` | `/documents.md` | `mismatch` | 404 capture, not a valid parity target for the current generated Markdown route.
- `documents-index-config-files.png.md` | `/documents.md` | `match` | The index now includes both the config-file inventory and the fuller configuration narrative that explains how scan rules turn repositories into published documentation.
- `documents-index-live-v2.png.md` | `/documents.md` | `partial` | Hero, stats, config preview, repository inventory, and counts are present; missing explicit search-state framing and repository-grid state labels.
- `documents-index-live-v3.png.md` | `/documents.md` | `partial` | Hero, summary badges, stats-card content, repository count, and repository details are represented; header chrome and grid affordances are absent.
- `documents-index-pseudocode.png.md` | `/documents.md` | `partial` | Repository-driven hero and config inventory are present; the older two-card pseudocode/explainer framing is flattened into sections.
- `documents-index-recent-v1.png.md` | `/documents.md` | `partial` | Hero and stats match, and repository summaries are present; no dedicated recently-updated block is emitted because there are no dated docs.
- `documents-index-reference-v1.png.md` | `/documents.md` | `partial` | Hero, config preview, repository stats, and repository list are present; older explainer-card structure is compressed away.
- `documents-index-reference-v2.png.md` | `/documents.md` | `partial` | Hero, config preview, repositories, and pages are present; missing the two-card explainer layout and old snapshot framing.
- `documents-index-reference-v3.png.md` | `/documents.md` | `partial` | Core content and config files are present; technical-card narrative and repository-grid header semantics are flattened.
- `documents-index-reference-v4.png.md` | `/documents.md` | `partial` | Same facts and config preview are present; scan-card/config-card structure is flattened into sections.
- `documents-index-views-v1.png.md` | `/documents.md` | `match` | Markdown now carries both repository and page inventories plus stable `Repositories visible` and `Pages visible` framing; only presentational toggle chrome is flattened.
- `documents-index.png.md` | `/documents.md` | `mismatch` | Old governed-local-library prototype; current Markdown is the newer repository-driven index.
- `documents-link-fallback-pulse.png.md` | `/documents/gvillarroel-pulse/docs/user-manual.md` | `match` | Breadcrumbs/path, metadata, full `On this page`, nav-tree equivalent, body content, and anchors are aligned.
- `documents-links-clean-dashboard.png.md` | `/documents/gvillarroel-pi-extensions/docs/dashboard.md` | `match` | Breadcrumbs/path, metadata, `On this page`, nearby pages, cleaned internal links, overview table, and body coverage now align without the extra `Related docs:` preface that previously drifted from the UI.
- `documents-local-preview.png.md` | `/documents.md` | `mismatch` | Current Markdown route exists, but the older two-card explanatory layout and copy are no longer mirrored.
- `documents-markdown-links-review.png.md` | `/documents/gvillarroel-technology/docs.md` | `partial` | Title, path context, published state, metadata, rewritten links, and explicit `Sections` and `Purpose` framing are represented, but the live Markdown body still preserves the broader `docs/README.md` repository overview after that tighter framing.
- `documents-mobile-tools-memory-v1.png.md` | `/documents/gvillarroel-technology/docs/documentation.md` | `match` | Mobile generated-folder framing, document info, TOC, and overview/body content are all present in Markdown.
- `documents-mobile-tools-v2.png.md` | `/documents/gvillarroel-technology/docs/documentation.md` | `match` | Generated note, mobile-tool content, path context, TOC, and body sections are represented.
- `documents-pages-prioritized-v2.png.md` | `/documents.md` | `partial` | Matching technology pages are present in the Pages section; missing live search framing, matched-count header, and prioritized search-state presentation.
- `documents-pages-view-v2.png.md` | `/documents.md` | `partial` | Hero, library summary, config preview, and full page-level inventory are present; missing explicit page-view toggle state and pages-visible toolbar framing.
- `documents-repo-reference-v1.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Repository title, summary, metadata, discovery model, source configs, folder tree, and child page listing are represented.
- `documents-repo-reference-v2.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Same repository-index content is present in Markdown, including metadata, discovery model, and section links.
- `documents-repo-reference-v3.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Repository summary, scan/discovery narrative, metadata, and page listing are present; layout differences only.
- `documents-repo-reference-v4.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Current Markdown covers the repository-index content shown in that UI iteration, flattened from cards into sections.
- `documents-repo-trust-strip-v2.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | The repository Markdown now carries the same substantive trust-strip content as the UI, including last scan, freshness, latest dated page, most recently changed path, confidence signal, repository metadata, and child page listing.
- `documents-repo-trust-strip-v3.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Repository snapshot metrics, repository metadata, discovery model, source configs, and child page listing are now all represented in Markdown; only card layout differs.
- `documents-repo-trust-strip.png.md` | `/documents/gvillarroel-adk-conn.md` | `mismatch` | Browser error capture (`ERR_CONNECTION_REFUSED`), not a valid route state.
- `documents-search-highlight-v1.png.md` | `/documents.md` | `partial` | Repository coverage, summary metrics, and repository inventory are present; missing highlighted query state and repositories-visible header framing.
- `documents-search-incremental-v1.png.md` | `/documents.md` | `partial` | Underlying technology routes exist and are exposed; missing incremental search-results view, query-specific count, and dynamic ranking state.
- `documents-search-live-v2.png.md` | `/documents.md` | `partial` | Hero/stats and listed technology documents are reachable; missing live query-state wrapper and matched-count presentation.
- `documents-search-live-v3.png.md` | `/documents.md` | `partial` | Same route coverage as the UI search results; missing runtime search-state UI such as `Results for` and ranked result slice.

## `docs*.png.md`

- `docs-adk-folder-page.png.md` | `/documents/gvillarroel-adk-conn/docs.md` | `match` | Title, summary, path, metadata, `Section snapshot`, child-page listing, folder tree, and body are all present; only the split viewer layout is flattened.
- `docs-adk-repo-page.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Repository landing page summary, metadata, folder index, and child page listing are all present.
- `docs-astro-ia-runtime-mobile-v2.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Mobile runtime/detail coverage is present with summary, TOC, nearby-page context, metadata, and body; the mobile reader/action framing is compressed.
- `docs-astro-ia-runtime-mobile-v3.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Same route content is present; mobile runtime-view chrome and action treatment are flattened.
- `docs-astro-ia-runtime-mobile-v4.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Metadata, TOC, nearby page, and full body remain represented; the mobile reader layout is not mirrored.
- `docs-astro-ia-runtime-v2.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Same route and article content are covered; reader-style header/actions are compressed into standard Markdown sections.
- `docs-astro-ia-runtime-v3.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Runtime/detail structure is preserved; desktop reader framing is flattened.
- `docs-astro-ia-runtime-v4.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Current Markdown preserves the substantive route content, but not the dedicated runtime-viewer chrome.
- `docs-astro-ia-runtime.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Route, summary, TOC, nearby page, metadata, and body are represented; the reader-style action framing is compressed.
- `docs-breadcrumb-aligned-v1.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Repository-index breadcrumb, metadata, discovery model, source configs, and page listing are represented.
- `docs-breadcrumb-aligned-v2.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Same repository-index content is present; differences are breadcrumb placement and UI chrome only.
- `docs-critique-detail.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Current Markdown covers the same detail route and core content; critique-era UI differences are stylistic.
- `docs-critique-index.png.md` | `/documents.md` | `partial` | Hero, repository-driven concept, config preview, and repository inventory are present; missing the older two-card scan/config explainer framing.
- `docs-dashboard-table.png.md` | `/documents/gvillarroel-pi-extensions/docs/dashboard.md` | `match` | Summary, TOC, nearby pages, overview table, setup steps, config/code blocks, and full body are present.
- `docs-floating-meta-v1.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Breadcrumbs, TOC, nearby-page context, metadata, and full body are present; UI-specific floating-meta grouping is flattened.
- `docs-header-aligned-v1.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Same article content, TOC, and sidebar-equivalent context are present; header/rail alignment is purely presentational.
- `docs-no-duplication-v1.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Main content, metadata, TOC, and previous navigation are present; the UI’s compact metadata/action header is flattened.
- `docs-reader-runtime-desktop.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Route, summary, TOC, nearby page, metadata, and body are represented; reader-style header/actions are compressed.
- `docs-reader-runtime-full.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Same document content and side context are present; UI reader framing and action treatment are flattened.
- `docs-reader-runtime-maxwidth.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Same route and article content are covered; max-width reader presentation is not mirrored in Markdown.
- `docs-reader-runtime-mobile.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Mobile header, metadata, TOC, nearby page, and body content are represented; mobile reader framing is compressed.
- `docs-redesign-folder-full.png.md` | `/documents/gvillarroel-adk-conn/docs.md` | `match` | Same folder-doc route now carries path, metadata, `Section snapshot`, child pages, tree, and body; redesign-specific card/editor layout is flattened but no substantive content is missing.
- `docs-redesign-folder.png.md` | `/documents/gvillarroel-adk-conn/docs.md` | `match` | Folder route content, section framing, child-page context, and body are present; the redesign tree/viewer split is purely presentational in Markdown.
- `docs-redesign-leaf-compact.png.md` | `/documents/gvillarroel-television/docs/operations/windows-setup.md` | `partial` | Document path, metadata, tree context, and body are present; compact file-viewer framing is flattened.
- `docs-redesign-leaf-mobile-chromium.png.md` | `/documents/gvillarroel-television/docs/operations/windows-setup.md` | `partial` | Mobile route coverage is present with body and metadata; Chromium mobile viewer framing is compressed.
- `docs-redesign-leaf-mobile-full.png.md` | `/documents/gvillarroel-television/docs/operations/windows-setup.md` | `partial` | Path, metadata, file-tree equivalent, and body are present; mobile redesign viewer/actions are flattened.
- `docs-redesign-leaf.png.md` | `/documents/gvillarroel-television/docs/operations/windows-setup.md` | `partial` | Document body, path, metadata, and tree context are present; file-viewer/editor treatment is not mirrored exactly.
- `docs-redesign-repo.png.md` | `/documents/gvillarroel-adk-conn.md` | `match` | Repository landing page summary, folder index, metadata, and repository actions are all represented in Markdown, flattened from cards into sections.
- `docs-refined-detail.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Current Markdown contains the same document content, TOC, path context, and metadata.
- `docs-refined-index.png.md` | `/documents.md` | `partial` | Hero, stats, config preview, and repository inventory are present; repository-grid UI state and chrome are absent.
- `docs-search-dashboard.png.md` | `/documents.md` | `partial` | Hero, stats, config preview, and repository inventory are present; explicit search/dashboard framing from that UI variant is not represented.
- `docs-spacing-tightened-v1.png.md` | `/documents/gvillarroel-adk-conn/docs/runtime-and-configuration.md` | `partial` | Same runtime/detail content, TOC, nearby-page context, and metadata are present; spacing/header refinements are purely presentational.
- `docs-system-overview-page-v2.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Current Markdown preserves the same document structure, TOC, and diagram/body coverage.
- `docs-system-overview-page.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Breadcrumbs/path, metadata, TOC, body sections, and document scope are all present.
- `docs-system-overview-refined.png.md` | `/documents/gvillarroel-technology/docs/architecture/system-overview.md` | `match` | Refined UI variant still maps cleanly to the current Markdown route.
- `docs-television-doc-page.png.md` | `/documents/gvillarroel-television/docs/operations/windows-setup.md` | `partial` | Path, metadata, tree equivalent, and full body are present; file-viewer/editor framing is compressed into standard Markdown sections.
