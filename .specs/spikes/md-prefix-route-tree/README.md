# Markdown Prefix Route Tree Spike

## Idea

Serve HTML at `/path/` and Markdown at `/md/path/`.

## Result

Rejected.

## Why

- It breaks the desired mental model that Markdown is the same page with a `.md` suffix.
- It creates two different route trees, which makes authoring and debugging less intuitive.
- Link rewriting must understand prefixes instead of just applying a suffix rule.

## Conclusion

This is workable, but it is less simple than suffix-based twin routes.
