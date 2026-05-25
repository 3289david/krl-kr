## Overview

OpenCode's marketing site is rendered entirely in Berkeley Mono — every word on the page, from the 38px hero headline down to the 14px footer fine print, sits in the same monospaced face. The visual identity comes from that single typographic decision: the page reads like a manpage or a static-site README, complete with bracketed `[+]` / `[-]` / `[x]` ASCII markers used in place of icons or bullets, and a wordmark rendered as block-pixel ASCII art at the top of the nav. There is no sans-serif anywhere, no display face, no italics, no decorative ornament — the system is one font and one weight away from being a 1990s `whatis` page rendered at modern resolutions.

The chrome is austere: warm cream canvas (`{colors.canvas}` — `#fdfcfc` with a faint blush), nearly-black ink (`{colors.ink}` — `#201d1d`), and a 4-tier neutral gray ladder for body, metadata, and disabled text. Cards don't exist as raised surfaces — sections are just hairline-bordered text blocks (`{colors.hairline}` 1px) sitting directly on the canvas with `{spacing.section}` (96px) air between them. The single "visual" moment in the entire system is a full-bleed dark hero card (`{colors.surface-dark}` — true near-black) that mocks up the OpenCode TUI itself: a terminal frame with `tab` / `ctrl-p` keybinding hints, a "Build" command line, and the OpenCode wordmark rendered as a pixel-block ASCII title.

The semantic palette is unusual for a brand-marketing site: it ships the full Apple Human Interface Guidelines accent ramp — `{colors.accent}` (Apple Blue `#007aff`), `{colors.danger}` (`#ff3b30`), `{colors.warning}` (`#ff9f0a`), `{colors.success}` (`#30d158`) plus their hover/active deepenings — even though the marketing surfaces themselves only use these colors in the dark hero TUI mockup as syntax-highlight stand-ins. The wider palette belongs to the in-product TUI; the marketing pages mostly stay in monochrome.

