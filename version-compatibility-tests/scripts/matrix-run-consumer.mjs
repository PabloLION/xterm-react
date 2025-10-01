#!/usr/bin/env node
import { execSync, exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

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
function parseArgValue(names) {
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (names.includes(a)) {
      const v = argv[i + 1]
      if (v) return v
    }
  }
  return null
}
function parseListArgMulti(names) {
  const raw = parseArgValue(names)
  if (!raw) return null
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}
function warnDeprecated(oldName, newName) {
  if (process.argv.includes(`--${oldName}`)) {
    console.warn(`[matrix] --${oldName} is deprecated; use --${newName} (or short alias) instead`)
  }
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

// New flags (preferred): --react, --typescript, --eslint, --prettier, --biome
// Short aliases: -r, -t, -e, -p, -b
const rArg = parseListArgMulti(['--react', '-r'])
const tArg = parseListArgMulti(['--typescript', '-t'])
const eArg = parseListArgMulti(['--eslint', '-e'])
const pArg = parseListArgMulti(['--prettier', '-p'])
const bArg = parseListArgMulti(['--biome', '-b'])
if (rArg) REACTS = filterAllowed('react', REACTS, rArg)
if (tArg) TYPES = filterAllowed('typescript', TYPES, tArg)
if (eArg) ESLINTS = filterAllowed('eslint', ESLINTS, eArg)
if (pArg) PRETTIERS = filterAllowed('prettier', PRETTIERS, pArg)
if (bArg) BIOMES = filterAllowed('biome', BIOMES, bArg)

// Soft deprecation warnings for legacy flags (still parsed via parseArgValue if present)
warnDeprecated('reacts', 'react')
warnDeprecated('types', 'typescript')

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

function shAsync(cmd, cwd, logFile) {
  return new Promise((resolve) => {
    exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const out = (stdout || '') + (stderr ? '\n' + stderr : '')
      if (logFile) fs.writeFileSync(logFile, out)
      resolve({ ok: !error, out })
    })
  })
}

async function runScenario(react, ts, eslint, prettier, biome, tarballName, appDirForRun) {
  const scenario = slug([`react-${react}`, `ts-${ts}`, `eslint-${eslint}`, `prettier-${prettier}`, `biome-${biome}`])
  const dir = path.join(logsRoot, scenario)
  fs.mkdirSync(dir, { recursive: true })

  const pinCmd = `node version-compatibility-tests/scripts/consumer-pin-and-build.mjs --react ${react} --react-dom ${react} --typescript ${ts} --eslint ${eslint} --prettier ${prettier} --biome ${biome} --tarball version-compatibility-tests/dist/${tarballName} --app-dir ${path.relative(root, appDirForRun)}`
  const pinRes = await shAsync(pinCmd, root, path.join(dir, 'pin-and-build.log'))

  // After build, run quick checks again to capture statuses independently
  const buildRes = await shAsync('pnpm exec vite build', appDirForRun, path.join(dir, 'build.log'))
  const lintRes = await shAsync('pnpm exec eslint .', appDirForRun, path.join(dir, 'eslint.log'))
  const formatRes = await shAsync('pnpm exec prettier --check .', appDirForRun, path.join(dir, 'prettier.log'))
  const biomeRes = await shAsync('pnpm exec biome check .', appDirForRun, path.join(dir, 'biome.log'))

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

async function main() {
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
  const comboList = Array.from(combos())

  // Concurrency setup
  const cpuCount = Math.max(1, os.cpus()?.length || 1)
  const maxDefault = Math.min(4, Math.max(1, cpuCount - 1))
  function parseParallel() {
    const idx = process.argv.indexOf('--parallel')
    let n = idx !== -1 ? parseInt(process.argv[idx + 1], 10) : parseInt(process.env.PARALLEL || '1', 10)
    if (!Number.isFinite(n) || n < 1) n = 1
    n = Math.min(n, 8)
    return n
  }
  const parallel = parseParallel()
  const workRoot = path.join(root, 'version-compatibility-tests', '.work', path.basename(logsRoot))
  fs.mkdirSync(workRoot, { recursive: true })
  const workers = []
  let next = 0

  function prepareWorkerDir(i) {
    const workerDir = path.join(workRoot, `w-${i}`, 'consumer-app')
    fs.mkdirSync(path.dirname(workerDir), { recursive: true })
    fs.cpSync(appDir, workerDir, { recursive: true, force: true })
    return workerDir
  }

  const workerAppDirs = Array.from({ length: parallel }, (_, i) => prepareWorkerDir(i))

  async function runWorker(i) {
    const appDirForRun = workerAppDirs[i]
    while (true) {
      const idx = next++
      if (idx >= comboList.length) break
      const [r, t, e, p, b] = comboList[idx]
      const res = await runScenario(r, t, e, p, b, tgz, appDirForRun)
      all.push(res)
    }
  }

  for (let i = 0; i < parallel; i++) workers.push(runWorker(i))
  await Promise.all(workers)
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
