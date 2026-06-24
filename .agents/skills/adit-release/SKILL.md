---
name: adit-release
description: Release Adit versions from the repo-local workflow. Use when the user asks to publish, cut, tag, or ship an Adit release such as v0.1.2, or asks to follow docs/RELEASE.md for an unsigned macOS DMG release.
---

# Adit Release

Release Adit by treating `docs/RELEASE.md` as the live contract and the codebase as the source of truth. This skill is allowed to mutate only the release version bump, annotated tag, push, and release verification for the requested version.

## Preflight

1. Read `docs/RELEASE.md` first.
2. Confirm the requested version. If the user supplied `vX.Y.Z`, set `package.json` to `X.Y.Z`; if they asked for the next patch, use `pnpm version patch --no-git-tag-version`.
3. Verify `origin` points at the expected GitHub repository and the current branch is `main`.
4. Verify the worktree is clean and `HEAD` matches `origin/main`. Stop if there are unrelated local changes or the branch is not in sync.
5. Verify the requested tag does not already exist locally or on `origin`.

Useful checks:

```bash
git status --short --branch
git remote -v
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD origin/main
git tag --list 'v*.*.*'
git ls-remote --tags origin 'refs/tags/vX.Y.Z*'
```

## Local Release

Run the release steps in this order:

```bash
pnpm version X.Y.Z --no-git-tag-version
pnpm release:check vX.Y.Z
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm dist:mac:arm64
```

After validation, inspect the diff. The expected committed change is the version bump, normally only `package.json`.

```bash
git diff
git status --short --branch
```

If validation fails, stop and report the failing command. Do not tag or push.

## Commit, Tag, Push

Before committing, stage only the intended release version files and inspect the staged diff:

```bash
git add package.json
git diff --cached
git commit -s -m "chore(release): bump version to X.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main --follow-tags
```

Use an annotated tag. The tag must point at the release commit and match `package.json`.

## GitHub Verification

After push, verify the GitHub Actions Release workflow and the published release asset:

```bash
gh run list --repo samzong/adit --workflow Release --limit 5 --json databaseId,displayTitle,headBranch,headSha,status,conclusion,url
gh run watch RUN_ID --repo samzong/adit --exit-status --interval 10
gh release view vX.Y.Z --repo samzong/adit --json tagName,name,isDraft,isPrerelease,url,assets
```

Completion requires evidence that:

- the Release workflow completed with `conclusion: success`;
- the GitHub Release is not a draft;
- `Adit-X.Y.Z-arm64.dmg` exists as a release asset;
- `git status --short --branch` is clean and aligned with `origin/main`.

Mention non-blocking workflow annotations separately from release failures.
