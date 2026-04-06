# Design Preferences

Use this document as the baseline visual reference for the project.

## Product Architecture

- Company name: `e*f(x)`.
- The landing page should feel like a guided technology agent rather than a conventional corporate homepage.
- The landing page should introduce major technology domains and route users into more standard internal pages.
- Secondary pages should be calmer, more operational, and easier to scan.
- `Tech Radar` is a core secondary page and should present approved, emerging, and discouraged technologies with explicit status.
- `Tech Radar` should use a calm operational layout, with a data-driven radial diagram, bat-style information blocks, and adaptive filtering that can float outside the content or collapse into a horizontal control above it when space is constrained.

## Page Roles

### Landing page

- Use an editorial hero with a fake agent or guided assistant pattern.
- Present technology domains as curated sections instead of a flat list of links.
- Make navigation into deeper pages obvious from the first screen.

### Standard pages

- Use clearer content hierarchy, simpler layouts, and lower visual intensity.
- Favor structured sections, ownership, status, and adoption guidance.
- Optimize for reference and repeat visits rather than first impressions.

## Tech Radar Patterns To Reuse

Use the current `Tech Radar` page as the reference pattern for other operational pages.
What should be reused is not only the visual style, but also the way information is framed,
sequenced, and reduced into scan-friendly blocks.

### Content expression

- Start with an eyebrow, a direct task-oriented title, and one short paragraph that explains how to read the page.
- Prefer operational wording over promotional wording. The page should sound like a maintained internal reference, not a campaign page.
- Make the source of truth explicit early. If a page is driven by structured data, name the file or source system in the first summary block.
- Explain the reading order when a page combines overview and detail. Follow the `Tech Radar` pattern: first posture, then filters, then drill-down.
- Favor short declarative sentences that expose status, scope, ownership, and next action.
- Keep explanatory copy compact. Long prose should move to detail pages, not stay in the top-level operational view.

### Block structure

- Compose standard pages from discrete information blocks with clear roles instead of long continuous sections.
- Reuse the bat-style block language for pages that present structured operational content, especially where the content is data-backed.
- Give each top-level block a distinct job. In the radar those jobs are source-of-truth summary, lifecycle model, primary visual overview, active selection detail, and filterable index.
- Prefer one primary visual block plus one adjacent explanation block instead of multiple competing visuals.
- When a block summarizes data, include compact labels, counts, or definitions inside the block so the user can understand it without leaving the section.

### Information hierarchy

- Put summary and orientation before the full index.
- Surface the dimensions users compare most often as visible metadata, not hidden details.
- Keep a stable hierarchy inside list entries: title, concise summary, operational metadata row, then the action link.
- Use labels such as lifecycle, scope, source, status, and updated values consistently across pages when those concepts exist.
- Treat filters as part of the page comprehension model. Any summary counts, visual state, and list totals should react to the same filter state.

### Interaction model

- Let the page teach itself. If a visualization requires interpretation, pair it with a nearby explanation or active-detail panel.
- Default views should reduce cognitive load. Extended or less common states should be revealed intentionally, as the radar does with lifecycle expansion.
- Preserve scanability under constrained widths by allowing controls to relocate without changing their meaning or state.
- Keep visible feedback close to the interaction: selected item, visible result count, and active filter effects should update immediately.

### Shared Filter Rails

- Reuse the shared floating rail pattern for top-level operational filters that need to stay available while the user scrolls through long analytical pages.
- A floating rail should keep following the viewport once it enters the floating state. Do not dock it back into the document while the user continues scrolling through the page.
- The floating state should preserve nearly the same geometry as the resting state. Do not add extra padding, card framing, or other structural shifts that make the rail look like a different component after it becomes sticky.
- When content scrolls behind the rail, use a readable surface treatment instead of a hard opaque block. The preferred treatment is a subtle glass-like layer with blur, light transparency, a soft divider, and restrained shadow.
- The readable surface exists to protect legibility, not to introduce a second card on top of the page. Background separation should feel continuous with the page rather than abrupt.
- Dense filter dimensions such as team selection should use a searchable multi-select dropdown instead of a long strip of visible chips or buttons.
- Searchable multi-select dropdowns should stay closed by default, open only from an explicit trigger, and close when the user presses `Escape` or interacts outside the raised panel.
- Shared filter rails should use the same state model as the charts, summaries, and lists they control. Totals, ratios, visible counts, and selection labels must remain synchronized.
- Reusable rail behavior and surface styling should be expressed as shared classes and modifiers, not reimplemented page by page.

