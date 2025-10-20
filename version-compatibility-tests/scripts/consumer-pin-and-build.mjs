#!/usr/bin/env node
// NOTE: This script stays as ESM JavaScript so it can run directly via `node`
// within CI without a separate build step. Type coverage is exercised in tests.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ensureTarball } from '../lib/consumer/tarball.mjs'
import { resolveConsumerVersions } from '../lib/consumer/resolve-versions.mjs'
import { applyPins, restorePackage } from '../lib/consumer/apply-pins.mjs'
import { runConsumerBuild } from '../lib/consumer/build.mjs'

export { assertAllowedPackage } from '../lib/consumer/pin-config.mjs'
export { pickLatestForMajor } from '../lib/consumer/resolve-versions.mjs'

const repoRoot = process.cwd()
const distDir = path.join(repoRoot, 'version-compatibility-tests', 'dist')
const LOG_PREFIX = '[pin-and-build]'

function parseArgs(argv) {
  const out = { keepPins: false, tarball: null }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    const v = argv[i + 1]
    switch (a) {
      case '--react': out.react = v; i++; break
      case '--react-dom': out.reactDom = v; i++; break
      case '--typescript': out.typescript = v; i++; break
      case '--vite': out.vite = v; i++; break
      case '--plugin-react': out.pluginReact = v; i++; break
      case '--types-react': out.typesReact = v; i++; break
      case '--types-react-dom': out.typesReactDom = v; i++; break
      case '--tarball': out.tarball = v; i++; break
      case '--app-dir': out.appDir = v; i++; break
      case '--biome': out.biome = v; i++; break
      case '--eslint': out.eslint = v; i++; break
      case '--eslint-js': out.eslintJs = v; i++; break
      case '--ts-eslint-parser': out.tsEslintParser = v; i++; break
      case '--prettier': out.prettier = v; i++; break
      case '--eslint-config-prettier': out.eslintConfigPrettier = v; i++; break
      case '--keep-pins': out.keepPins = true; break
      case '--help':
        console.log(`${LOG_PREFIX} Usage: node consumer-pin-and-build.mjs [--react <ver>] [--react-dom <ver>] [--typescript <ver>] [--vite <ver>] [--plugin-react <ver>] [--types-react <ver>] [--types-react-dom <ver>] [--biome <ver>] [--eslint <ver>] [--eslint-js <ver>] [--ts-eslint-parser <ver>] [--prettier <ver>] [--eslint-config-prettier <ver>] [--tarball <path>] [--app-dir <dir>] [--keep-pins]`)
        process.exit(0)
      default:
        break
    }
  }
  return out
}

function main() {
  try {
    const args = parseArgs(process.argv)
    const appDir = (() => {
      const d = args.appDir ? (path.isAbsolute(args.appDir) ? args.appDir : path.join(repoRoot, args.appDir)) : path.join(repoRoot, 'version-compatibility-tests', 'consumer-app')
      const real = fs.realpathSync(d)
      const rel = path.relative(repoRoot, real)
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        console.error(`${LOG_PREFIX} --app-dir must be within the repository tree:`, d)
        process.exit(1)
      }
      return real
    })()

    const { versions, lintDevDeps } = resolveConsumerVersions(args)
    const tgz = ensureTarball({
      providedTarball: args.tarball,
      repoRoot,
      distDir,
      logPrefix: LOG_PREFIX
    })

    const { pkgPath, originalPkg } = applyPins({
      appDir,
      distDir,
      tarballName: tgz,
      versions,
      lintDevDeps
    })

    try {
      runConsumerBuild({ appDir, logPrefix: LOG_PREFIX, hasBiome: Boolean(args.biome) })
    } finally {
      if (!args.keepPins) {
        restorePackage(pkgPath, originalPkg)
      }
    }

    const loggedVersions = { ...versions, ...lintDevDeps }
    console.log(`${LOG_PREFIX}\nPinned versions:`)
    for (const [k, v] of Object.entries(loggedVersions)) {
      console.log(`${LOG_PREFIX} - ${k} = ${v}`)
    }
    console.log(`${LOG_PREFIX} Tarball: ${tgz}`)
    console.log(`${LOG_PREFIX} Consumer app built. Run \`pnpm exec vite preview\` in consumer app to view.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const formatted = message.startsWith(LOG_PREFIX) ? message : `${LOG_PREFIX} ${message}`
    console.error(formatted)
    process.exit(1)
  }
}

const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return pathToFileURL(entry).href === import.meta.url
  } catch {
    return false
  }
})()

if (invokedAsScript) {
  main()
}
