# technology

Initial Astro `6.1.1` base for generating a static site and publishing it to GitHub Pages.

## Scripts

- `npm install`
- `npm run dev`
- `npm run check`
- `npm run check:markdown-pages`
- `npm run check:markdown-pages:dist`
- `npm run build`
- `npm run preview`

## Shared Local Server

When a live local service is needed, prefer one shared development session for the whole repository instead of multiple parallel instances on different ports.

- Shared command: `npm run dev -- --host 0.0.0.0 --port 4321`
- Shared URL: `http://localhost:4321/`
- Before starting a new local server, first check whether the shared URL is already responding and reuse it if available.

`npm install` also runs `prepare`, which configures `git` to use the repository-local hooks under `.githooks/`.
The `pre-commit` hook runs `npm run check:markdown-pages` so a new `.astro` page cannot be committed without its matching `.md.ts` route.
`npm run build` also runs a post-build Markdown graph audit that crawls generated `dist/**/*.md`
from `/index.md` and fails on broken internal Markdown links or unreachable generated pages.

## Deploy

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the site and publishes `dist/` to GitHub Pages on push to `main`.

## GitHub Pages

In the GitHub repository:

1. Go to `Settings > Pages`.
2. Under `Build and deployment`, choose `GitHub Actions`.

Astro computes `base` automatically:

- `https://<owner>.github.io/` for repositories named `<owner>.github.io`
- `/<repo>` for standard repositories like this one
