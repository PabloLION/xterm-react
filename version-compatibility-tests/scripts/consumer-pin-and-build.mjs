#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const distDir = path.join(repoRoot, 'version-compatibility-tests', 'dist')

const ALLOWED_PACKAGES = new Set([
  'react',
  'react-dom',
  'typescript',
  '@types/react',
  '@types/react-dom',
  'vite',
  '@vitejs/plugin-react',
  '@biomejs/biome',
  'eslint',
  '@eslint/js',
  '@typescript-eslint/parser',
  'eslint-config-prettier',
  'prettier'
])

function assertAllowedPackage(name) {
  if (!ALLOWED_PACKAGES.has(name)) {
    console.error(`[pin-and-build] Package name not allowed: ${name}`)
    process.exit(1)
  }
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function getLatest(name) {
  assertAllowedPackage(name)
  return execSync(`pnpm view ${name} version`, { stdio: 'pipe' }).toString().trim()
}

function getLatestForMajor(name, major) {
  assertAllowedPackage(name)
  try {
    const raw = execSync(`pnpm view ${name} versions --json`, { stdio: 'pipe' }).toString()
    const versions = JSON.parse(raw)
    const filtered = versions.filter(v => String(v).startsWith(`${major}.`))
    return filtered[filtered.length - 1] || getLatest(name)
  } catch {
    return getLatest(name)
  }
}

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
        console.log(`Usage: node consumer-pin-and-build.mjs [--react <ver>] [--react-dom <ver>] [--typescript <ver>] [--vite <ver>] [--plugin-react <ver>] [--types-react <ver>] [--types-react-dom <ver>] [--biome <ver>] [--eslint <ver>] [--eslint-js <ver>] [--ts-eslint-parser <ver>] [--prettier <ver>] [--eslint-config-prettier <ver>] [--tarball <path>] [--app-dir <dir>] [--keep-pins]`)
        process.exit(0)
      default:
        break
    }
  }
  return out
}

function main() {
  const args = parseArgs(process.argv)
  const appDir = (() => {
    const d = args.appDir ? (path.isAbsolute(args.appDir) ? args.appDir : path.join(repoRoot, args.appDir)) : path.join(repoRoot, 'version-compatibility-tests', 'consumer-app')
    const rel = path.relative(repoRoot, d)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      console.error('[pin-and-build] --app-dir must be within the repository tree:', d)
      process.exit(1)
    }
    return d
  })()

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

  const lintDevDeps = {}
  if (args.biome) {
    assertAllowedPackage('@biomejs/biome')
    lintDevDeps['@biomejs/biome'] = args.biome
  }
  if (args.eslint) {
    assertAllowedPackage('eslint')
    const eslintVersion = args.eslint
    lintDevDeps.eslint = eslintVersion
    const eslintJsVersion = args.eslintJs || eslintVersion
    assertAllowedPackage('@eslint/js')
    lintDevDeps['@eslint/js'] = eslintJsVersion
    const parserVersion = args.tsEslintParser || getLatest('@typescript-eslint/parser')
    assertAllowedPackage('@typescript-eslint/parser')
    lintDevDeps['@typescript-eslint/parser'] = parserVersion
    const configPrettier = args.eslintConfigPrettier || getLatest('eslint-config-prettier')
    assertAllowedPackage('eslint-config-prettier')
    lintDevDeps['eslint-config-prettier'] = configPrettier
  }
  if (args.prettier) {
    assertAllowedPackage('prettier')
    lintDevDeps.prettier = args.prettier
  }

  fs.mkdirSync(distDir, { recursive: true })
  let tgz = null
  if (args.tarball) {
    const abs = path.isAbsolute(args.tarball) ? args.tarball : path.join(repoRoot, args.tarball)
    if (!fs.existsSync(abs)) {
      console.error('Provided tarball not found:', abs)
      process.exit(1)
    }
    if (!abs.endsWith('.tgz')) {
      console.error('Provided tarball must be a .tgz file:', abs)
      process.exit(1)
    }
    const relToRepo = path.relative(repoRoot, abs)
    if (relToRepo.startsWith('..') || path.isAbsolute(relToRepo)) {
      console.error('Provided tarball must be within the repository tree:', abs)
      process.exit(1)
    }
    tgz = path.basename(abs)
    if (path.dirname(abs) !== distDir) {
      fs.copyFileSync(abs, path.join(distDir, tgz))
    }
  } else {
    sh('pnpm pack --pack-destination version-compatibility-tests/dist', { cwd: repoRoot })
    tgz = fs
      .readdirSync(distDir)
      .filter(f => f.endsWith('.tgz'))
      .map(f => ({ f, t: fs.statSync(path.join(distDir, f)).ctimeMs }))
      .sort((a, b) => (b.t - a.t) || a.f.localeCompare(b.f))[0]?.f
    if (!tgz) {
      console.error('No packed tarball found under version-compatibility-tests/dist')
      process.exit(1)
    }
  }

  const pkgPath = path.join(appDir, 'package.json')
  const originalPkg = fs.readFileSync(pkgPath, 'utf8')
  const pkg = JSON.parse(originalPkg)
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
    ...lintDevDeps
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  try {
    sh('pnpm install', { cwd: appDir })
    sh('pnpm exec vite build', { cwd: appDir })
    if (args.biome) {
      try {
        sh('pnpm exec biome check --config-path biome.json .', { cwd: appDir })
      } catch (error) {
        console.warn('Biome check failed (non-blocking):', error?.message || String(error))
      }
    }
  } finally {
    if (!args.keepPins) {
      fs.writeFileSync(pkgPath, originalPkg)
    }
  }

  const loggedVersions = { ...versions, ...lintDevDeps }
  console.log('\nPinned versions:')
  for (const [k, v] of Object.entries(loggedVersions)) {
    console.log(`- ${k} = ${v}`)
  }
  console.log(`Tarball: ${tgz}`)
  console.log('Consumer app built. Run `pnpm exec vite preview` in consumer app to view.')
}

main()
