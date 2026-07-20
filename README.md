# technology

Astro `7.1.1` static site published to GitHub Pages.

## Commands

- `npm install`
- `npm run dev -- --host 0.0.0.0 --port 4321`
- `npm run check`
- `npm run build`

Local builds require an authenticated Google Cloud identity that can read the private catalog:

```sh
gcloud auth login
npm run build
```

The build reads `gs://limited-502918-cheap-gcs/technology/site.json` directly. Set
`TECHNOLOGY_SITE_CATALOG_URI` to another `gs://` or `https://` catalog for an isolated build.
No site data is downloaded into or stored in the repository.

Repository-backed ADRs, documents, and skills are fetched from their original GitHub sources.
The private GCS catalog holds route definitions, governed JSON datasets, and remote snapshots when an
original source cannot be queried directly.

## Private CI Access

The deployment workflow uses GitHub OIDC and Google Cloud Workload Identity Federation. Google issues
a short-lived, read-only credential restricted to this repository's `main` deployment workflow and the
bucket's `technology/` managed folder. There is no service-account key or long-lived Google credential
in GitHub.

The catalog is private, but generated GitHub Pages output is public. Never place secrets in content that
the site renders.

## Route and Template Contract

The remote catalog contains `navigationGroups`, `routes`, and `datasets`. A route chooses a template and
dataset. The generic `catalog` template can publish a new flat directory in HTML and Markdown with only a
catalog change. Specialized experiences keep a small Astro route and reuse the same remote route metadata.

See [ADR 0009](.specs/adr/0009-remote-catalog-connectors-routes-and-templates.md) and the
[data-source guide](docs/configuration/data-sources-and-build.md).

## GitHub Pages

The workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) checks and builds the site,
then publishes `dist/`. Astro computes the Pages base path from `GITHUB_REPOSITORY`.
