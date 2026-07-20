# AGENTS.md

## Mission

Keep this repository a minimal, secure Astro site driven entirely by remote data. Read `REQUIREMENTS.md`
and `README.md` before changing architecture, data access, routing, deployment, or security.

## Goal Protocol

When a user starts a `/goal`:

1. Translate the request into a concrete objective and map it to requirement IDs.
2. Create and maintain a short plan with one active step.
3. Work autonomously through safe implementation, tests, build, and browser verification.
4. Do not declare completion while any requested outcome or Definition of Done item remains unverified.
5. Before completing, audit every applicable requirement and report evidence, deployed URLs, and residual risk.

Ask for input only when a missing choice would materially change the result or when additional authority is
required. Do not ask whether to run relevant checks, builds, tests, or safe read-only diagnostics.

## Non-Negotiable Rules

- Write every document, comment, identifier, and artifact in English.
- Never add governed site data, downloaded catalogs, or structured-content roots to the repository.
- Keep `site.json` metadata-only. Every route must reference its own unique remote `.json` or `.jsonl` object.
- Never add `file://` or filesystem fallbacks. Local and CI builds must use the same remote source path.
- Never commit secrets, service-account keys, `.env`, or `gha-creds-*.json`.
- Keep every external GitHub Action pinned to a reviewed full-length commit SHA; retain its release tag as a comment.
- Treat GCS input as private and generated GitHub Pages output as public.
- Prefer an original HTTPS page object. Use private GCS JSON or JSONL as fallback or governed page data.
- Keep transport logic in `src/lib/connectors.ts` and data interpretation in `src/lib/catalog.ts`.
- Keep compatible routes data-defined. Add TypeScript only for a genuinely new interaction template.
- Preserve an `.md.ts` counterpart for every `.astro` page.
- Record durable architecture or security changes in an ADR before implementation grows beyond this seed.

## Extension Rules

- **Add data:** replace the route's remote `.json` or `.jsonl` object; never inline records in `site.json`.
- **Add a route:** upload one unique page object, then add its route, source, and field projection to `site.json`.
- **Add a connector:** extend `readSourceText`, document its trust boundary, and add failure-path coverage.
- **Add a template:** define its catalog contract first, add one shared HTML component and Markdown renderer,
  then update the route dispatcher and schema.

## Required Validation

Run from the repository root:

```sh
npm ci
npm run check
npm run build
```

For UI changes, reuse one development server, verify desktop and mobile behavior with Playwright, capture one
focused screenshot, and share the review URL. For deployment changes, verify the GitHub Actions run, both
deployed formats, private catalog 403 behavior, and least-privilege IAM scope.

The worktree may contain user changes. Preserve unrelated files, avoid destructive Git commands, and push
only intentional changes after validation when the task authorizes publishing.
