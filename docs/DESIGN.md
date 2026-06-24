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

## Cards (`PaperCard`)

- `cardBg`, `border`, `card` radius (`14px`), `minH 188px`, `card` shadow. The whole card is the open target (`role="button"`, keyboard-activatable).
- Hover: `translateY(-3px)`, `cardHover` shadow, `borderStrong` border, `cardHoverBg` background.
- Provider identity is a **compact pill** (`align-self:flex-start` — dot + label in the provider tint). No diagonal ribbons, no full-width bars.
- Title uses `cardTitle` (Bricolage, 2-line clamp); host and timestamp use Hanken in `muted`/`faint`.
- Archive/restore is a quiet, icon-only menu revealed on hover/focus (top-right) — not shown in the static design, kept for function per `AGENTS.md`.

## Tokens & CSS rules

- All colors, shadows, radii, fonts, and text styles live in `theme.ts`. No handwritten CSS for shell styling.
- `src/renderer/src/platform.css` is limited to Electron platform hooks (`-webkit-app-region`, font smoothing) — no layout, color, or visual styling.

## Out of scope (future phases)

- Library is a designed placeholder. The real Library — `library_items`/`attachments` data model, in-WebView save flow — is a separate build per `todo.md`.