**Key Characteristics:**
- 100% Berkeley Mono typography across every text role — no sans-serif fallback anywhere in the chrome
- Warm cream `{colors.canvas}` (#fdfcfc) as the only body background — no surface alternation across sections
- Single dark surface (`{colors.surface-dark}` — #201d1d) reserved exclusively for the hero TUI mockup
- 4px radius (`{rounded.sm}`) on every interactive element; sections themselves are sharp rectangles bordered in 1px hairline
- ASCII bracket markers (`[+]`, `[-]`, `[x]`) used as bullet glyphs in feature lists and FAQ rows
- Block-pixel ASCII wordmark in the primary nav and inside the hero TUI — the brand identity is its own ASCII art
- 96px `{spacing.section}` rhythm between every section, with no decorative dividers; only thin 1px `{colors.hairline}` rules separate content blocks

## Colors

> **Source pages:** `/` (home), `/zen`, `/enterprise`. The chrome palette is identical across all three.

### Brand & Accent
- **Ink** (`{colors.primary}` / `{colors.ink}` — `#201d1d`): the brand's only "color." Headlines, body text, primary CTA fill, nav links, and every solid icon. Treats nearly-black as the brand color rather than pure black to keep type readable on the warm cream canvas.
- **Ink Deep** (`{colors.ink-deep}` — `#0f0000`): pressed-state for the primary CTA. Carries a faint red undertone matching the canvas's warm cast.
- **Cream** (`{colors.canvas}` — `#fdfcfc`): the brand's signature warm white. Used for every page body, every card surface, the on-primary text color, and the ASCII wordmark fill on dark.

### Surface
- **Canvas Cream** (`{colors.canvas}` — `#fdfcfc`): every page body, every card.
- **Soft Surface** (`{colors.surface-soft}` — `#f8f7f7`): text-input default background, testimonial row fill, alternating row tint.
- **Surface Card** (`{colors.surface-card}` — `#f1eeee`): install-snippet pill, disabled button fill, slightly-elevated section row.
- **Surface Dark** (`{colors.surface-dark}` — `#201d1d`): the hero TUI mockup background and the dark CTA pill on the home page. Identical to `{colors.ink}` — the brand uses one near-black for both text and dark surfaces.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — `#302c2c`): the prompt-row inside the hero TUI mockup, one notch lighter than the dark surface itself.
- **Hairline** (`{colors.hairline}` — `rgba(15,0,0,0.12)`): 1px section divider. The translucent warm tint matches the cream canvas's undertone.
- **Hairline Strong** (`{colors.hairline-strong}` — `#646262`): tab strip's bottom rule and stronger inline divider.

### Text
- **Ink** (`{colors.ink}` — `#201d1d`): headlines, body text, primary nav links, button text on light surfaces.
- **Charcoal** (`{colors.charcoal}` — `#302c2c`): subtly softer body where pure ink is too heavy.
- **Body** (`{colors.body}` — `#424245`): default paragraph text and FAQ answers.
- **Mute** (`{colors.mute}` — `#646262`): tab labels (default state), metadata, footer link text, in-list secondary annotations.
- **Stone** (`{colors.stone}` — `#6e6e73`): least-emphasis utility text, breadcrumb separators.
- **Ash** (`{colors.ash}` — `#9a9898`): disabled text and secondary annotation in dark TUI mockup, also TUI mockup secondary color.

### Semantic
The full Apple Human Interface Guidelines semantic ramp ships with the system. On marketing pages these colors appear primarily inside the hero TUI mockup as syntax-highlight stand-ins; in the in-product TUI they carry their conventional meaning.

- **Accent** (`{colors.accent}` — `#007aff`): primary informational signal, in-product link color, TUI command highlight.
- **Accent Hover** (`{colors.accent-hover}` — `#0056b3`): pressed informational link.
- **Accent Active** (`{colors.accent-active}` — `#004085`): deeply-pressed informational state.
- **Danger** (`{colors.danger}` — `#ff3b30`): destructive confirmation, error state.
- **Danger Hover** (`{colors.danger-hover}` — `#d70015`): pressed destructive.
- **Danger Active** (`{colors.danger-active}` — `#a50011`): deeply-pressed destructive.
- **Warning** (`{colors.warning}` — `#ff9f0a`): caution callouts.
- **Warning Hover** (`{colors.warning-hover}` — `#cc7f08`): pressed caution.
- **Warning Active** (`{colors.warning-active}` — `#995f06`): deeply-pressed caution.
- **Success** (`{colors.success}` — `#30d158`): positive confirmation, in-TUI success indicator.

## Typography

### Font Family
**Berkeley Mono** is the proprietary monospaced face used across every text role in the system. It carries weights 400 (regular), 500 (medium), and 700 (bold) and falls back through a long monospace stack — IBM Plex Mono → ui-monospace → SFMono-Regular → Menlo → Monaco → Consolas → Liberation Mono → Courier New.

The single-font decision is the brand. There is no display face, no body sans, no italic alternative, and no fallback to a proportional font anywhere — even the legal copyright row uses Berkeley Mono at 14px. This is the most aggressive typographic restraint of any site in the marketing-tools category: OpenCode's identity is "the marketing page is a man page."

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 38px | 700 | 1.5 | 0 | Hero headline ("The open source AI coding agent") |
| `{typography.heading-md}` | 16px | 700 | 1.5 | 0 | Section label ("What is OpenCode?", "FAQ", "Built for privacy first") |
| `{typography.body-md}` | 16px | 400 | 1.5 | 0 | Body copy, paragraph text, list-row text, install-snippet code |
| `{typography.body-strong}` | 16px | 500 | 1.5 | 0 | Inline emphasis, primary nav link, tab-label active |
| `{typography.body-tight}` | 16px | 500 | 1 | 0 | Compact label rendered without breathing room |
| `{typography.link-md}` | 16px | 400 | 1.5 | 0 | Inline anchor link in body prose |
| `{typography.button-md}` | 16px | 500 | 2 | 0 | Every button label across the system |
| `{typography.caption-md}` | 14px | 400 | 2 | 0 | Footer link text, badge label, copyright row, chart caption |

### Principles
The hierarchy is built almost entirely from size and weight contrast on a single face. The display headline (38px / 700) and the heading-md label (16px / 700) share a weight; the difference is just size. Body and link share size, weight, and line-height — only context distinguishes them. Buttons get a deliberately tall line-height (2.0) so labels feel calmly spaced inside the 4px-radius rectangle.

### Note on Font Substitutes
Berkeley Mono is a paid commercial font. Open-source substitutes that approximate its metrics within ~3% at body sizes:
- **JetBrains Mono** — closest match for stroke contrast and x-height; pair at weights 400 / 500 / 700.
- **IBM Plex Mono** — official secondary fallback in the documented font stack; slightly more open counters but matches line-height behavior.
- **Geist Mono** — modern alternative with similar geometric construction.

When substituting, line-height behavior is preserved by keeping `lineHeight: 1.5` for body and `lineHeight: 2` for buttons — adjusting weight is rarely needed.

## Layout

### Spacing System
- **Base unit:** 8px (with finer 1/2/4px steps available for tight inline gaps).
- **Tokens (front matter):** `{spacing.xxs}` (1px) · `{spacing.xs}` (4px) · `{spacing.sm}` (8px) · `{spacing.md}` (12px) · `{spacing.lg}` (16px) · `{spacing.xl}` (24px) · `{spacing.xxl}` (32px) · `{spacing.section}` (96px).
- **Universal section rhythm:** every page in the set uses `{spacing.section}` (96px) as the vertical gap between major content blocks. This is the largest spacing token in the system and is the dominant layout cue across the home, `/zen`, and `/enterprise` pages.
- **Section internal padding:** content rows inside a section sit at `{spacing.lg}` (16px) vertical with no horizontal padding — text starts flush at the section's left edge.

### Grid & Container
- **Max width:** ~960px content column for body sections; the dark hero TUI mockup is full-bleed within an outer ~1100px content frame.
- **Two-column split:** `/enterprise` pairs a left text block (~360px wide) with a right-aligned form column (~480px wide). The home page is single-column reading.
- **Footer:** 5-up horizontal link row (GitHub / Docs / Changelog / Discord / X) at desktop, collapsing to 2-up at tablet and 1-up at mobile.

### Whitespace Philosophy
Whitespace is structural and generous. Sections sit 96px apart with no decorative dividers between them — the `{colors.hairline}` 1px rule is the only signal of separation. Inside a section, content is left-flush against the column edge with no internal indentation; bullets use ASCII bracket prefixes (`[+]` / `[-]`) instead of indent-based layout. The result is a page that feels like a printed code listing rather than a styled marketing layout.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No border, no shadow | Default for body sections, list rows, hero text block, footer |
| 1 — Hairline rule | 1px solid `{colors.hairline}` (translucent warm tint) | Section dividers, between major content blocks |
| 2 — Hairline strong | 1px solid `{colors.hairline-strong}` | Tab strip bottom rule, in-list emphasized divider |
| 3 — Inverted dark | `{colors.surface-dark}` fill | Hero TUI mockup, dark CTA pill — the system's only "elevated" surface uses color, not shadow |

There are no drop shadows in the system. Nothing lifts, nothing floats. The only way an element registers as "above" another is the dark surface used in the hero mockup.

### Decorative Depth
Depth comes from typography density and the single dark TUI mockup, not from CSS effects:
- **ASCII block-pixel wordmark** — the OpenCode brand name rendered as a 5-row block of monospaced character cells, used in the primary nav and as the centerpiece of the hero TUI mockup.
- **Hero TUI mockup** — full-bleed `{colors.surface-dark}` rectangle containing a faux terminal interface: ASCII wordmark, a `tui-prompt-row` showing a Build command line, and `tab switch agent` / `ctrl-p commands` keybinding hints in `{colors.ash}` at the bottom edge.
- **Chart tiles** — three thin-line ASCII charts inside the home page's "open source AI coding agent" stat block, with abstract dotted/sparse-line plots in `{colors.body}` against the cream canvas. Captions sit beneath in `{typography.caption-md}` (`Fig 1. 150K GitHub Stars`, `Fig 2. 850 Contributors`, `Fig 3. 6.5M Monthly Devs`).

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Sections, hero TUI mockup, primary nav, footer, list rows — every container that isn't a button |
| `{rounded.sm}` | 4px | Every interactive element — primary CTA, secondary CTA, text inputs, install snippet, badges, prompt rows |
| `{rounded.full}` | 9999px | Avatar circles in testimonials |

The radius vocabulary is two values: 4px for interactive elements and 0px for everything else. Avatar circles in testimonial rows are the only fully-rounded element in the system.

### Photography Geometry
There is no photography. Visual elements are limited to:
- **ASCII block-pixel wordmark** in the nav and hero TUI mockup.
- **Inline ASCII charts** inside the stat-block section — abstract sparse-line and dotted plots without specific data points.
- **Avatar dots** (~32px) inside testimonial rows on `/zen` — flat colored circles in `{rounded.full}`.
- **In-product icons** (kbd, A+, ⊕, ↻, K, Z) rendered as small monospaced character glyphs, not bitmaps or SVG.

## Components

> **No hover states documented** per system policy. Each spec covers Default and Active/Pressed only.

### Buttons

**`button-primary`** — the universal OpenCode CTA
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}`, padding `4px 20px`, height ~36px, rounded `{rounded.sm}` (4px).
- Used for "Download" (top nav), "Get started with Zen", "Send" (enterprise contact form), "Subscribe" (newsletter footer), "Read docs →".
- Pressed state lives in `button-primary-active` — background drops to `{colors.ink-deep}`.

**`button-secondary`** — outlined alternative
- Background `{colors.canvas}`, text `{colors.ink}`, 1px solid `{colors.hairline-strong}` border, type `{typography.button-md}`, padding `4px 20px`, rounded `{rounded.sm}`.
- Lower-emphasis CTA — appears beside the primary fill where two actions are paired.

**`button-tab`** + **`button-tab-active`** — install-tab strip
- Default: transparent background, text `{colors.mute}`, type `{typography.button-md}`, padding `8px 16px`, rounded `{rounded.none}`.
- Active: same surface, text `{colors.ink}`, with a 2px `{colors.ash}` bottom underline indicating selection.
- Used in the install-method tab strip on the home page (`curl` / `npm` / `bun` / `brew` / `yay`).

**`button-disabled`**
- Background `{colors.surface-card}`, text `{colors.ash}`, rounded `{rounded.sm}`.

### Badges & Chips

**`badge-news`** — small dark chip in the news/announcement strip
- Background `{colors.surface-dark}`, text `{colors.on-dark}`, type `{typography.caption-md}`, padding `2px 8px`, rounded `{rounded.sm}`.
- Sits inline with body copy as a "News" / "Beta" / "Live now" tag on the home page above the hero headline.

**`badge-section-label`** — bracketed section header
- Background transparent, text `{colors.ink}`, type `{typography.heading-md}`, rounded `{rounded.none}`.
- Renders as a bare `**Heading**` line above a 1px `{colors.hairline}` rule with no chip background — but the way the text reads ("[+]", "[x]", `What is OpenCode?`) makes it function as a label component.

### Inputs & Forms

**`text-input`** + **`text-input-focused`**
- Default: background `{colors.surface-soft}`, text `{colors.ink}`, 1px solid `{colors.hairline}`, type `{typography.body-md}`, padding `8px 12px`, height ~40px, rounded `{rounded.sm}`.
- Focused: background flips to `{colors.canvas}`, border becomes 1px solid `{colors.ink}` (the canvas's flat focus signal — no halo, no glow).
- Used for every contact-form field on `/enterprise` (Full name, Role, Company, Company email, Phone number) and the newsletter email field at the home page footer.

**`textarea`**
- Background `{colors.surface-soft}`, text `{colors.ink}`, 1px solid `{colors.hairline}`, type `{typography.body-md}`, padding `12px`, rounded `{rounded.sm}`.
- "What problem are you trying to solve?" multi-line textarea on `/enterprise`.

**`install-snippet`** — the home page's signature install code block
- Background `{colors.surface-card}` (`#f1eeee`), text `{colors.ink}` rendered in `{typography.body-md}` (already monospaced — Berkeley Mono), padding `12px 16px`, rounded `{rounded.sm}`.
- Contains the literal `curl -fsSL https://opencode.ai/install | bash` command with a small copy-icon at the right edge. Sits below the install-method tab strip.

