# Adit Design

Adit is a quiet, warm macOS utility for working with AI notes. This file is the visual source of truth referenced by `AGENTS.md`. When code and this file disagree, trust the code and update this file. The current direction is the "warm paper" redesign authored in claude.ai/design (`Adit Redesign.dc.html` / `AditShell` / `AditCardPaper`).

## Palette

Warm, handcrafted paper tones with a terracotta accent. Full light + dark, via Chakra semantic tokens in `src/renderer/src/theme.ts`.

- Surfaces: `bg` (window) → `panel` / `panelHeader` → `cardBg` → `cardHoverBg`. Chrome (titlebar) uses `chrome` / `chromeBorder`.
- Text: `fg` → `fgSoft` → `muted` → `faint`; `label` for eyebrow labels.
- Borders: `border` (default) and `borderStrong` (hover/emphasis).
- Accent: `accent` (`#b06440` light / `#d18a5e` dark), `accentHover`, `accentOn` (`#fff`).
- Providers carry their own tints: `providerChatgpt*` (sage green), `providerGrok*` (rust).

## Fonts

Self-hosted via `@fontsource` (never the CDN — the app CSP is `font-src 'self'`), imported in `main.tsx`.

- `body` / `heading`: **Hanken Grotesk** — all UI text.
- `display`: **Bricolage Grotesque** — card titles only (`textStyle="cardTitle"`).
- `mono`: **Spline Sans Mono** — provider hosts in the New-session menu.

## Layout

Stacked column inside the native window (`hiddenInset` titlebar — real traffic lights, no fake chrome):

1. **Title bar** (`46px`, `chrome`): a draggable strip with centered "Adit". Traffic lights overlay top-left.
2. **Section tabs** (`panelHeader`): a centered pill segmented control — **Spark** / **Library** — `track` container, active segment on `trackActive` with `trackActive` shadow and `accent` icon.
3. **Toolbar** (border-bottom): search field left; right side is a split **New {provider}** button (accent, primary creates the first provider, caret opens a provider menu) + a divider + an **Archive** toggle.
4. **Content** (`24px` padding): a 4-column grid of cards, or a centered empty/placeholder state.
5. **Footer** (border-top): mic hint + GitHub link.

Adding a provider is one entry in `providerDefs` — the toolbar and menu never grow.

## Buttons & Icons

- Icon-only controls are reserved for low-ambiguity utility actions with established conventions: overflow menus (`...`), search affordances, archive/restore menu triggers, and compact tool controls where nearby context already names the action.
- Product concepts, navigation, mode switches, and actions that change the current working object need visible text. Use text-only or icon + text, not an unlabeled symbolic icon.
- In the Note side panel, the editor-to-note-switcher control is navigation, not file browsing. Use a compact `ChevronLeft` + `Notes` button. Do not use a folder icon for this action.
- Menu triggers may be icon-only, but menu items themselves should carry text labels such as `Export Markdown`.

## Document Editors

- A document editor must expose a compact editing toolbar when there is enough horizontal space. A bare body-only editor reads as a viewer, not a writing surface.
- Keep the document header for navigation, title, and document actions. Put formatting controls in a second toolbar row below the header.
- Editor toolbar controls may be icon-only because they are established formatting commands and each control has a tooltip. Keep groups visually separated.
- The default Markdown toolbar should cover undo/redo, block type, bold/italic/underline, inline code, lists, link, code block, thematic break, and rich/source mode. Do not show version diff controls until the product has document history.
- `MarkdownDocumentEditor` owns all MDXEditor class hooks. `adit-mdx-*`, `.mdxeditor-*`, and CodeMirror override selectors are a documented third-party editor boundary, not a general shell styling pattern.

## Cards (`PaperCard`)

- `cardBg`, `border`, `card` radius (`14px`), `minH 188px`, `card` shadow. The whole card is the open target (`role="button"`, keyboard-activatable).
- Hover: `translateY(-3px)`, `cardHover` shadow, `borderStrong` border, `cardHoverBg` background.
- Provider identity is a **compact pill** (`align-self:flex-start` — dot + label in the provider tint). No diagonal ribbons, no full-width bars.
- Title uses `cardTitle` (Bricolage, 2-line clamp); host and timestamp use Hanken in `muted`/`faint`.
- Archive/restore is a quiet, icon-only menu revealed on hover/focus (top-right) — not shown in the static design, kept for function per `AGENTS.md`.

## Tokens & CSS rules

- All colors, shadows, radii, fonts, and text styles live in `theme.ts`. No handwritten CSS for shell styling.
- `src/renderer/src/platform.css` is limited to Electron platform hooks (`-webkit-app-region`, font smoothing) — no layout, color, or visual styling.
- Third-party editor overrides may live in `theme.ts` `globalCss` only when scoped under `MarkdownDocumentEditor`'s `adit-mdx-*` classes.

## Out of scope (future phases)

- Full provider-to-Library save flow, attachments beyond markdown documents, and document history remain future work. Markdown Library documents are no longer a placeholder.
