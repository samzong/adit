# Release

Adit is an L1 desktop tool. It ships unsigned macOS arm64 DMGs.
`package.json` is the version source. Electron Builder reads that version and includes it in each DMG filename.
Developer ID signing and Apple notarization remain outside this release workflow.

## Prepare a release

Use `X.Y.Z` for stable releases. Use only `X.Y.Z-alpha.N`, `X.Y.Z-beta.N`, or `X.Y.Z-rc.N` for prereleases.
Start each stage at 1 and increase the number for each publication. Do not use leading zeros or build metadata.
Use `-rc.N` when storage schemas, configuration formats, or packaging paths change.
Do not move, rename, delete, or reuse published tags. For fixes after a stable release, increase PATCH instead of adding `-fix.N`.

Install `git-cliff` before you generate the changelog:

```bash
brew install git-cliff
```

1. Update `package.json` without creating a tag. For example:

   ```bash
   pnpm version 0.2.1-rc.1 --no-git-tag-version
   ```

2. Generate `CHANGELOG.md` from Conventional Commits:

   ```bash
   pnpm release:changelog
   ```

3. Read the generated version section. Make sure that it contains English change entries.

4. Run the release gates:

   ```bash
   pnpm release:check v0.2.1-rc.1
   node scripts/prepare-release-notes.mjs
   pnpm check
   pnpm dist:mac:arm64
   ```

5. Commit `package.json` and `CHANGELOG.md` with sign-off. Complete PR review and CI before tagging the merged commit.

For a stable release, use the same steps with `0.2.1` and `v0.2.1`.
Promote tested candidate content unchanged. Only required version metadata can change.
If functional changes are necessary, publish another candidate and repeat acceptance.

## Publish an approved release

Release publication requires separate owner authorization. The repository must have GitHub Actions enabled and `origin` must point to GitHub.
The workflow uses `GITHUB_TOKEN` with `contents: write` only in the publication job.
No Apple signing certificate, notarization profile, or signing secret is required.

After authorization, create and push only the approved tag:

```bash
git tag -a v0.2.1-rc.1 -m "v0.2.1-rc.1"
git push origin v0.2.1-rc.1
```

The first `validate` job rejects invalid tag syntax and any difference from `package.json` before macOS builds start.
The workflow builds `dist/Adit-<version>-arm64.dmg` and creates the GitHub Release with that asset.
For `-alpha.N`, `-beta.N`, and `-rc.N`, publication uses `--prerelease --latest=false` to keep the release out of the stable channel.
Release notes use the matching committed `CHANGELOG.md` section and the unsigned launch instructions.
A missing or empty version section stops publication. An existing GitHub Release also stops publication instead of replacing published assets.

## Unsigned install

Unsigned DMGs can trigger macOS Gatekeeper. If direct launch is blocked, open Finder, right-click Adit, choose Open, then confirm.
