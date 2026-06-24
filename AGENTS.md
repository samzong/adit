# AGENTS.md

## Scope

Project-local rules for Adit. These rules supplement the shared global agent instructions and apply to this repository only.

## Product Boundary

Adit is a quiet macOS app for AI-native notes. It is not another chat app, a transcript archive, a provider replacement, or a bloated knowledge base before the basics work.

Adit's core habit is: start or resume a provider conversation, work with the strongest model available, then keep only what matters on the user's Mac. Talking to the provider is the default work mode; typing is a fallback.

Use these product terms consistently:

- `Spark` is the product name for a provider conversation entry point. It is the draft doorway and live work site, not the finished note.
- `Library` is the user's local AI note asset collection. It contains user-selected summaries, documents, images, code, files, or other provider outputs worth keeping.
- Provider conversations are where things get made. Library items are what the user owns afterward.

Adit may store and resume provider conversation URLs. It may also save provider outputs into Library only when the user explicitly chooses what to keep.

Adit must not default to collecting complete provider message bodies, mirroring provider history, summarizing conversations without user choice, exporting full transcripts, reading chats without asking, or automating provider actions such as clicking provider controls or sending messages.

The product value is not chatting on behalf of the provider. The value is turning selected provider results into local notes the user can later view, analyze, and reuse without reopening the original conversation.

Before UI work, read `docs/DESIGN.md`; if code and docs disagree, verify the live code and keep the implementation minimal.

## Shell UI Stack

- Use Chakra UI for the Adit shell UI.
- Do not introduce handwritten CSS files for shell UI styling. The single exception is `src/renderer/src/platform.css`, which holds Electron platform integration styles only (drag/no-drag regions, font smoothing). These use vendor-prefixed properties (`-webkit-app-region`, `-webkit-font-smoothing`) that Chakra's `SystemStyleObject` cannot model, so they cannot live in `globalCss`. Keep `platform.css` limited to platform hooks — no layout, colors, or visual styling belongs there.
- Keep global renderer styling in `src/renderer/src/theme.ts` via Chakra `globalCss`.
- Keep colors, shadows, text styles, radii, and reusable visual decisions in Chakra theme tokens or semantic tokens.
- Prefer Chakra props, `textStyle`, semantic tokens, and component variants over inline CSS values.
- Do not solve layout problems with one-off raw pixel offsets. If Chakra or the platform does not expose a clean layout primitive, remove the conflicting UI element instead of hand-positioning it.
- The only accepted class hooks in shell UI are platform integration hooks such as Electron drag/no-drag regions; their styles live in `src/renderer/src/platform.css`.

## macOS Visual Direction

The app should feel like a quiet macOS utility, not a generic web dashboard.

- Use the native window controls area cleanly. Do not place app branding under the traffic lights.
- Prefer a unified toolbar feel over stacked web headers.
- Search fields should feel like macOS search fields: 28-32px tall, subtle background, restrained border.
- Active/Archive controls should feel like macOS segmented controls: stable click targets, subtle container, clear selected segment.
- Keep window/content padding around 12-16px.
- Keep toolbar-to-content spacing around 20px.
- Align text and controls to a consistent grid.

## Spark Cards

Sparks are compact macOS-style cards.

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

- Run `pnpm check` before every commit and after shell UI changes.
- The user operates screenshot checks for Adit UI by default. Do not take screenshots unless explicitly asked.
- If a change touches Electron window chrome, restart the dev app before asking the user to inspect it.

## Electron Debugging

- For split UI, `WebContentsView`, or renderer/main geometry bugs, start dev with both debug ports:
  `pnpm dev --remoteDebuggingPort 9223 --inspect 9229`
- `--remoteDebuggingPort` is the electron-vite option for renderer CDP. It becomes Electron's `--remote-debugging-port`; verify with `curl http://127.0.0.1:9223/json/list`.
- `--inspect` opens the main-process Node inspector. Verify with `curl http://127.0.0.1:9229/json/list`.
- Use renderer CDP for DOM rectangles and React shell state. Use main inspector for `SessionController`, `resizeProviderView()`, and `WebContentsView.setBounds()` state. Do not infer native view bounds from DOM alone.
