# adit

A chromeless macOS shell that collects your scattered ChatGPT and Grok web conversations into a local, resumable note list. Each note is an **adit** — a kept entrance back into a conversation that lives on the provider's site. It stores session-URL pointers, never conversation content. No chat UI, no ASR, no model selection.

macOS-only · Electron + TypeScript + React + SQLite.

## Status

M0 login gate passed; M1 (single-provider loop) in progress. See:

- **`docs/DESIGN.md`** — authoritative spec. All development follows only this doc.
- **`HANDOFF.md`** — current state and the next coding tasks.