### Cards & Containers

**`hero-tui-mockup`** — the home page's signature TUI preview
- Container: full-bleed `{colors.surface-dark}` (~near-black), padding `64px 32px`, rounded `{rounded.none}`.
- Contents (top → bottom): ASCII block-pixel "OPENCODE" wordmark centered in `{colors.on-dark}`; a `{component.tui-prompt-row}` showing a "Build" command line with model selector text; an `tab switch agent  ctrl-p commands` keybinding hint row at the bottom in `{colors.ash}`.

**`tui-prompt-row`** — the inset command line inside the TUI mockup
- Background `{colors.surface-dark-elevated}` (`#302c2c`), text `{colors.on-dark}` in `{typography.body-md}`, padding `8px 12px`, rounded `{rounded.sm}`.
- Renders an inline command (`Build  Claude Opus 4.5  OpenCode Zen`) with a leading vertical pipe and the model name styled as a bracketed token.

**`list-row`** — feature/benefit row with ASCII bracket bullet
- Background `{colors.canvas}`, text `{colors.body}` in `{typography.body-md}`, padding `8px 0`.
- Each row begins with a `[+]` / `[-]` / `[x]` ASCII marker followed by a bold label and a regular description: e.g., `[+] LSP enabled    Automatically loads the right LSPs for the IDE`. The bracket marker is part of the text content, not a separate icon.

**`faq-row`** — FAQ entry with bracket toggle
- Background `{colors.canvas}`, text `{colors.ink}` in `{typography.body-md}`, padding `12px 0`, with a 1px `{colors.hairline}` bottom rule.
- Each row leads with `+` / `−` ASCII markers indicating expand/collapse state. Always rendered as plain text rows — no chevron icons, no animated accordion chrome.

**`testimonial-row`** — `/zen` peer-quote row
- Background `{colors.surface-soft}`, text `{colors.body}` in `{typography.body-md}`, padding `16px 20px`, rounded `{rounded.sm}`.
- Layout: a 32px avatar circle (`{rounded.full}`) at left, name + role + company in `{typography.body-strong}` on the first line, quote in `{typography.body-md}` `{colors.body}` on the second line.

**`chart-tile`** — the stat-block sparse-line chart
- Background `{colors.canvas}`, text `{colors.body}` in `{typography.caption-md}`, rounded `{rounded.none}`, padding `16px`.
- Contains an inline SVG/CSS-drawn ASCII-style sparse-line plot (dotted, abstract — never specific data points) with a `Fig N. <stat label>` caption beneath in `{colors.mute}`.

### Navigation

**`primary-nav`**
- Background `{colors.canvas}`, text `{colors.ink}` in `{typography.body-strong}`, height ~56px, rounded `{rounded.none}`, with a 1px `{colors.hairline}` bottom rule.
- Layout (desktop): block-pixel ASCII OpenCode wordmark at left (~120×24px), nav links cluster center-right ("GitHub [150K] · Docs · Zen · Go · Enterprise"), `{component.button-primary}` "Download" CTA at the far right with a small download glyph.

