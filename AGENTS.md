# AGENTS.md

## Scope

Project-local rules for Adit. These rules supplement the shared global agent instructions and apply to this repository only.

## Product Boundary

Adit is a macOS Electron shell for local conversation entrances. It stores and resumes provider conversation URLs. It does not collect provider message bodies, summarize conversations, export transcripts, or automate provider actions.

Before UI work, read `docs/DESIGN.md`; if code and docs disagree, verify the live code and keep the implementation minimal.

## Shell UI Stack

- Use Chakra UI for the Adit shell UI.
- Do not introduce handwritten CSS files for shell UI styling.
- Keep global renderer styling in `src/renderer/src/theme.ts` via Chakra `globalCss`.
- Keep colors, shadows, text styles, radii, and reusable visual decisions in Chakra theme tokens or semantic tokens.
- Prefer Chakra props, `textStyle`, semantic tokens, and component variants over inline CSS values.
- Do not solve layout problems with one-off raw pixel offsets. If Chakra or the platform does not expose a clean layout primitive, remove the conflicting UI element instead of hand-positioning it.
- The only accepted class hooks in shell UI are platform integration hooks such as Electron drag/no-drag regions, and their styles must live in Chakra `globalCss`.

## macOS Visual Direction

The app should feel like a quiet macOS utility, not a generic web dashboard.

- Use the native window controls area cleanly. Do not place app branding under the traffic lights.
- Prefer a unified toolbar feel over stacked web headers.
- Search fields should feel like macOS search fields: 28-32px tall, subtle background, restrained border.
- Active/Archive controls should feel like macOS segmented controls: stable click targets, subtle container, clear selected segment.
- Keep window/content padding around 12-16px.
- Keep toolbar-to-content spacing around 20px.
- Align text and controls to a consistent grid.

## Cards

Notes are compact macOS-style cards.

- Use light rounded corners, preferably 8-10px.
- Use quaternary/quinary-style backgrounds rather than pure black in dark mode.
- Use a very light shadow by default.
- On hover, raise the card subtly and strengthen the shadow, around `translateY(-2px)`.
- Keep card gaps around 16-24px.
- The whole card is the primary open target.
- Rename, archive, and restore are low-frequency actions; keep them visually secondary, preferably icon-only.
- Use theme text styles for card hierarchy: headline/body for titles, caption for timestamps and secondary metadata.
- Provider badges may remain, but they must stay small and quiet.

## Verification

- Run `pnpm typecheck` and `pnpm build` after shell UI changes.
- The user operates screenshot checks for Adit UI by default. Do not take screenshots unless explicitly asked.
- If a change touches Electron window chrome, restart the dev app before asking the user to inspect it.
