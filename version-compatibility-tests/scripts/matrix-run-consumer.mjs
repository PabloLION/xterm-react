#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appDir = path.join(root, 'version-compatibility-tests', 'consumer-app')
const distDir = path.join(root, 'version-compatibility-tests', 'dist')
const logsRoot = path.join(root, 'version-compatibility-tests', 'logs', new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(logsRoot, { recursive: true })
const xfailPath = path.join(root, 'version-compatibility-tests', 'xfail.json')
const XFAIL = fs.existsSync(xfailPath) ? JSON.parse(fs.readFileSync(xfailPath, 'utf8')) : []

// Support scope: React 18 and 19 only
let REACTS = ['18.3.1', '19.1.1']
let TYPES = ['5.2.2', '5.4.5', '5.9.3']
let ESLINTS = ['8-ts6', '9-ts8']
let PRETTIERS = ['2.8', '3.0', '3.3']
let BIOMES = ['2.0.0', '2.1.1', '2.2.4']

// Optional quick mode and CLI filters
function parseListArg(flag) {
  const idx = process.argv.indexOf(`--${flag}`)
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1].split(',').map(s => s.trim()).filter(Boolean)
  return null
}
function filterAllowed(name, current, requested) {
  const set = new Set(current)
  const out = requested.filter(v => set.has(v))
  if (out.length !== requested.length) {
    const bad = requested.filter(v => !set.has(v))
    console.warn(`[matrix] Ignoring unsupported ${name} values:`, bad.join(', '))
  }
  return out.length ? out : current
}

const quick = process.env.QUICK === '1' || process.argv.includes('--quick')
if (quick) {
  REACTS = [REACTS[REACTS.length - 1]] // latest React only
  TYPES = [TYPES[TYPES.length - 1]]
  ESLINTS = [ESLINTS[ESLINTS.length - 1]]
  PRETTIERS = [PRETTIERS[PRETTIERS.length - 1]]
  BIOMES = [BIOMES[BIOMES.length - 1]]
}

const rArg = parseListArg('reacts'); if (rArg) REACTS = filterAllowed('react', REACTS, rArg)
const tArg = parseListArg('types'); if (tArg) TYPES = filterAllowed('typescript', TYPES, tArg)
const eArg = parseListArg('eslint'); if (eArg) ESLINTS = filterAllowed('eslint', ESLINTS, eArg)
const pArg = parseListArg('prettier'); if (pArg) PRETTIERS = filterAllowed('prettier', PRETTIERS, pArg)
const bArg = parseListArg('biome'); if (bArg) BIOMES = filterAllowed('biome', BIOMES, bArg)

function slug(parts) {
  return parts.map((p) => p.replace(/[^a-z0-9.\-]+/gi, '-')).join('+').toLowerCase()
}

function sh(cmd, cwd, logFile) {
  try {
    const out = execSync(cmd, { cwd, stdio: 'pipe' }).toString()
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: true, out }
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr ? '\n' + e.stderr.toString() : '')
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: false, out }
  }
}

function runScenario(react, ts, eslint, prettier, biome, tarballName) {
  const scenario = slug([`react-${react}`, `ts-${ts}`, `eslint-${eslint}`, `prettier-${prettier}`, `biome-${biome}`])
  const dir = path.join(logsRoot, scenario)
  fs.mkdirSync(dir, { recursive: true })

  const pinCmd = `node version-compatibility-tests/scripts/consumer-pin-and-build.mjs --react ${react} --react-dom ${react} --typescript ${ts} --eslint ${eslint} --prettier ${prettier} --biome ${biome} --tarball version-compatibility-tests/dist/${tarballName}`
  const pinRes = sh(pinCmd, root, path.join(dir, 'pin-and-build.log'))

  // After build, run quick checks again to capture statuses independently
  const buildRes = sh('pnpm exec vite build', appDir, path.join(dir, 'build.log'))
  const lintRes = sh('pnpm exec eslint .', appDir, path.join(dir, 'eslint.log'))
  const formatRes = sh('pnpm exec prettier --check .', appDir, path.join(dir, 'prettier.log'))
  const biomeRes = sh('pnpm exec biome check .', appDir, path.join(dir, 'biome.log'))

  const expectedFail = XFAIL.some(x =>
    (x.react?.toString() ?? react) === react &&
    (x.typescript?.toString() ?? ts) === ts &&
    (x.eslint?.toString() ?? eslint) === eslint &&
    (x.prettier?.toString() ?? prettier) === prettier &&
    (x.biome?.toString() ?? biome) === biome
  )

  const summary = {
    scenario,
    versions: { react, ts, eslint, prettier, biome },
    steps: {
      pin_and_build: pinRes.ok,
      build: buildRes.ok,
      eslint: lintRes.ok,
      prettier: formatRes.ok,
      biome: biomeRes.ok
    },
    expected_fail: expectedFail,
    outcome: expectedFail
      ? (buildRes.ok && pinRes.ok ? 'XPASS' : 'XFAIL')
      : (buildRes.ok && pinRes.ok ? 'PASS' : 'FAIL'),
    logs: dir
  }
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`${scenario}:`, summary.steps)
  return summary
}

function* combos() {
  for (const r of REACTS)
    for (const t of TYPES)
      for (const e of ESLINTS)
        for (const p of PRETTIERS)
          for (const b of BIOMES) yield [r, t, e, p, b]
}

function main() {
  // Pack once for all scenarios
  fs.mkdirSync(distDir, { recursive: true })
  sh('pnpm pack --pack-destination version-compatibility-tests/dist', root, path.join(logsRoot, 'pack.log'))
  const tgz = fs
    .readdirSync(distDir)
    .filter((f) => f.endsWith('.tgz'))
    .map((f) => ({ f, t: fs.statSync(path.join(distDir, f)).ctimeMs }))
    .sort((a, b) => (b.t - a.t) || a.f.localeCompare(b.f))[0]?.f
  if (!tgz) {
    console.error('Failed to find packed tarball under dist')
    process.exit(1)
  }

  const all = []
  for (const [r, t, e, p, b] of combos()) all.push(runScenario(r, t, e, p, b, tgz))
  const summaryPath = path.join(logsRoot, 'MATRIX_SUMMARY.json')
  fs.writeFileSync(summaryPath, JSON.stringify(all, null, 2))
  // Write stable pointer
  const latest = {
    generatedAt: new Date().toISOString(),
    summaryPath,
    total: all.length,
    passed: all.filter(s => s.steps.build && s.steps.pin_and_build).length
  }
  fs.writeFileSync(path.join(root, 'version-compatibility-tests', 'MATRIX_LATEST.json'), JSON.stringify(latest, null, 2))
  console.log('\nMatrix results written to', summaryPath)
  console.log('Latest summary pointer written to version-compatibility-tests/MATRIX_LATEST.json')
}

main()
