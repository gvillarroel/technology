# Repository Scanning

The documentation loader uses one global repository rule: if a repository has Markdown
files under `docs/`, it is eligible for publication in the Documentation section.

## Discovery Flow

1. expand repositories for the configured GitHub account
2. exclude repositories that match explicit ignore patterns
3. inspect each repository tree for `docs/*.md` and `docs/**/*.md`
4. group matching files by repository and folder hierarchy
5. render one repository landing page plus one page per Markdown document

## Expected Outcome

- every qualifying repository gets its own entry card
- nested folders become the sidebar tree
- Markdown remains the source of truth for document content

## Why This Is Better Than Per-Repo Rules

- less configuration drift
- easier onboarding for new repositories
- lower maintenance cost when repositories are added or renamed