**Top Nav (Mobile)**
- ASCII wordmark stays at left, nav links collapse into a hamburger drawer at the right. The Download CTA remains visible at every breakpoint.

### Footer

**`footer-section`**
- Background `{colors.canvas}`, text `{colors.body}` in `{typography.caption-md}`, padding `32px 0`, with a 1px `{colors.hairline}` top rule.
- Top row: 5-column horizontal link grid (GitHub [150K] · Docs · Changelog · Discord · X), each rendered as a centered cell separated by 1px `{colors.hairline}` vertical rules.
- Bottom row: `©2026 Anomaly` copyright at left, `Brand · Privacy · Terms · English ▼` utility cluster at right, all in `{typography.caption-md}` `{colors.mute}`.

### Inline

**`link-inline`** — body-prose anchor link
- `{colors.ink}` text with underline. The brand's only link affordance — even links inside body paragraphs use ink color rather than `{colors.accent}` blue. Apple Blue is reserved for the in-product TUI.

## Do's and Don'ts

### Do
- Render every text role in Berkeley Mono. The single-font decision is the entire identity.
- Keep `{colors.canvas}` (`#fdfcfc`) as the only body background. Don't introduce gray section bands.
- Use ASCII bracket markers (`[+]`, `[-]`, `[x]`, `+`, `−`) as bullets, toggles, and section glyphs. They are the brand's only iconography.
- Anchor the dark `{component.hero-tui-mockup}` exactly once per landing page as the hero centerpiece. Never use the dark surface for body content.
- Reserve `{colors.accent}` (Apple Blue) and the rest of the semantic ramp for in-TUI states; marketing chrome stays monochrome.
- Use `{rounded.sm}` (4px) on every interactive element and `{rounded.none}` (0px) on every container.
- Stack content sections at `{spacing.section}` (96px) rhythm with only 1px `{colors.hairline}` rules between them.

### Don't
- Don't introduce a sans-serif body font, a display face, or an italic style. Berkeley Mono carries everything.
- Don't add drop shadows, gradients, or atmospheric backgrounds. The system is flat-on-cream.
- Don't replace the ASCII bracket markers with SVG icons. The brackets are the icons.
- Don't use the semantic accent ramp (`{colors.accent}`, `{colors.warning}`, `{colors.danger}`, `{colors.success}`) on marketing CTAs. They belong to the in-product TUI.
- Don't pad cards with 24px+ internal padding. List rows sit at 8px vertical; FAQ rows at 12px.
- Don't render the OpenCode wordmark as a vector logo. It is always block-pixel ASCII.
- Don't fill the hero TUI mockup with photography or illustration. It is text-only and always shows a faux terminal command line.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| desktop-large | 1280px+ | Default — 960px content column, 5-up footer link grid |
| desktop | 1024px | Same layout; nav remains horizontal |
| tablet | 850px | Footer collapses to 2-up grid; `/enterprise` two-column form stacks |
| tablet-narrow | 768px | Primary nav becomes hamburger drawer; Download CTA stays visible |
| mobile | 640px | Single-column everything; hero display drops 38px → ~28px; section padding tightens |

### Touch Targets
All interactive elements meet WCAG AA at the ~36–40px height range. `{component.button-primary}` sits at ~36px with 20px horizontal padding. `{component.text-input}` and `{component.textarea}` sit at ~40px. `{component.button-tab}` rows in the install-method strip sit at ~32–36px depending on label length but extend to a full 44px tappable cell via inline padding. Footer links use `{typography.caption-md}` (14px) but receive ~28px line-height (caption-md is 2.0) plus 8px vertical padding for a comfortable ~44px tappable row.

### Collapsing Strategy
- **Primary nav:** desktop horizontal cluster → tablet-narrow hamburger drawer at 768px. The dark "Download" CTA stays visible at all widths.
- **Hero TUI mockup:** maintains its full-bleed dark surface at every breakpoint; the ASCII wordmark scales proportionally and the keybinding-hint row may wrap to two lines on narrow screens.
- **Install snippet + tab strip:** desktop fixed-width pill → mobile full-width pill with horizontal scroll on the tab strip if labels overflow.
- **Footer:** 5-up horizontal link grid → 2-up at tablet → 1-up at mobile (each link becomes a full-width row).
- **`/enterprise` two-column layout:** desktop 50/50 → tablet stacks to single-column with the form below the text block.
- **Section padding:** `{spacing.section}` (96px) desktop → 64px tablet → 48px mobile.
- **Hero headline:** `{typography.display-xl}` (38px) at desktop, scaling to ~28px at mobile, line-height holding at 1.5.

### Image Behavior
There are no raster images in the system aside from the favicon and OG share image. Every visual element — wordmarks, charts, icons — is rendered as type or inline SVG and scales without aspect-ratio considerations.

## Iteration Guide

1. Focus on ONE component at a time. Pull its YAML entry and verify every property resolves.
2. Reference component names and tokens directly (`{colors.ink}`, `{component.hero-tui-mockup}`, `{rounded.sm}`) — do not paraphrase.
3. Run `npx @google/design.md lint DESIGN.md` after edits — `broken-ref`, `contrast-ratio`, and `orphaned-tokens` warnings flag issues automatically.
4. Add new variants as separate component entries (`-active`, `-disabled`) — do not bury them inside prose.
5. Default body to `{typography.body-md}`; reach for `{typography.body-strong}` for emphasis; reserve `{typography.display-xl}` strictly for the page-top hero headline.
6. Keep `{colors.surface-dark}` scarce — at most one full-bleed dark mockup per page. The dark surface is a narrative device, not a chrome treatment.
7. When introducing a new component, ask whether it can be expressed with the existing ASCII-bracket + 4px-radius + Berkeley-Mono vocabulary before adding new tokens. The system's strength is that it almost never needs new ones.

## Known Gaps

- **Mobile screenshots not captured** — responsive behavior synthesizes OpenCode's mobile pattern (hamburger drawer, single-column, footer accordion) from desktop evidence and the breakpoint stack.
- **Hover states not documented** by system policy.
- **In-product TUI screenshots** beyond the marketing hero mockup are not in the captured set; the actual `opencode` terminal interface (full keybindings, panels, status bar) is not documented here.
- **`/go` page** not extracted — the marketing page for the Go SDK likely shares the same chrome but introduces code-sample blocks not documented above.
- **Form validation state styling** (success / error inline messages) not present in the captured surfaces.


