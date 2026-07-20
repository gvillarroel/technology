# GitHub + GCS Astro Seed

A minimal Astro project that reads a private route manifest plus one remote JSON or JSONL object per page,
then publishes static HTML and Markdown to GitHub Pages. It uses GitHub OIDC and direct Google Cloud Workload
Identity Federation: there is no service account and no long-lived cloud key.

## What Is Included

- One `catalog` template for every route.
- One small private manifest with no page records.
- One unique `.json` or `.jsonl` source per page route.
- `https://` primary-source and private `gs://` fallback connectors.
- HTML/Markdown route parity and graph checks.
- A GitHub Pages workflow with short-lived GCP credentials.
- Immutable full-SHA pins for every GitHub Action dependency.
- `REQUIREMENTS.md`, `catalog.schema.json`, and agent operating rules.

## Local Use

Requirements: Node.js 22.12+, npm, Google Cloud CLI, and an identity with read access to the catalog object.

```sh
npm ci
gcloud auth login
export SITE_CATALOG_URI=gs://YOUR_BUCKET/YOUR_PREFIX/site.json
npm run check
npm run build
npm run dev -- --host 0.0.0.0 --port 4321
```

In PowerShell, set the variable with:

```powershell
$env:SITE_CATALOG_URI = "gs://YOUR_BUCKET/YOUR_PREFIX/site.json"
```

The `.env.example` file documents the variable, but production configuration belongs in GitHub repository
variables. Do not commit `.env` or a downloaded catalog.

## Catalog Setup

Create one `.json` or `.jsonl` data object for every page route. JSON may contain an array or a projected
collection; JSONL contains one record per non-empty line. Upload each object outside the repository:

```sh
gcloud storage cp /path/outside/repository/home.json gs://YOUR_BUCKET/YOUR_PREFIX/pages/home.json
gcloud storage cp /path/outside/repository/events.jsonl gs://YOUR_BUCKET/YOUR_PREFIX/pages/events.jsonl
```

Then create a metadata-only `site.json` matching `catalog.schema.json`, using the complete example in
`REQUIREMENTS.md`. Each route points to its own page object:

```sh
gcloud storage cp /path/outside/repository/site.json gs://YOUR_BUCKET/YOUR_PREFIX/site.json
```

Keep the manifest and page objects private. The workflow only needs `storage.objects.get` and
`storage.objects.list` through `roles/storage.objectViewer` on the selected prefix or managed folder.

## One-Time GitHub OIDC/WIF Setup

Use immutable numeric GitHub owner and repository IDs. Obtain them with:

```sh
gh api repos/OWNER/REPOSITORY --jq '{repository_id: .id, repository_owner_id: .owner.id}'
```

Create a workload identity pool and an OIDC provider using issuer
`https://token.actions.githubusercontent.com`. Map at least:

```text
google.subject=assertion.sub
attribute.repository_id=assertion.repository_id
attribute.repository_owner_id=assertion.repository_owner_id
attribute.ref=assertion.ref
attribute.workflow_ref=assertion.workflow_ref
```

The provider condition must bind the exact identity and deployment path:

```text
assertion.repository_owner_id=='OWNER_ID' &&
assertion.repository_id=='REPOSITORY_ID' &&
assertion.ref=='refs/heads/main' &&
assertion.workflow_ref=='OWNER/REPOSITORY/.github/workflows/deploy.yml@refs/heads/main'
```

Grant the repository principal direct read-only access to the catalog managed folder. Use the numeric Google
Cloud project number in the member URI:

```text
principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/attribute.repository_id/REPOSITORY_ID
```

Assign only `roles/storage.objectViewer` on `gs://YOUR_BUCKET/YOUR_PREFIX/`. Do not grant a project-wide role
and do not create a service-account key. Google Cloud IAM changes can take several minutes to propagate.

Configure these GitHub repository variables:

| Variable | Value |
| --- | --- |
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full `projects/.../providers/...` provider resource name |
| `SITE_CATALOG_URI` | Exact private `gs://.../site.json` URI |

Set GitHub Pages to use **GitHub Actions** as its source, then push `main` or run the workflow manually.
Enable the repository policy that requires Actions to be pinned to full-length commit SHAs when available.

## Architecture

```text
Private GCS site.json ── route registry ─┬─ page-a.json  ─┐
                                        ├─ page-b.jsonl ─┼─ connectors.ts ─ catalog.ts ─ template ─ dist/
Original HTTPS page source ──────────────┤               │                                 │
Private GCS page fallback ───────────────┘               └─────────────────────────────────┴─ GitHub Pages
```

Updating content replaces only that route's remote object. Adding a route uploads one new page object and
adds one manifest entry. Add code only when a new transport or interaction template is genuinely required.

Security background: [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation),
[deployment pipeline configuration](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines),
and [GitHub OIDC for Google Cloud](https://docs.github.com/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform).
