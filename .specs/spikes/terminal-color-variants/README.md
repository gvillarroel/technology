# Terminal Color Variants Spike

## Goal

Explore color mappings for the landing page terminal that stay closer to the official
palette while preserving the current terminal-first layout and hierarchy.

## Variants

### Variant A: Balanced Official

- Closest to the current implementation.
- Uses the official red, blue, orange, and green more directly without pushing the
  terminal too far into a brand-heavy look.
- Best fit when readability and brand alignment need equal priority.

### Variant B: Brand Forward

- Pushes the official red and gray relationship harder.
- Feels more explicitly branded and less neutral.
- Strong candidate if the landing page should feel more unique and ownable.

### Variant C: Cool Enterprise

- Leans on the official blue and gray tones.
- Feels quieter, more enterprise-oriented, and more restrained.
- Strong candidate if the product should feel more operational than expressive.

## Recommendation

Start from `Variant A: Balanced Official`.

Reasoning:

- It preserves the terminal atmosphere already approved in the current direction.
- It stays visibly closer to the official palette.
- It avoids over-branding the terminal or making it look too generic.

## Related Files

- `src/components/FakeTerminal.astro`
- `src/pages/index.astro`
- `src/pages/spikes/terminal-colors.astro`
- `src/styles/global.css`