# Design System Inspired by Mastercard

## 1. Visual Theme & Atmosphere

Mastercard's experience reads like a warm, editorial magazine built from soft stone and signal orange. The canvas is a muted putty-cream (`#F3F0EE`) — not white, not gray, but a color that feels like the paper of a premium annual report. On top of that canvas, everything that matters is shaped like a stadium, a pill, or a perfect circle. The dominant visual gesture is the **oversized radius**: heroes carry 40-point corners, cards go fully pill-shaped, service images are cropped into circular orbits, and buttons either complete the pill or fit snugly at 20 points. There are almost no sharp corners anywhere on the page.

The second gesture is **orbit and trajectory**. Circular image masks don't sit still — they're connected by thin, hand-drawn-feeling orange arcs that span entire viewport widths, implying a constellation of services rather than a list. Each circle has a small attached "satellite" — a white micro-CTA holding an arrow icon — docked onto its perimeter like a moon. This is the most distinctive thing about Mastercard's current design language: the circles feel like they're in motion even though the page is still.

Typography is rendered entirely in **MarkForMC**, Mastercard's proprietary geometric sans. Headlines are set at a medium weight (500) with tight negative letter-spacing (-2%), giving them confidence without shouting. Body copy runs at the same family in a slightly lighter weight (450) — a weight you rarely see on the web, chosen because it reads softer than regular 400 without feeling thin. The whole system — warm cream surfaces, pill shapes, circular portraits, traced-orange orbits, black CTAs — feels simultaneously institutional (a 60-year-old payments network) and editorial (a modern brand magazine), which is exactly the tension Mastercard wants to hold.

**Key Characteristics:**
- Warm cream canvas (`#F3F0EE`) replaces traditional white — every surface is tinted, never sterile
- Extreme border-radius as design language: 40px, 99px, 1000px dominate; anything square is a cookie-banner third-party
- Circular image portraits with attached white satellite-CTAs and traced-orange orbital paths
- Ghost "watermark" headlines (cream-on-cream text at heading scale) layered behind circle portraits
- Black primary CTAs with 20px radius in the body — the cookie-banner orange is kept to consent flows
- Floating pill-shaped navigation that docks below the viewport top with rounded shoulders
- Eyebrow labels with a tiny accent dot + uppercase bold tracking — used as the section-category signal
- Dark warm-black footer (`#141413`) with four-column link layout and large conversational headline

## 2. Color Palette & Roles

### Primary
- **Mastercard Red** (`#EB001B`): The left circle of the Mastercard mark — used only in the brand logo, never as a UI color.
- **Mastercard Yellow** (`#F79E1B`): The right circle of the Mastercard mark — used only in the brand logo, never as a UI color.
- **Ink Black** (`#141413`): The warm near-black used for primary CTAs, headline text on cream, and the footer surface. Slightly warm (the `13` blue value pulls toward the cream) so it never feels jet-black on the warm canvas.

### Secondary & Accent
- **Signal Orange** (`#CF4500`): The burnt/rust CTA orange used on consent actions and eyebrow dots. Deeper than the brand yellow, brighter than ink — it's the page's single aggressive color and must be used sparingly.
- **Light Signal Orange** (`#F37338`): A lighter carroty orange used for carousel active indicators and decorative orbital arcs. Always acts as an attention cue, never as body color.
- **Clay Brown** (`#9A3A0A`): The deep rust used for secondary link-style buttons (e.g., cookie details). Sits between ink and signal orange.

### Surface & Background
- **Canvas Cream** (`#F3F0EE`): The page canvas. Warm, putty-toned, the default body background. All editorial sections sit on this.
- **Lifted Cream** (`#FCFBFA`): One step lighter than canvas — used for nested "raised" sections that want to feel like paper laid on paper.
- **White** (`#FFFFFF`): Reserved for the floating navigation pill, modal cards, secondary button fills, and small satellite-CTA circles attached to image portraits.
- **Soft Bone** (`#F4F4F4`): A cool-gray alternative surface used inside a handful of component subregions.

### Neutrals & Text
- **Ink Black** (`#141413`): Primary headline and body text color.
- **Charcoal** (`#262627`): A slightly softer black used for some text alternates.
- **Slate Gray** (`#696969`): Muted secondary text — eyebrow label alternative, disabled states, "Privacy Choices" bottom-row text.
- **Granite** (`#555555`) and **Graphite** (`#565656`): Deeper gray for inline body accents and link alternates.
- **Dust Taupe** (`#D1CDC7`): Very muted cream-gray used for disabled or "whisper" text (e.g., placeholder-like empty state labels). Low contrast on cream; use only for subdued content.

### Semantic & Accent
- **Link Blue** (`#3860BE`): A deep, slightly dusty blue used for inline links and informational callouts. Saturated enough to read as a link without being neon.
- **Priceless Red + Yellow**: The full-color Mastercard logo mark is the only place the brand's red and yellow appear together; they lock the identity to the page without acting as a UI palette.

### Gradient System
Mastercard uses no programmatic gradients in the core UI. The visual impression of "gradient" comes from two places:
- **Circular image portraits** where a warm-orange photo subject (a card, a sunflower, a beverage) fades to the cream canvas at its edge
- **Deep card shadows** on elevated content (`rgba(0,0,0,0.08) 0px 24px 48px`) that create a soft halo beneath pill-shaped media

## 3. Typography Rules

### Font Family
- **Primary**: `MarkForMC` — Mastercard's proprietary geometric sans. Every headline, body paragraph, button, nav link, and footer link on the page.
- **Secondary**: `MarkOffcForMC` — an "Official" cut used in a minority of contexts (legal text, some forms).
- **Fallback stack**: `SofiaSans, Arial, sans-serif` — Sofia Sans is a reasonable open-source stand-in; Arial is the final web-safe fallback.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|--------|-------------|----------------|-------|
| H1 (hero) | 64px | 500 | 64px | -1.28px (-2%) | Set to `1:1` line-height for very tight vertical rhythm on multi-line hero |
| H2 (section) | 36px | 500 | 44px | -0.72px (-2%) | Used in ghost-watermark headline treatments and section titles |
| H3 (card title) | 24px | 500 | 28.8px (1.2) | -0.48px (-2%) | Titles inside service/solution cards |
| H4 (subhead) | 14px | 700 | 18.2px (1.3) | normal | Rarely used in marketing surfaces |
| Eyebrow (H5) | 14px | 700 | 14px | 0.56px (+4%) | Uppercase, paired with a tiny accent dot (e.g., "• SERVICES") |
| Body paragraph | 16px | 450 | 22.4px (1.4) | normal | The half-step 450 weight is MarkForMC's signature — softer than 500, firmer than 400 |
| Nav link / Button label | 16px | 500 | 16px | -0.48px (-3%) | Tight, compact, no text-transform |
| Footer link | 14px | 450 | ~20px | normal | Lighter weight on dark footer for airier density |
| Footer column header | 12–14px | 700 | 14px | 0.56px (+4%) | Uppercase, muted gray, short tracking |

