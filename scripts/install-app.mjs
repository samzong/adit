import { existsSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../dist/mac-arm64/Adit.app', import.meta.url))
const target = join(homedir(), 'Applications', 'Adit.app')

if (!existsSync(source)) {
  console.error('dist/mac-arm64/Adit.app not found')
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
execSync(`ditto ${JSON.stringify(source)} ${JSON.stringify(target)}`)
execSync(`xattr -cr ${JSON.stringify(target)}`)
console.log(`Installed to ${target}`)
