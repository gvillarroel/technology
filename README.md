# technology

Initial Astro `6.1.1` base for generating a static site and publishing it to GitHub Pages.

## Scripts

- `npm install`
- `npm run dev`
- `npm run check`
- `npm run check:markdown-pages`
- `npm run build`
- `npm run preview`

`npm install` also runs `prepare`, which configures `git` to use the repository-local hooks under `.githooks/`.
The `pre-commit` hook runs `npm run check:markdown-pages` so a new `.astro` page cannot be committed without its matching `.md.ts` route.

## Deploy

The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the site and publishes `dist/` to GitHub Pages on push to `main`.

## GitHub Pages

In the GitHub repository:

1. Go to `Settings > Pages`.
2. Under `Build and deployment`, choose `GitHub Actions`.

Astro computes `base` automatically:

- `https://<owner>.github.io/` for repositories named `<owner>.github.io`
- `/<repo>` for standard repositories like this one