### Principles
- **Weight 450 is load-bearing**. Most brands use 400/500/700; Mastercard uses 450 for body copy, which creates an unusually soft reading tone. Replacing it with 400 flattens the identity.
- **Tight negative tracking on headlines** (-2%) gives display text its editorial density — the words lock together rather than breathe.
- **Uppercase tracking only on the eyebrow scale** (14px / 700 / +4% tracking). Don't use uppercase anywhere else; no shouty section titles.
- **One-font system**. Resist the urge to add a second typeface for contrast. The contrast comes from scale, weight, and letter-spacing, not from a serif or display accent.
- **Line-height ratio drops with size**. H1 is 1:1, H3 is 1.2, body is 1.4. Tight display, comfortable reading.

### Note on Font Substitutes
MarkForMC is proprietary and licensed. When rebuilding a matching aesthetic without access to the original:
- **Sofia Sans** (Google Fonts) is the closest open-source match — it's already in Mastercard's declared fallback stack.
- **Inter** at weights 450/500/700 works as a generic stand-in; expect slightly taller x-height and looser letter shapes.
- **Neue Haas Grotesk** or **Geist** can approximate the geometric feel for commercial projects.
- Whichever substitute is used, preserve the **-2% letter-spacing on headlines** and the **450 body weight** (use `font-weight: 450` with variable fonts, or substitute `font-weight: 400` and tighten the letter-spacing by ~-0.5% to compensate).

## 4. Component Stylings

### Buttons

**Primary — Ink Pill**
- Background: Ink Black (`#141413`)
- Text: Canvas Cream (`#F3F0EE`) — not pure white
- Border: 1.5px solid Ink Black (same as bg, creates crisp edge)
- Radius: 20px
- Padding: 6px 24px
- Font: MarkForMC 16px / weight 500 / letter-spacing -0.32px
- Default: as above; solid warm-black pill on cream canvas
- Active / pressed: subtle inward-shrink or 2px offset (not a hover variant)
- Use for: all marketing CTAs in the page body ("Learn more", "Explore", "Discover")

**Secondary — Outlined Pill**
- Background: White (`#FFFFFF`)
- Text: Ink Black (`#141413`)
- Border: 1.5px solid Ink Black
- Radius: 20px
- Padding: 6px 24px
- Font: MarkForMC 16px / weight 450 / line-height 20.8px
- Default: white-on-cream pill with crisp ink outline
- Active / pressed: subtle compression
- Use for: secondary actions paired with a primary, or standalone utility CTAs

**Consent / Signal — Orange Pill**
- Background: Signal Orange (`#CF4500`)
- Text: White (`#FFFFFF`)
- Border: 0
- Radius: 24px
- Padding: 1px 30px (very tight vertical, wide horizontal)
- Font: MarkForMC 13px / weight 400 / letter-spacing 0.13px
- Default: as above; bright rust pill with white text
- Use for: cookie consent, privacy preference, and other legally-distinct confirmations. **Do not** use this orange for marketing CTAs — it reads as a compliance color.

