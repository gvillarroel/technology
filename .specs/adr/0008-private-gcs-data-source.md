# ADR 0008: Private Google Cloud Storage Data Source

- Status: Accepted
- Date: 2026-07-19

## Context

The site build depends on structured content under `data/`. Keeping that content in the public GitHub
repository exposes the source files and duplicates the intended private source of truth in Google Cloud
Storage. GitHub Actions still needs the files at build time, and a static service-account key stored as a
repository secret would create a long-lived credential that must be rotated and could be exfiltrated.

## Decision

Store the source data under `gs://limited-502918-cheap-gcs/technology/` and synchronize it into the existing
`data/` root before local or CI builds. Ignore `data/**` in Git so the bucket is the only structured-data
source of truth.

Authenticate the deployment workflow with direct GitHub OIDC Workload Identity Federation:

- Workload identity pool: `github-technology` in project `limited-502918`.
- Provider: `github`, accepting only immutable GitHub repository owner ID `1904362`, repository ID
  `1200854389`, the `main` ref, and `.github/workflows/deploy.yml` on `main`.
- Principal access: `roles/storage.objectViewer` on the `technology/` Cloud Storage managed folder only.
- Workflow actions: `google-github-actions/auth@v3` followed by `google-github-actions/setup-gcloud@v3`.
- Data transfer: download the exact `technology/technology-data.tar.gz` object and extract it into `data/`.
  Maintainers publish a replacement archive with `npm run data:push`.

Do not create, download, or store a Google Cloud service-account key for this workflow.

## Consequences

- GitHub obtains short-lived credentials for an explicitly constrained workflow instead of holding a
  reusable cloud secret.
- The build identity can read objects only within the managed folder; it cannot write objects or read
  sibling bucket prefixes through this grant.
- CI does not list the shared bucket. An exact-object archive download avoids the bucket-level
  `storage.objects.list` permission required by recursive Cloud Storage synchronization.
- Local builds require an authenticated Google Cloud identity with access to the managed folder before
  running `npm run data:pull`.
- Historical Git commits may still contain data that was committed before this decision. Removing it from
  current tracking does not rewrite repository history.
- GitHub Pages is public. Any content rendered into `dist/` becomes public even though the source bucket is
  private, so the source data must not contain secrets.
