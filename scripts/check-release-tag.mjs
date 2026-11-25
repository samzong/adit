import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const expectedTag = `v${packageJson.version}`
const actualTag = process.env.GITHUB_REF_NAME ?? process.argv[2]

if (!actualTag) {
  console.error(`Release tag is required. Expected ${expectedTag}.`)
  process.exit(1)
}

if (!/^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(alpha|beta|rc)\.(0|[1-9][0-9]*))?$/.test(actualTag)) {
  console.error(`Invalid release tag ${actualTag}. Use vX.Y.Z or vX.Y.Z-(alpha|beta|rc).N without leading zeros.`)
  process.exit(1)
}

if (actualTag !== expectedTag) {
  console.error(`Release tag ${actualTag} does not match package.json version ${expectedTag}.`)
  process.exit(1)
}

console.log(`Release tag ${actualTag} matches package.json version ${packageJson.version}.`)
