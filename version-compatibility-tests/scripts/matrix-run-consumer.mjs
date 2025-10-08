#!/usr/bin/env node
// NOTE: This script remains ESM JavaScript to execute directly via `node`
// inside CI runners without a compilation step. Shared helpers are covered by tests.
import { execSync, exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const LOG_PREFIX = '[matrix]'
const MAX_EXEC_BUFFER = 10 * 1024 * 1024
const suiteDir = path.join(root, 'version-compatibility-tests')
const appDir = path.join(suiteDir, 'consumer-app')
const distDir = path.join(suiteDir, 'dist')
const logsRoot = path.join(suiteDir, 'logs', new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(logsRoot, { recursive: true })
const xfailPath = path.join(suiteDir, 'xfail.json')
const XFAIL = fs.existsSync(xfailPath) ? JSON.parse(fs.readFileSync(xfailPath, 'utf8')) : []

const DEFAULT_REACTS = ['18.3.1', '19.1.1']
const DEFAULT_TYPESCRIPT = ['5.2.2', '5.4.5', '5.9.3']
const DEFAULT_BIOMES = ['2.0.0', '2.1.1', '2.2.4']
const DEFAULT_ESLINTS = [
  { eslint: '8.57.0', eslintJs: '8.57.0', tsParser: '8.45.0' },
  { eslint: '9.13.0', eslintJs: '9.13.0', tsParser: '8.45.0' }
]
const DEFAULT_PRETTIERS = ['3.3.3', '3.6.2']

let REACTS = [...DEFAULT_REACTS]
let TYPESCRIPT_VERSIONS = [...DEFAULT_TYPESCRIPT]
let BIOME_VERSIONS = [...DEFAULT_BIOMES]
let ESLINT_VERSIONS = [...DEFAULT_ESLINTS]
let PRETTIER_VERSIONS = [...DEFAULT_PRETTIERS]
let LINTER_FAMILIES = new Set(['biome', 'eslint-prettier'])

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

function parseListArg(names) {
  const raw = parseArgValue(names)
  if (!raw) return null
  return raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

function warnDeprecated(oldName, newName) {
  if (process.argv.includes(`--${oldName}`)) {
    console.warn(`${LOG_PREFIX} --${oldName} is deprecated; use --${newName}`)
  }
}

function filterAllowed(name, current, requested) {
  const set = new Set(current)
  const out = []
  const bad = []
  for (const value of requested) {
    if (set.has(value)) out.push(value)
    else bad.push(value)
  }
  if (bad.length) {
    console.warn(`${LOG_PREFIX} Ignoring unsupported ${name} values: ${bad.join(', ')}`)
  }
  return out.length ? out : current
}

function filterEslintProfiles(requested) {
  const map = new Map(ESLINT_VERSIONS.map(profile => [profile.eslint, profile]))
  const out = requested.map(ver => map.get(ver)).filter(Boolean)
  if (out.length !== requested.length) {
    const bad = requested.filter(ver => !map.has(ver))
    console.warn(`${LOG_PREFIX} Ignoring unsupported eslint values: ${bad.join(', ')}`)
  }
  return out.length ? out : ESLINT_VERSIONS
}

const quick = process.env.QUICK === '1' || process.argv.includes('--quick')
if (quick) {
  REACTS = [REACTS[REACTS.length - 1]]
  TYPESCRIPT_VERSIONS = [TYPESCRIPT_VERSIONS[TYPESCRIPT_VERSIONS.length - 1]]
  BIOME_VERSIONS = [BIOME_VERSIONS[BIOME_VERSIONS.length - 1]]
  ESLINT_VERSIONS = [ESLINT_VERSIONS[ESLINT_VERSIONS.length - 1]]
  PRETTIER_VERSIONS = [PRETTIER_VERSIONS[PRETTIER_VERSIONS.length - 1]]
}

const reactArg = parseListArg(['--react', '-r'])
const tsArg = parseListArg(['--typescript', '-t'])
const biomeArg = parseListArg(['--biome', '-b'])
const eslintArg = parseListArg(['--eslint'])
const prettierArg = parseListArg(['--prettier'])
const linterFamilyArg = parseListArg(['--linter', '-l'])

if (reactArg) REACTS = filterAllowed('react', REACTS, reactArg)
if (tsArg) TYPESCRIPT_VERSIONS = filterAllowed('typescript', TYPESCRIPT_VERSIONS, tsArg)
if (biomeArg) BIOME_VERSIONS = filterAllowed('biome', BIOME_VERSIONS, biomeArg)
if (eslintArg) ESLINT_VERSIONS = filterEslintProfiles(eslintArg)
if (prettierArg) PRETTIER_VERSIONS = filterAllowed('prettier', PRETTIER_VERSIONS, prettierArg)
if (linterFamilyArg) {
  const allowed = new Set(['biome', 'eslint-prettier'])
  const next = new Set()
  for (const entry of linterFamilyArg) {
    if (allowed.has(entry)) next.add(entry)
    else console.warn(`${LOG_PREFIX} Ignoring unsupported linter family: ${entry}`)
  }
  if (next.size) LINTER_FAMILIES = next
}

warnDeprecated('reacts', 'react')
warnDeprecated('types', 'typescript')

function slug(parts) {
  return parts
    .map(part => part.replace(/[^a-z0-9.\-]+/gi, '-'))
    .join('+')
    .toLowerCase()
}

function sh(cmd, cwd, logFile) {
  try {
    const out = execSync(cmd, { cwd, stdio: 'pipe' }).toString()
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: true, out }
  } catch (error) {
    const out = `${error.stdout?.toString() || ''}${error.stderr ? '\n' + error.stderr.toString() : ''}`
    if (logFile) fs.writeFileSync(logFile, out)
    return { ok: false, out }
  }
}

function shAsync(cmd, cwd, logFile) {
  return new Promise(resolve => {
    exec(cmd, { cwd, maxBuffer: MAX_EXEC_BUFFER }, (error, stdout, stderr) => {
      const out = `${stdout || ''}${stderr ? '\n' + stderr : ''}`
      if (logFile) fs.writeFileSync(logFile, out)
      resolve({ ok: !error, out })
    })
  })
}

/**
 * Generate a slug identifier for a scenario
 * @param {Object} details - Scenario details
 * @param {string} details.react - React version
 * @param {string} details.typescript - TypeScript version
 * @param {Object} details.linter - Linter configuration
 * @returns {string} Slug string
 */
function scenarioSlug(details) {
  const base = [`react-${details.react}`, `ts-${details.typescript}`]
  if (details.linter.tool === 'biome') {
    base.push(`biome-${details.linter.version}`)
  } else {
    base.push(`eslint-${details.linter.eslint}`, `prettier-${details.linter.prettier}`)
  }
  return slug(base)
}

/**
 * Generate list of all test scenarios from configured version matrices
 * @returns {Array<Object>} Array of scenario objects
 */
function listScenarios() {
  const scenarios = []
  const lintFamilies = Array.from(LINTER_FAMILIES)
  for (const react of REACTS) {
    for (const typescript of TYPESCRIPT_VERSIONS) {
      for (const family of lintFamilies) {
        if (family === 'biome') {
          for (const version of BIOME_VERSIONS) {
            scenarios.push({
              react,
              typescript,
              linter: { tool: 'biome', version }
            })
          }
        } else if (family === 'eslint-prettier') {
          for (const eslintProfile of ESLINT_VERSIONS) {
            for (const prettier of PRETTIER_VERSIONS) {
              scenarios.push({
                react,
                typescript,
                linter: {
                  tool: 'eslint-prettier',
                  eslint: eslintProfile.eslint,
                  eslintJs: eslintProfile.eslintJs,
                  tsParser: eslintProfile.tsParser,
                  prettier
                }
              })
            }
          }
        }
      }
    }
  }
  return scenarios
}

/**
 * Check if an XFAIL entry matches a scenario
 * @param {Object} entry - XFAIL entry from xfail.json
 * @param {Object} scenario - Test scenario
 * @param {string} scenario.react - React version
 * @param {string} scenario.typescript - TypeScript version
 * @param {Object} scenario.linter - Linter configuration
 * @param {string} scenario.linter.tool - Linter tool name ('biome' or 'eslint-prettier')
 * @returns {boolean}
 */
export function matchesXfail(entry, scenario) {
  if (entry.react && entry.react !== scenario.react) return false
  if (entry.typescript && entry.typescript !== scenario.typescript) return false
  const tool = scenario.linter.tool
  if (tool === 'biome') {
    if (entry.linter && entry.linter !== 'biome') return false
    if (entry.biome && entry.biome !== scenario.linter.version) return false
    if (entry.eslint || entry.prettier) return false
  } else {
    if (entry.linter && entry.linter !== 'eslint-prettier') return false
    if (entry.eslint && entry.eslint !== scenario.linter.eslint) return false
    if (entry.prettier && entry.prettier !== scenario.linter.prettier) return false
    if (entry.biome) return false
  }
  return true
}

/**
 * Run a single test scenario
 * @param {Object} scenario - Test scenario configuration
 * @param {string} scenario.react - React version
 * @param {string} scenario.typescript - TypeScript version
 * @param {Object} scenario.linter - Linter configuration
 * @param {string} tarballName - Name of the tarball file to install
 * @param {string} appDirForRun - Consumer app directory for this scenario
 * @returns {Promise<Object>} Scenario result with outcome and version info
 */
async function runScenario(scenario, tarballName, appDirForRun) {
  const { react, typescript, linter } = scenario
  const scenarioId = scenarioSlug(scenario)
  const dir = path.join(logsRoot, scenarioId)
  fs.mkdirSync(dir, { recursive: true })

  const args = [
    `--react ${react}`,
    `--react-dom ${react}`,
    `--typescript ${typescript}`,
    `--tarball version-compatibility-tests/dist/${tarballName}`,
    `--app-dir ${path.relative(root, appDirForRun)}`
  ]

  if (linter.tool === 'biome') {
    args.push(`--biome ${linter.version}`)
  } else {
    args.push(`--eslint ${linter.eslint}`)
    args.push(`--eslint-js ${linter.eslintJs}`)
    args.push(`--ts-eslint-parser ${linter.tsParser}`)
    args.push(`--prettier ${linter.prettier}`)
  }

  const pinCmd = `node version-compatibility-tests/scripts/consumer-pin-and-build.mjs ${args.join(' ')}`
  const pinRes = await shAsync(pinCmd, root, path.join(dir, 'pin-and-build.log'))

  const buildRes = await shAsync('pnpm exec vite build', appDirForRun, path.join(dir, 'build.log'))

  const lintSteps = {}
  if (linter.tool === 'biome') {
    lintSteps.biome = await shAsync('pnpm exec biome check src', appDirForRun, path.join(dir, 'biome.log'))
  } else {
    lintSteps.eslint = await shAsync('pnpm exec eslint --config eslint.config.mjs "src/**/*.{ts,tsx,js,jsx}"', appDirForRun, path.join(dir, 'eslint.log'))
    lintSteps.prettier = await shAsync(
      'pnpm exec prettier --config .prettierrc.json --check "src/**/*.{ts,tsx,js,jsx}"',
      appDirForRun,
      path.join(dir, 'prettier.log')
    )
  }

  const steps = {
    pin_and_build: pinRes.ok,
    build: buildRes.ok,
    ...Object.fromEntries(Object.entries(lintSteps).map(([k, v]) => [k, v.ok]))
  }

  const allStepsSucceeded = Object.values(steps).every(Boolean)
  const expectedFail = XFAIL.some(entry => matchesXfail(entry, scenario))
  const outcome = expectedFail
    ? (allStepsSucceeded ? 'XPASS' : 'XFAIL')
    : (allStepsSucceeded ? 'PASS' : 'FAIL')

  const summary = {
    scenario: scenarioId,
    versions: {
      react,
      typescript,
      linter: linter.tool === 'biome'
        ? { tool: 'biome', version: linter.version }
        : {
            tool: 'eslint-prettier',
            eslint: linter.eslint,
            prettier: linter.prettier,
            eslintJs: linter.eslintJs,
            tsParser: linter.tsParser
          }
    },
    steps,
    expected_fail: expectedFail,
    outcome,
    logs: dir
  }

  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`${LOG_PREFIX} ${scenarioId}:`, steps)
  return summary
}

function parseParallel() {
  const idx = process.argv.indexOf('--parallel')
  let value = idx !== -1 ? parseInt(process.argv[idx + 1], 10) : parseInt(process.env.PARALLEL || '1', 10)
  if (!Number.isFinite(value) || value < 1) value = 1
  value = Math.min(value, 8)
  return value
}

function prepareWorkerDir(workRoot, i) {
  const workerDir = path.join(workRoot, `w-${i}`, 'consumer-app')
  fs.mkdirSync(path.dirname(workerDir), { recursive: true })
  fs.cpSync(appDir, workerDir, { recursive: true, force: true })
  return workerDir
}

async function main() {
  fs.mkdirSync(distDir, { recursive: true })
  sh('pnpm pack --pack-destination version-compatibility-tests/dist', root, path.join(logsRoot, 'pack.log'))
  const tgz = fs
    .readdirSync(distDir)
    .filter(f => f.endsWith('.tgz'))
    .map(f => ({ f, t: fs.statSync(path.join(distDir, f)).ctimeMs }))
    .sort((a, b) => {
      const timeDiff = b.t - a.t
      return timeDiff !== 0 ? timeDiff : b.f.localeCompare(a.f)
    })[0]?.f
  if (!tgz) {
    console.error(`${LOG_PREFIX} Failed to find packed tarball under dist`)
    process.exit(1)
  }

  const scenarios = listScenarios()
  const parallel = parseParallel()
  const workRoot = path.join(suiteDir, '.work', path.basename(logsRoot))
  fs.mkdirSync(workRoot, { recursive: true })
  const workerAppDirs = Array.from({ length: parallel }, (_, i) => prepareWorkerDir(workRoot, i))

  const results = []
  // Thread-safe: Node.js is single-threaded, so the shared `next` counter
  // increments atomically within the event loop. Each worker's async iteration
  // yields control, allowing other workers to run without race conditions.
  let next = 0

  async function runWorker(workerIndex) {
    const appDirForRun = workerAppDirs[workerIndex]
    while (true) {
      const currentIndex = next++
      if (currentIndex >= scenarios.length) break
      const scenario = scenarios[currentIndex]
      const res = await runScenario(scenario, tgz, appDirForRun)
      results.push(res)
    }
  }

  const workers = Array.from({ length: parallel }, (_, i) => runWorker(i))
  await Promise.all(workers)

  const summaryPath = path.join(logsRoot, 'MATRIX_SUMMARY.json')
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2))

  const counts = {
    total: results.length,
    pass: results.filter(s => s.outcome === 'PASS').length,
    fail: results.filter(s => s.outcome === 'FAIL').length,
    xfail: results.filter(s => s.outcome === 'XFAIL').length,
    xpass: results.filter(s => s.outcome === 'XPASS').length
  }

  const latest = {
    generatedAt: new Date().toISOString(),
    summaryPath,
    totals: counts
  }
  fs.writeFileSync(path.join(suiteDir, 'MATRIX_LATEST.json'), JSON.stringify(latest, null, 2))
  console.log(`${LOG_PREFIX}\nMatrix results written to ${summaryPath}`)
  console.log(`${LOG_PREFIX} Latest summary pointer written to version-compatibility-tests/MATRIX_LATEST.json`)

  const summaryLog = path.join(logsRoot, 'summarize.log')
  const summarizeCmd = `node version-compatibility-tests/scripts/summarize-matrix.mjs ${summaryPath}`
  const summaryRes = sh(summarizeCmd, root, summaryLog)
  if (!summaryRes.ok) {
    console.error(`${LOG_PREFIX} Failed to generate Markdown summary. See ${summaryLog}`)
    process.exit(1)
  }

  const hasBlockingOutcome = counts.fail > 0 || counts.xpass > 0
  if (hasBlockingOutcome) {
    console.error(
      `${LOG_PREFIX} Blocking scenarios detected (FAIL=${counts.fail}, XPASS=${counts.xpass}). See logs under ${logsRoot}`
    )
    process.exit(1)
  }

  if (counts.xfail > 0) {
    console.warn(`${LOG_PREFIX} ${counts.xfail} scenarios marked as expected failures.`)
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
