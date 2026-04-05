# Query Parameter Mode Spike

## Idea

Keep one canonical route and switch between HTML and Markdown using a query string such as
`?format=md`.

## Result

Rejected.

## Why

- Static hosting on GitHub Pages does not generate separate static artifacts per query string.
- Query-string mode is not file-like and does not satisfy the requirement that the Markdown
  route should be addressable as the same URL plus `.md`.
- Internal linking becomes less predictable because format state must be preserved in every link.

## Conclusion

This is not a good fit for the project.