### Diagram And Chart Surfaces

- Diagram and chart surfaces should use straight edges, not rounded corners.
- Keep cards and general content containers free to use rounded corners when appropriate, but charts, mermaid blocks, and radar-style visual frames should stay rectangular.
- If a chart needs separation from surrounding content, prefer border, contrast, spacing, or shadow over corner rounding.
- Diagram and chart surfaces should avoid excessive vertical whitespace. Prefer compact frames and tuned chart spacing over tall canvases with obvious dead space.
- Categorical bar charts should use tighter category spacing when readability allows it, especially on long operational pages where multiple charts stack vertically.
- Bar charts should be ordered from highest value to lowest value by default so the visual reads as a descending progression.
- Mermaid blocks and radar-style visual frames should use restrained padding so the content reads as dense operational information rather than presentation slides.
- Do not use pie charts on operational pages. Prefer bar charts because they make filtered comparisons, ordering, and relative differences easier to read.

## Background Consistency

- Standard pages should keep a stable background regardless of content height, expanded states, or filter results.
- Decorative gradients should be attached to a fixed viewport layer, not to a scrolling document-height container.
- A page becoming shorter or longer must not shift the perceived base color of the experience.
- Page-specific decorative surfaces are allowed inside local cards or hero sections, but the global page wash should remain visually constant across the site.

## Typography

- Primary font family: `Open Sans`, Arial, sans-serif.
- Icon font: `Material Symbols Rounded`.

```css
:root {
  --font-family-open-sans: 'Open Sans', arial, sans-serif;
  --material-symbol-font: 'Material Symbols Rounded';
}

html {
  font-family: var(--font-family-open-sans);
}
```

## Core Color System

Use neutral naming. Do not reference previous brand-specific names in code or documentation.

```css
:root {
  --brand-red: #9e1b32;
  --brand-gray: #333e48;

  --primary-red: #9e1b32;
  --primary-orange: #e77204;
  --primary-yellow: #f1c319;
  --primary-green: #45842a;
  --primary-blue: #007298;
  --primary-purple: #652f6c;
  --color-black: #000000;
  --color-white: #ffffff;
  --color-gray: #333e48;

  --gray-100: #e7e7e7;
  --gray-200: #cfcfcf;
  --gray-300: #b5b5b5;
  --gray-400: #9c9c9c;
  --gray-500: #828282;
  --gray-600: #696969;
  --gray-700: #4f4f4f;
  --gray-800: #363636;
  --gray-900: #1c1c1c;

  --shadow-red: #6d1222;
  --shadow-orange: #994a00;
  --shadow-yellow: #98700c;
  --shadow-green: #294d19;
  --shadow-blue: #004d66;
  --shadow-purple: #431f47;

  --highlight-red: #ffccd5;
  --highlight-orange: #ffe5cc;
  --highlight-yellow: #fff4cc;
  --highlight-green: #dbffcc;
  --highlight-blue: #cdf3ff;
  --highlight-purple: #f9ccff;

  --status-red: #e8002a;
  --status-orange: #ff9633;
  --status-yellow: #ffd332;
  --status-green: #36b300;
  --status-blue: #00ace6;
  --status-purple: #9e00b3;

  --text-color: var(--color-gray);
  --link-color: var(--primary-blue);
  --link-hover-color: var(--shadow-blue);
  --disabled-color: var(--gray-200);
  --page-background: #f7f7f7;
  --footer-background: var(--color-gray);

  --focus-color: var(--gray-200);

  --border-color: var(--gray-400);
  --border-color-light: var(--gray-200);
  --border-color-dark: var(--gray-600);
}
```

## Icons

Load Google Material Symbols when the project uses iconography.

```html
<head>
  <title>Your App</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,300,0,0"
    rel="stylesheet"
  />
</head>
```

Example usage:

```html
<span class="material-symbols-outlined" aria-hidden="true">search</span>
<span class="material-symbols-outlined" aria-hidden="true">rocket_launch</span>
<span class="material-symbols-outlined" aria-hidden="true">hearing</span>
<span class="material-symbols-outlined" aria-hidden="true">handshake</span>
<span class="material-symbols-outlined" aria-hidden="true">bug_report</span>
```
