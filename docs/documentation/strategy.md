# Documentation Strategy

The site should treat any repository-level `docs/` folder as a publishable documentation
source.

## Why This Approach

- repository owners already understand `docs/`
- path-based discovery is easy to explain and easy to automate
- nested folders naturally become the content tree shown in the site

## Authoring Rules

- keep documents in Markdown
- use one `README.md` when a folder needs a landing page
- keep file names stable so external links remain durable
- store repository-specific material close to the code it explains

## Publishing Model

The Technology site scans repositories, finds `docs/**/*.md`, and turns each matching
repository into a content page with folder-aware navigation.
