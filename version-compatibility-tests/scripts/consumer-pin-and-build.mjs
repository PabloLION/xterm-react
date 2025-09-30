#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const appDir = path.join(repoRoot, 'version-compatibility-tests', 'consumer-app')
const distDir = path.join(repoRoot, 'version-compatibility-tests', 'dist')

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function getLatest(name) {
  return execSync(`npm view ${name} version`, { stdio: 'pipe' }).toString().trim()
}

function getLatestForMajor(name, major) {
  try {
    const raw = execSync(`npm view ${name} versions --json`, { stdio: 'pipe' }).toString()
    const versions = JSON.parse(raw)
    const filtered = versions.filter(v => String(v).startsWith(`${major}.`))
    return filtered[filtered.length - 1] || getLatest(name)
  } catch {
    return getLatest(name)
  }
}

function parseArgs(argv) {
  const out = {}
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
      case '--help':
        console.log(`Usage: node consumer-pin-and-build.mjs [--react <ver>] [--react-dom <ver>] [--typescript <ver>] [--vite <ver>] [--plugin-react <ver>] [--types-react <ver>] [--types-react-dom <ver>]`)
        process.exit(0)
      default:
        break
    }
  }
  return out
}

function main() {
  const args = parseArgs(process.argv)
  const react = args.react || getLatest('react')
  const reactDom = args.reactDom || getLatest('react-dom')
  const reactMajor = String(react).split('.')[0]
  const versions = {
    react,
    'react-dom': reactDom,
    typescript: args.typescript || getLatest('typescript'),
    '@types/react': args.typesReact || getLatestForMajor('@types/react', reactMajor),
    '@types/react-dom': args.typesReactDom || getLatestForMajor('@types/react-dom', reactMajor),
    vite: args.vite || getLatest('vite'),
    '@vitejs/plugin-react': args.pluginReact || getLatest('@vitejs/plugin-react')
  }

  // Build and pack library tarball
  fs.mkdirSync(distDir, { recursive: true })
  sh('pnpm pack --pack-destination version-compatibility-tests/dist', { cwd: repoRoot })
  const tgz = fs
    .readdirSync(distDir)
    .filter((f) => f.endsWith('.tgz'))
    .map((f) => ({ f, t: fs.statSync(path.join(distDir, f)).ctimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.f
  if (!tgz) {
    console.error('No packed tarball found under version-compatibility-tests/dist')
    process.exit(1)
  }

  // Optionally add tool pins (eslint/prettier/biome)
  function mapEslint(label) {
    if (!label) return null
    switch (label) {
      case '8-ts6':
        return { eslint: '^8.57.0', '@typescript-eslint/parser': '^6.21.0', '@typescript-eslint/eslint-plugin': '^6.21.0' }
      case '9-ts8':
        return { eslint: '^9.36.0', '@typescript-eslint/parser': '^8.44.1', '@typescript-eslint/eslint-plugin': '^8.44.1' }
      default:
        // allow raw version (e.g., 9.36.0)
        return { eslint: label }
    }
  }
  function mapPrettier(label) {
    if (!label) return null
    switch (label) {
      case '2.8':
        return { prettier: '^2.8.8', 'eslint-plugin-prettier': '^4.2.1' }
      case '3.0':
        return { prettier: '^3.0.0', 'eslint-plugin-prettier': '^5.0.0' }
      case '3.3':
        return { prettier: '^3.3.0', 'eslint-plugin-prettier': '^5.5.4' }
      default:
        return { prettier: label }
    }
  }
  function mapBiome(label) {
    if (!label) return null
    return { '@biomejs/biome': label }
  }

  const eslintPins = mapEslint(args.eslint)
  const prettierPins = mapPrettier(args.prettier)
  const biomePins = mapBiome(args.biome)

  // Pin in consumer app
  const pkgPath = path.join(appDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkg.dependencies = {
    ...(pkg.dependencies || {}),
    react: versions.react,
    'react-dom': versions['react-dom'],
    '@pablo-lion/xterm-react': `file:../dist/${tgz}`
  }
  pkg.devDependencies = {
    ...(pkg.devDependencies || {}),
    typescript: versions.typescript,
    '@types/react': versions['@types/react'],
    '@types/react-dom': versions['@types/react-dom'],
    vite: versions.vite,
    '@vitejs/plugin-react': versions['@vitejs/plugin-react'],
    ...(eslintPins || {}),
    ...(prettierPins || {}),
    ...(biomePins || {})
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  // Install & build
  try {
    sh('pnpm install', { cwd: appDir })
    sh('pnpm exec vite build', { cwd: appDir })
    // Optional checks
    if (eslintPins) {
      try { sh('pnpm exec eslint .', { cwd: appDir }) } catch (e) { /* leave failure to user */ }
    }
    if (prettierPins) {
      try { sh('pnpm exec prettier --check .', { cwd: appDir }) } catch (e) { /* non-blocking */ }
    }
    if (biomePins) {
      try { sh('pnpm exec biome check .', { cwd: appDir }) } catch (e) { /* non-blocking */ }
    }
  } finally {
    // Leave the pinned versions in place for reproducibility
  }

  console.log('\nPinned versions:')
  for (const [k, v] of Object.entries(versions)) console.log(`- ${k} = ${v}`)
  console.log(`Tarball: ${tgz}`)
  console.log('Consumer app built. Run `pnpm exec vite preview` in consumer app to view.')
}

main()
