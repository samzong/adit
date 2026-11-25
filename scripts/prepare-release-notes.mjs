import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
const section = changelog.split(/^## /m).find((entry) => entry.startsWith(`[${version}] (`))

if (!section || !/^[-*] \S/m.test(section)) {
  console.error(`CHANGELOG.md needs a nonempty section for ${version}. Run pnpm release:changelog before tagging.`)
  process.exit(1)
}

console.log(
  `## ${section.trim()}\n\n## Unsigned macOS build\n\nIf macOS Gatekeeper blocks direct launch, open Finder, right-click Adit, choose Open, then confirm.`
)