**Satellite — Circular Micro-CTA**
- Background: White (`#FFFFFF`)
- Icon: Ink Black arrow (`→`) at ~20px
- Border: none
- Radius: 50% (perfect circle)
- Size: ~50–60px diameter
- Shadow: none or very subtle (the portrait's shadow carries the elevation)
- Default: docks onto the bottom-right edge of a circular portrait, protruding partway outside the portrait's circle
- Use for: the primary entry point into service/solution cards; always paired with a circular portrait

**Icon-Only Circle Button (carousel, play/pause)**
- Background: transparent or white
- Icon: 10–20px centered
- Border: 1px solid Ink Black (when on cream) or none (when over media)
- Radius: 50%
- Size: 40px diameter minimum for carousel controls; 80px for hero video play
- Use for: carousel pagination/play-pause, hero video play, search toggle

### Cards & Containers

**Hero Media Frame (Stadium)**
- Background: Dark video or full-bleed imagery (typically black `#000000` or `#2B2B2B` behind video)
- Radius: 40px all corners (creates a stadium shape on wide viewports)
- Width: ~full viewport minus ~48px gutter on each side
- Height: ~60–70% of viewport
- Shadow: none (sits directly on canvas)
- Corners: the extreme 40px radius on a media element is the most iconic Mastercard gesture — do not round less

**Service / Solution Portrait Card**
- Shape: Perfect circle (radius 50%) or ellipse (radius 999px / 1000px)
- Diameter: 260–340px desktop; ~220px mobile
- Image crop: square source, cropped to circle
- Attached element: White satellite circular CTA (see above) docked bottom-right, ~40% outside the portrait
- Eyebrow below: accent dot + uppercase label (e.g., "• SERVICES", "• SOLUTIONS")
- Title below: H3 (24px / weight 500 / -2% tracking), 1–2 lines max
- Decorative orbit: thin ~1px Light Signal Orange curved line spanning from this card outward to the next, implying connection

**Pill Carousel Card**
- Radius: 1000px (full pill) or 40px corners (rounded stadium)
- Width: ~40–60% of viewport
- Height: ~380–420px (portrait-pill orientation)
- Content: full-bleed photography with small overlaid chip labels
- Chip inside: White pill (~ 999px radius), Ink Black text, padding 8px 20px, used for category tags like "Story"
- Large inline CTA inside: Ink Pill button, oversized (padding 16px 40px, radius 40px)

**Ghost Watermark Text Block**
- Font: MarkForMC 72–128px / weight 500 / tight -2% tracking
- Color: Canvas Cream slightly darkened (`#E8E2DA` or similar — cream-on-cream)
- Position: layered behind portrait circles, bleeding off the viewport edge
- Purpose: sets section theme without competing with foreground copy

### Inputs & Forms
Minimal form surface on the marketing page. The search input in the nav header is:
- Initial state: a 48px circular button with a magnifier icon
- Expanded state: horizontal input field, border `1px solid` Ink Black at ~50% opacity, radius 999px, padding 12px 24px, white background

**Country/language selector (footer)**
- Background: Ink Black (same as footer)
- Text: White
- Border: 1px solid `rgba(255,255,255,0.4)`
- Radius: 999px (full pill)
- Icon: downward chevron on the right

### Navigation

**Floating Nav Pill (desktop)**
- Container: white-to-translucent-white pill floating below the very top of the viewport with a ~24px top margin
- Radius: 999px / 1000px (full pill)
- Padding: ~16px 40px internal
- Shadow: very soft (`rgba(0, 0, 0, 0.04) 0px 4px 24px 0px`) — just enough to lift it off the cream canvas
- Content: Mastercard logo left, primary link group center ("For you", "For business", "For the world", "For innovators", "News and trends"), search icon right
- Link spacing: ~48–56px gap between primary links
- Link style: Ink Black, weight 500, 16px, no underline, no pill surround until active

**Mobile Nav**
- The same pill shape but collapsed to: logo + hamburger menu button + search icon only
- Menu opens into a full-screen overlay with the primary links stacked vertically

### Image Treatment

- **Aspect ratios used**: 1:1 (all service portraits — cropped to circle), ~3:4 or ~4:5 (carousel pill cards), 16:9 or wider (hero video frame)
- **Full-bleed vs padded**: Hero is viewport-wide with gutters; service portraits are always centered in their column with generous whitespace around; footer imagery is rare
- **Masking**: Aggressive circular masking is the defining treatment — square source images are cropped to perfect circles of matching diameter. Never use rectangular service imagery.
- **Lazy loading**: Standard `loading="lazy"` with a soft blur-up transition from a cream-tinted placeholder, preserving the warm palette during load

### Decorative Orbital Lines

A signature motif: thin (~1–1.5px) single-weight curved lines in Light Signal Orange (`#F37338`) tracing arcs between circular portraits. These lines:
- Imply connection between service cards without literal arrows
- Span widths from ~200px up to full-viewport arcs
- Feel hand-drawn (subtle irregularity) rather than perfect CSS curves
- Appear only in sections with circular portrait content — never on pill sections, never in the footer

### Footer

- Background: Ink Black (`#141413`)
- Text: White
- Padding: 48px horizontal 100px / bottom 148px (very tall bottom space)
- Structure: large conversational H2 ("We're always here when you need us") left-aligned, then a 4-column link grid below
- Column headers: uppercase, muted, weight 700, letter-spacing +4%
- Link rows: white, weight 450, 14px; entries prefixed with a small icon (support bubble, card, map pin, question mark) for the "NEED HELP?" column
- External link marker: a small upper-right arrow (`↗`) after link text
- Bottom row (below a 1px white-at-opacity divider): copyright + privacy small-print + country-language pill dropdown + four social icons (LinkedIn, Facebook, X, YouTube)

## 5. Layout Principles

### Spacing System
- **Base unit**: 8px (confirmed by dembrandt extraction and computed styles)
- **Scale**: 8 / 16 / 24 / 32 / 48 / 64 / 96 / 128 (powers of 8)
- **Section vertical padding**: ~96–128px between major sections on desktop; ~48–64px on mobile
- **Card internal padding**: 32–40px on desktop, ~24px on mobile
- **Nav top margin**: ~24px from viewport top (the pill floats, doesn't touch)

### Grid & Container
- **Max content width**: ~1200–1280px centered, with ~48–100px horizontal gutter
- **Column pattern**: 12-column implied, but practical layouts use 2-up asymmetric (large headline left, supporting text right), 1-up full-bleed (hero, video), or staggered single-portrait placement (service cards sit in varying grid positions creating the "constellation" feel)
- **Footer grid**: 4 equal columns on desktop, collapses to single column accordion on mobile

### Whitespace Philosophy
Mastercard treats whitespace as structure, not absence. A typical service section has:
- A ghost headline occupying the top ~40% of the section (mostly empty cream)
- A single circular portrait positioned ~60% down, asymmetric to left or right
- ~300–500px of blank canvas between the portrait and the next section
This deliberate emptiness tells the eye "slow down, read one thing at a time" — the opposite of dense dashboard UIs.

### Border Radius Scale

| Radius | Use |
|--------|-----|
| 3–6px | Tiny decorative elements, cookie banner micro-chips |
| 20px | Primary and secondary body CTAs (the signature button radius) |
| 24px | Consent/orange pill buttons, modal inner chips |
| 40px | Hero media frames, large section container corners, H2 pill labels |
| 50% | Circular portraits, icon-only buttons, satellite CTAs |
| 99px / 999px / 1000px | Full pill shapes — navigation, carousel cards, footer country selector, primary inline chips |

The scale is unusual: most systems use 4/8/12/16. Mastercard skips those and commits to **either small (≤6), medium-large (20–40), or full-pill (99+)**. The middle ground of 8–12 is absent, which is why the UI feels either "precise and utility" or "soft and editorial" with no in-between.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | No shadow | The default — 95% of surfaces sit directly on cream canvas |
| 1 | `rgba(0, 0, 0, 0.04) 0px 4px 24px 0px` | Floating nav pill — barely-there lift |
| 2 | `rgba(0, 0, 0, 0.08) 0px 24px 48px 0px` | Hero media frames, elevated cards — a soft large-radius halo rather than a hard drop |
| 3 | `rgba(0, 0, 0, 0.25) 0px 70px 110px 0px` | Rare; dramatic elevation on a feature tile |

### Shadow Philosophy
Mastercard uses shadows as **atmospheric cushioning**, not directional light. The Level 2 shadow has a 48px spread and only 8% opacity — it barely exists as dark pixels but creates a "the card is breathing above the canvas" feel. There are almost no hard-edged, tight shadows anywhere in the system. Border lines are preferred over shadows for functional delineation (form inputs, footer divider).

### Decorative Depth
- **Orbital arcs** (Light Signal Orange, ~1px): trace connective paths across sections
- **Ghost watermark headlines**: cream-on-cream text gives sections an almost-pressed-paper quality
- **Circle-image fade**: warm-toned photography at the edge of circular portraits dissolves into the canvas, implying soft atmospheric depth

## 7. Do's and Don'ts

### Do
- Use Canvas Cream (`#F3F0EE`) as the default body background — never pure white
- Mask service/feature imagery as perfect circles, not rectangles or rounded rectangles
- Attach a white satellite CTA to the bottom-right of each circular portrait
- Set headlines in MarkForMC weight 500 with -2% letter-spacing
- Use weight 450 (not 400) for body paragraphs
- Keep primary CTAs as Ink Black pills (20px radius) with cream text
- Use Signal Orange only on consent, legal, or compliance actions
- Float the nav as a rounded white pill below the viewport top, not flush at y=0
- Build page rhythm from three surface tones: canvas cream → lifted cream → ink footer
- Use thin Light Signal Orange arcs between service cards to imply connection

### Don't
- Don't use pure white as a page background — it breaks the warm editorial tone
- Don't round image frames at 8–16px — Mastercard either uses full-pill, 40px, or full-circle. In-between radii look generic
- Don't use Signal Orange for marketing CTAs — it reads as cookie-consent orange and dilutes the legal color signal
- Don't mix typefaces — no serif accent, no script, no secondary display font
- Don't crowd the nav with more than six top-level links — the pill is meant to feel airy
- Don't drop hard shadows — all elevation should use 48px+ spread and ≤10% opacity
- Don't use uppercase for anything larger than the 14px eyebrow label
- Don't omit the tiny accent dot before eyebrow labels — it's the identity
- Don't place circular portraits on a grid — their magic comes from asymmetric placement

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | ≤ 767px | Nav pill shows logo + menu + search only; primary links hide behind hamburger; service portraits stack single-column centered; hero headline drops from 64px to ~40px; footer columns collapse into a vertical accordion |
| Tablet | 768–1023px | Nav pill shows 2–3 primary links truncated; service portraits arrange 2-up; hero headline ~48px |
| Desktop | ≥ 1024px | Full nav with 5 primary links centered; service portraits asymmetrically placed with decorative orbital lines; hero headline 64px |
| Wide | ≥ 1440px | Content max-width caps at ~1280px; gutters grow symmetrically; orbital lines extend further |

### Touch Targets
All interactive elements comfortably exceed 44×44px. The satellite CTA (circle + arrow) is ~50–60px. The nav pill buttons are ~48px tall. Mobile hamburger and search are 48×48px. No link or button drops below 40px in any breakpoint.

### Collapsing Strategy
- **Nav**: full pill → compact pill with hamburger. Pill shape is preserved across breakpoints — always rounded, always floating.
- **Service grid**: asymmetric constellation → 2-up → 1-up stack. Orbital arcs are removed on mobile (they only work with asymmetric placement).
- **Spacing**: section vertical padding compresses from 128px to 48px on mobile.
- **Content**: two-column hero (headline left / supporting text right) becomes stacked (headline on top, supporting text below).
- **Footer**: 4 columns → 1 column accordion with chevron toggles per section.

### Image Behavior
Circular portraits scale proportionally (maintaining the perfect circle at every size). Hero video frames maintain their 40px radius at every breakpoint, but the frame itself shrinks with the viewport. Lazy loading is standard with a cream-tinted blur-up placeholder, preserving the palette during load.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: "Ink Black (`#141413`) — the warm near-black used for primary pill buttons and footer"
- Background: "Canvas Cream (`#F3F0EE`) — warm putty body canvas, never pure white"
- Lifted surface: "Lifted Cream (`#FCFBFA`) — one step lighter than canvas for nested sections"
- Heading text: "Ink Black (`#141413`)"
- Body text: "Ink Black (`#141413`) at weight 450"
- Muted text: "Slate Gray (`#696969`)"
- Signal / Consent: "Signal Orange (`#CF4500`) — reserve for cookie consent and legal actions"
- Accent arc: "Light Signal Orange (`#F37338`) — orbital decorative lines only"
- Border / Outline: "Ink Black at 1.5px for pill buttons; 1px at low opacity elsewhere"
- Footer: "Ink Black (`#141413`) with White text"

### Example Component Prompts
- "Create a circular portrait card 300px in diameter, with a square photograph cropped to a perfect circle. Attach a 56px white satellite button with a dark arrow icon at the bottom-right, so it protrudes ~40% outside the portrait. Below the portrait, add an eyebrow label with a Light Signal Orange dot and uppercase 'SERVICES' text in MarkForMC weight 700 at 14px. Below the eyebrow, set a 24px / weight 500 title in Ink Black."
- "Design a primary CTA button: Ink Black (`#141413`) background, Canvas Cream (`#F3F0EE`) text, 20px border-radius, 6px vertical and 24px horizontal padding, MarkForMC font at 16px weight 500 with -2% letter-spacing."
- "Build a floating navigation pill: white background with `rgba(0, 0, 0, 0.04) 0px 4px 24px 0px` shadow, 999px border-radius, ~16px vertical and 40px horizontal internal padding. Position it 24px below the viewport top, centered, with the Mastercard logo at the left, five primary links centered with 48px gap, and a circular 48px search button at the right."
- "Create a hero media frame: 40px border-radius on all corners, full viewport width minus 48px gutters, ~60% viewport height, dark background for video content. Place it directly on the cream canvas with no shadow."
- "Design a footer: Ink Black (`#141413`) background, white text, 4-column link grid with uppercase muted column headers at 14px weight 700 +4% tracking. Include a large conversational H2 above the grid, a 1px white-at-30%-opacity horizontal divider below, and a bottom row with copyright, legal small-print links, a pill-shaped country selector, and four social icons."

### Iteration Guide
When refining existing screens generated with this design system:
1. Focus on ONE component at a time — don't redesign multiple surfaces in parallel
2. Reference specific color names AND hex codes from this document
3. Use natural language ("warm putty cream", "stadium pill", "circular portrait with satellite CTA") alongside technical values
4. Describe the desired "feel" (editorial, soft, institutional) alongside specific measurements
5. When in doubt, reach for one of three radii: 20px (buttons), 40px (hero/stadium), or 999px (pill/nav)
6. Default backgrounds to Canvas Cream (`#F3F0EE`), not white — this single change shifts the entire mood toward Mastercard

### Known Gaps
- The live page uses MarkForMC, a proprietary licensed typeface. Sofia Sans is the closest open-source substitute and is listed in Mastercard's own fallback stack.
- Tablet breakpoint specifics (768–1023px) were inferred from desktop and mobile captures; intermediate layouts may vary per section.
- The exact "whisper" cream tone used for ghost-watermark headlines behind circular portraits reads between `#E8E2DA` and `#D1CDC7` in captures; the precise value varies per section.
- Third-party consent orange (`#CF4500`) is Mastercard's documented consent signal and should not be confused with any marketing CTA color.
- The Mastercard logo mark (red `#EB001B` + yellow `#F79E1B`) is a brand asset, not a UI palette entry.


