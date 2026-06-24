# Adit

A quiet macOS app for **AI-native notes**.

<table>
  <tr>
    <td align="center" width="33%">
      <img src="docs/images/adit-screenshot.png" alt="Adit Sparks" width="290"><br>
      <b>Sparks</b>
    </td>
    <td align="center" width="33%">
      <img src="docs/images/adit-screenshot-session.png" alt="Adit session workspace with note panel" width="290"><br>
      <b>Session</b>
    </td>
    <td align="center" width="33%">
      <img src="docs/images/adit-screenshot-library.png" alt="Adit Library" width="290"><br>
      <b>Library</b>
    </td>
  </tr>
</table>

## Speak, don't type

In the AI-native era, your best work does not start at a keyboard. It starts in conversation — with the strongest LLM you have access to. You talk. The model listens, thinks, searches, drafts, generates, and produces. That is the real interface now.

Adit is built for that habit. Open a session, **speak to your AI**, and let the model do the heavy lifting. Typing is a fallback. Talking is the default.

## What Adit is

Adit is not another chat app. It is not a folder of old conversations.

It is a place to **work with AI and keep what matters**.

- **Spark** — where you start or return to a live session with ChatGPT, Grok, or another provider. It is the doorway into the work, not the finished note.
- **Library** — what you chose to keep: a summary, a document, an image, a piece of code, anything worth saving. Your notes live here, on your Mac. Not buried in a provider's history.

The conversation is where things get made. The Library is what you own afterward.

## How you use it

***Open Adit.***

- Pick up an existing Spark or start a new one.
- **Talk to your AI** — say what you want, refine as you go.
- Open the **Note** panel while you work, create a markdown note, and pull selected provider text into it when something is worth keeping.
- Switch to **Library** later to browse, search, edit, and export your saved notes without reopening the original chat.

You do not need to re-find old results inside ChatGPT or Grok. You keep the good parts yourself.

## Install

Requires macOS on Apple silicon (arm64).

```bash
brew install samzong/tap/adit
```

Adit currently ships unsigned. If macOS Gatekeeper blocks launch, clear the quarantine flag and open the app again:

```bash
xattr -cr /Applications/Adit.app
open -a Adit
```

If that still fails, open Finder, right-click `Adit.app`, choose **Open**, then confirm.

You can also download the latest `Adit-*-arm64.dmg` from [GitHub Releases](https://github.com/samzong/adit/releases).

## What Adit will not become

- A transcript hoarder
- A tool that reads your chats without asking
- A replacement for the providers themselves
- A bloated "knowledge base" before the basics work

Adit only saves what **you** choose to save.

## What you can use today

- Resume ChatGPT and Grok sessions from a local Spark list
- Search and archive Sparks
- Split session workspace with a resizable **Note** panel
- Create and edit markdown Library documents with a formatting toolbar
- Pull selected provider text into the active note during a session
- Browse Library items, search, filter by type, archive, and export Markdown
- Light and dark macOS shell

## What's next

- One-step save flows from a session into Library
- Viewers for image, file, code, and web-capture Library items
- Document history and richer attachment support

## License

MIT