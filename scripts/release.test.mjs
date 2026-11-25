import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

function fixture(t, version) {
  const root = mkdtempSync(join(tmpdir(), 'adit-release-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts'))
  for (const script of ['check-release-tag.mjs', 'prepare-release-notes.mjs']) {
    copyFileSync(new URL(script, import.meta.url), join(root, 'scripts', script))
  }
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version }))
  return {
    root,
    run(script, tag) {
      const env = { ...process.env }
      delete env.GITHUB_REF_NAME
      if (tag !== undefined) env.GITHUB_REF_NAME = tag
      return spawnSync(process.execPath, [join(root, 'scripts', script)], { env, encoding: 'utf8' })
    }
  }
}

test('the release gate accepts stable and supported prerelease tags', (t) => {
  for (const version of ['0.2.1', '0.2.1-alpha.1', '0.2.1-beta.2', '0.2.1-rc.10']) {
    const f = fixture(t, version)
    assert.equal(f.run('check-release-tag.mjs', `v${version}`).status, 0)
  }
})

test('the release gate rejects invalid tags even when the manifest matches', (t) => {
  for (const version of ['0.2.1-foo.1', '0.2.1-rc.01', '01.2.0', '0.2.1-fix.1', '0.2.1+build.1']) {
    const f = fixture(t, version)
    assert.equal(f.run('check-release-tag.mjs', `v${version}`).status, 1)
  }
})

test('the release gate rejects a missing tag and a manifest mismatch', (t) => {
  const f = fixture(t, '0.2.1')
  assert.equal(f.run('check-release-tag.mjs').status, 1)
  assert.equal(f.run('check-release-tag.mjs', 'v0.2.2').status, 1)
})

test('release notes contain only the selected changes and the unsigned launch instructions', (t) => {
  const f = fixture(t, '0.2.1-rc.1')
  writeFileSync(
    join(f.root, 'CHANGELOG.md'),
    '## [0.2.1-rc.1] (2026-11-25)\n\n### Fixes\n\n* Keep selected outputs.\n\n## [0.2.0] (2026-06-24)\n\n* Old change.\n'
  )
  const result = f.run('prepare-release-notes.mjs')
  assert.equal(result.status, 0)
  assert.match(result.stdout, /Keep selected outputs\./)
  assert.match(result.stdout, /Gatekeeper.*Finder.*Open/)
  assert.doesNotMatch(result.stdout, /Old change/)
})

test('release notes reject missing, empty, and heading-only version sections', (t) => {
  const f = fixture(t, '0.2.1')
  for (const changelog of [
    '## [0.2.0] (2026-06-24)\n\n* Old change.\n',
    '## [0.2.1] (2026-11-25)\n',
    '## [0.2.1] (2026-11-25)\n\n### Fixes\n'
  ]) {
    writeFileSync(join(f.root, 'CHANGELOG.md'), changelog)
    assert.equal(f.run('prepare-release-notes.mjs').status, 1)
  }
})
