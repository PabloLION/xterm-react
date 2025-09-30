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

function main() {
  const versions = {
    react: getLatest('react'),
    'react-dom': getLatest('react-dom'),
    typescript: getLatest('typescript'),
    '@types/react': getLatest('@types/react'),
    '@types/react-dom': getLatest('@types/react-dom'),
    vite: getLatest('vite'),
    '@vitejs/plugin-react': getLatest('@vitejs/plugin-react')
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
    '@vitejs/plugin-react': versions['@vitejs/plugin-react']
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  // Install & build
  try {
    sh('pnpm install', { cwd: appDir })
    sh('pnpm exec vite build', { cwd: appDir })
  } finally {
    // Leave the pinned versions in place for reproducibility
  }

  console.log('\nPinned versions:')
  for (const [k, v] of Object.entries(versions)) console.log(`- ${k} = ${v}`)
  console.log(`Tarball: ${tgz}`)
  console.log('Consumer app built. Run `pnpm exec vite preview` in consumer app to view.')
}

main()

