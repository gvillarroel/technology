# technology

Astro `7.1.1` static site published to GitHub Pages.

## Scripts

- `npm install`
- `npm run data:pull`
- `npm run data:push`
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

## Private Build Data

The source data is stored privately at `gs://limited-502918-cheap-gcs/technology/` and is not tracked by Git.
Maintainers with access to the bucket can synchronize it into the ignored local `data/` directory:

```sh
gcloud auth login
npm run data:pull
```

After editing local data, an authorized maintainer can replace the private archive with `npm run data:push`.
The archive-based transfer deliberately avoids granting the CI identity permission to list unrelated object
names elsewhere in the shared bucket.

The deployment workflow uses GitHub OIDC and Google Cloud Workload Identity Federation. It receives a
short-lived, read-only identity restricted to this repository's `main` deployment workflow and to the
bucket's `technology/` managed folder. No Google Cloud service-account key or long-lived GitHub secret is
required.

The bucket source remains private, but the static pages and assets generated from it are public after a
GitHub Pages deployment. Do not put secrets in the build data.

## Deploy

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) downloads the private data,
builds the site, and publishes `dist/` to GitHub Pages on push to `main`.

## GitHub Pages

In the GitHub repository:

1. Go to `Settings > Pages`.
2. Under `Build and deployment`, choose `GitHub Actions`.

Astro computes `base` automatically:

- `https://<owner>.github.io/` for repositories named `<owner>.github.io`
- `/<repo>` for standard repositories like this one
