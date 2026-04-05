# AGENTS.md

## Working Rules

- Always use English in every document, comment, and written artifact in this repository.
- Keep a single repository data root under `data/`. Do not introduce or maintain duplicated structured content under `src/data/` or any parallel data folder.

## Project References

Read the following documents when they are relevant to the task:

- `.specs/adr/*.md`: technical decision records.
- `.specs/spikes/**/README.md`: summaries of technical experiments, including conclusions, lessons learned, and references to related files.
- `.specs/designs.md`: preferred design and styling guidance.
- `data/tech-radar.yaml`: approved technologies.
- `data/products.yaml`: existing products.
- `data/models.yaml`: AI models.
- `data/ai-communities.yaml`: AI communities.
- `data/skills-repositories.yaml`: allowed sources of skills that may be listed here.
- `data/spikes/**`: data files used by spike loaders and spike-backed routes.
- `data/context/**`: contextual content stored in arbitrarily nested folders, where each level may contain Markdown files and additional folders with related material.

## Workflow

- Work locally first and keep the online version updated through pushes.
- Keep Markdown route parity for every page under `src/pages`: each `.astro` page must have a matching `.md.ts` route, and commits should pass `npm run check:markdown-pages`.
- After every visual or UI-related modification, run Playwright-based verification when feasible.
- After each relevant change, capture one focused screenshot of the most relevant or changed section rather than the entire page, and share it in the chat so visual feedback can be reviewed iteratively.
- After each relevant web change, also share the URL where the updated page can be reviewed, whether that is a local preview URL or the deployed URL.
- Use the screenshot review loop as a default part of the implementation workflow for front-end changes.
