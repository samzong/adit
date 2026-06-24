import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const rendererDir = join(process.cwd(), 'out', 'renderer')
const assetsDir = join(rendererDir, 'assets')
const indexHtml = readFileSync(join(rendererDir, 'index.html'), 'utf8')
const initialScripts = [...indexHtml.matchAll(/<script[^>]+src=["'](?:\.\/)?assets\/([^"']+\.js)["']/g)].map(
  (match) => match[1]
)
const maxInitialJsBytes = 1200 * 1024

if (initialScripts.length === 0) {
  throw new Error('No initial renderer script found in out/renderer/index.html')
}

const totalInitialBytes = initialScripts.reduce((total, script) => total + statSync(join(assetsDir, script)).size, 0)
const largestAsset = readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, size: statSync(join(assetsDir, name)).size }))
  .sort((left, right) => right.size - left.size)[0]
const markdownEditorInitialScript = initialScripts.find((script) => script.includes('markdown-editor'))

console.log(
  `Renderer initial JS: ${(totalInitialBytes / 1024).toFixed(1)} KiB across ${initialScripts.map((script) => basename(script)).join(', ')}`
)
console.log(`Largest renderer JS asset: ${basename(largestAsset.name)} ${(largestAsset.size / 1024).toFixed(1)} KiB`)

if (markdownEditorInitialScript) {
  throw new Error(`Markdown editor must stay lazy-loaded, but ${markdownEditorInitialScript} is an initial script`)
}

if (totalInitialBytes > maxInitialJsBytes) {
  throw new Error(
    `Renderer initial JS ${(totalInitialBytes / 1024).toFixed(1)} KiB exceeds ${(maxInitialJsBytes / 1024).toFixed(0)} KiB budget`
  )
}
