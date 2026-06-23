# Release

Adit currently ships unsigned macOS DMGs. Developer ID signing and Apple notarization are intentionally out of scope until the v2 signing milestone.

## Requirements

- GitHub remote configured as `origin`.
- GitHub Actions enabled for the repository.
- The release workflow uses the repository `GITHUB_TOKEN` with `contents: write`.
- No Apple Developer certificate, notarization profile, or signing secret is required for unsigned releases.

## Local Validation

Run the same checks before tagging:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm dist:mac:arm64
```

The local package lands in `dist/`.

## Tag Release

1. Update `package.json` version:

   ```bash
   pnpm version patch --no-git-tag-version
   ```

2. Validate the intended tag:

   ```bash
   pnpm release:check v0.1.1
   ```

3. Commit the version change.

4. Create an annotated tag that matches `package.json`:

   ```bash
   git tag -a v0.1.1 -m "v0.1.1"
   ```

5. Push main and tags:

   ```bash
   git push origin main --follow-tags
   ```

The `Release` workflow builds an unsigned arm64 macOS DMG and uploads it to a GitHub Release for the tag.

## Unsigned Install Note

Unsigned DMGs can trigger macOS Gatekeeper. If direct launch is blocked, open Finder, right-click the app, choose Open, then confirm.
