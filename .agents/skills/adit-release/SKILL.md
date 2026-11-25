---
name: adit-release
description: Release Adit versions from the repo-local workflow. Use when the user asks to publish, cut, tag, or ship an Adit release such as v0.1.2, or asks to follow docs/RELEASE.md for an unsigned macOS DMG release.
---

# Adit Release

Use `docs/RELEASE.md` as the single release procedure and the codebase as the source of truth. This skill covers release preparation and verification. Publishing a tag and GitHub Release requires separate owner authorization.

## Preflight

1. Read `docs/RELEASE.md` and the applicable `AGENTS.md` instructions.
2. Confirm the requested stable or prerelease version. Use only the version forms defined in the release guide.
3. Confirm that `origin` points to `samzong/adit` and the preparation worktree starts from the latest `origin/main`, with no unrelated changes.
4. Confirm that the requested tag does not exist locally or on `origin`. Do not move, rename, delete, or reuse a published tag.

## Prepare the release

Follow the guide's preparation steps in a task worktree. Update `package.json`, generate `CHANGELOG.md` with `pnpm release:changelog`, and review the matching version section and unsigned launch instructions with `node scripts/prepare-release-notes.mjs`.

Run every release gate in the guide, including the exact tag check, `pnpm check`, and the macOS DMG build. If any gate fails, stop publication and report the failure.

Commit both `package.json` and `CHANGELOG.md` with sign-off through the repository's PR delivery loop. Complete review and CI, then merge the preparation PR before tagging. Do not push release preparation directly to `main`.

## Publish an approved release

Only after separate publication authorization, select the merged release commit on the current `origin/main`. Confirm that its package version and committed changelog match the approved tag, then follow the guide's publication steps.

Use an annotated tag that points to that release commit. Push only the approved tag. Do not use `--follow-tags` or push unrelated tags.

## GitHub verification

After the approved tag push, inspect the Release workflow and its published asset:

```bash
gh run list --repo samzong/adit --workflow Release --limit 5 --json databaseId,displayTitle,headBranch,headSha,status,conclusion,url
gh run watch RUN_ID --repo samzong/adit --exit-status --interval 10
gh release view vX.Y.Z --repo samzong/adit --json tagName,name,isDraft,isPrerelease,url,assets
```

Replace the version placeholder with the approved stable or prerelease tag. Completion requires:

- the workflow completed with `conclusion: success` at the approved release commit;
- the GitHub Release is not a draft and `isPrerelease` matches the approved release stage;
- the release notes contain the matching English change entries and unsigned macOS launch instructions;
- `Adit-<version>-arm64.dmg` exists as a release asset;
- the preparation worktree is clean.

Report non-blocking workflow annotations separately from release failures.
