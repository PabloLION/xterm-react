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
const RUNTIME_CATALOG = [
  { id: 'node20', tool: 'node', versionSpec: '20', label: 'node20' },
  { id: 'node22', tool: 'node', versionSpec: '22', label: 'node22' },
  { id: 'node24', tool: 'node', versionSpec: '24', label: 'node24' }
]
const RUNTIME_IDS = new Set(RUNTIME_CATALOG.map(runtime => runtime.id))
const DEFAULT_RUNTIME_IDS = ['node20']
const xfailPath = path.join(suiteDir, 'xfail.json')
const XFAIL = (() => {
  if (!fs.existsSync(xfailPath)) return []
  const raw = JSON.parse(fs.readFileSync(xfailPath, 'utf8'))
  if (!Array.isArray(raw)) {
    throw new Error(`${LOG_PREFIX} xfail.json must contain an array of entries`)
  }
  return raw.map((entry, index) => {
    try {
      validateXfailEntry(entry)
    } catch (error) {
      throw new Error(`${LOG_PREFIX} Invalid xfail entry at index ${index}: ${error.message}`)
    }
    return entry
  })
})()

export function validateXfailEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('entry must be an object')
  if (!entry.react) throw new Error('missing "react" field')
  if (!entry.typescript) throw new Error('missing "typescript" field')
  if (!entry.linter) throw new Error('missing "linter" field')
  if (entry.runtime) {
    if (typeof entry.runtime !== 'string') throw new Error('"runtime" must be a string when provided')
    if (!RUNTIME_IDS.has(entry.runtime)) throw new Error(`runtime "${entry.runtime}" is not recognised`)
  }

  if (entry.linter === 'biome') {
    if (!entry.biome) throw new Error('biome entries must include "biome" version')
  } else if (entry.linter === 'eslint-prettier') {
    if (!entry.eslint) throw new Error('eslint-prettier entries must include "eslint" version')
    if (!entry.prettier) throw new Error('eslint-prettier entries must include "prettier" version')
  } else {
    throw new Error(`unsupported linter "${entry.linter}"`)
  }
}

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
let RUNTIMES = DEFAULT_RUNTIME_IDS.map(id => RUNTIME_CATALOG.find(runtime => runtime.id === id)).filter(Boolean)

const originalNodeVersion = process.version.startsWith('v') ? process.version.slice(1) : process.version
let restoreNodeVersion = null
let runtimeMutated = false

function parseListArg(names) {
  const argv = process.argv.slice(2)
  let lastMatch = null
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!names.includes(token)) continue
    const value = argv[i + 1]
    if (!value) continue
    lastMatch = value
    i += 1
  }
  if (!lastMatch) return null
  return lastMatch
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
const runtimeArg = parseListArg(['--runtime'])

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

if (runtimeArg) {
  const catalogMap = new Map(RUNTIME_CATALOG.map(runtime => [runtime.id, runtime]))
  let requested = runtimeArg
  if (runtimeArg.includes('all')) {
    requested = RUNTIME_CATALOG.map(runtime => runtime.id)
  }
  const filtered = requested
    .map(id => {
      if (!catalogMap.has(id)) {
        console.warn(`${LOG_PREFIX} Ignoring unsupported runtime: ${id}`)
        return null
      }
      const runtime = catalogMap.get(id)
      return runtime
    })
    .filter(Boolean)
  if (filtered.length) {
    RUNTIMES = filtered
  } else {
    console.warn(`${LOG_PREFIX} Falling back to default runtime set (${DEFAULT_RUNTIME_IDS.join(', ')})`)
    RUNTIMES = DEFAULT_RUNTIME_IDS.map(id => RUNTIME_CATALOG.find(runtime => runtime.id === id)).filter(Boolean)
  }
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
  const base = [`runtime-${details.runtime.label}`, `react-${details.react}`, `ts-${details.typescript}`]
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
  for (const runtime of RUNTIMES) {
    for (const react of REACTS) {
      for (const typescript of TYPESCRIPT_VERSIONS) {
        for (const family of lintFamilies) {
          if (family === 'biome') {
            for (const version of BIOME_VERSIONS) {
              scenarios.push({
                runtime,
                react,
                typescript,
                linter: { tool: 'biome', version }
              })
            }
          } else if (family === 'eslint-prettier') {
            for (const eslintProfile of ESLINT_VERSIONS) {
              for (const prettier of PRETTIER_VERSIONS) {
                scenarios.push({
                  runtime,
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
  }
  return scenarios
}

/**
 * Check if an XFAIL entry matches a scenario
 * @param {Object} entry - XFAIL entry from xfail.json
 * @param {Object} scenario - Test scenario
 * @param {Object} scenario.runtime - Runtime descriptor
 * @param {string} scenario.react - React version
 * @param {string} scenario.typescript - TypeScript version
 * @param {Object} scenario.linter - Linter configuration
 * @param {string} scenario.linter.tool - Linter tool name ('biome' or 'eslint-prettier')
 * @returns {boolean}
 */
export function matchesXfail(entry, scenario) {
  if (entry.runtime && entry.runtime !== scenario.runtime?.id) return false
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
  const { runtime, react, typescript, linter } = scenario
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
      runtime: {
        id: runtime.id,
        tool: runtime.tool,
        version: runtime.versionSpec
      },
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

const WORKER_ALWAYS_COPY = new Set(['package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'])
const WORKER_SKIP = new Set(['node_modules', 'dist'])

function symlinkOrCopy(source, target, isDirectory) {
  try {
    fs.symlinkSync(source, target, isDirectory ? 'dir' : 'file')
  } catch {
    if (isDirectory) {
      fs.cpSync(source, target, { recursive: true })
    } else {
      fs.copyFileSync(source, target)
    }
  }
}

function prepareWorkerDir(workRoot, i) {
  const workerDir = path.join(workRoot, `w-${i}`, 'consumer-app')
  fs.rmSync(path.dirname(workerDir), { recursive: true, force: true })
  fs.mkdirSync(workerDir, { recursive: true })

  const entries = fs.readdirSync(appDir, { withFileTypes: true })
  for (const entry of entries) {
    const name = entry.name
    if (WORKER_SKIP.has(name)) continue
    const sourcePath = path.join(appDir, name)
    const targetPath = path.join(workerDir, name)

    if (entry.isSymbolicLink()) {
      let resolvedTarget = null
      let targetStat = null
      try {
        const linkTarget = fs.readlinkSync(sourcePath)
        resolvedTarget = path.isAbsolute(linkTarget) ? linkTarget : path.resolve(path.dirname(sourcePath), linkTarget)
        targetStat = fs.statSync(resolvedTarget)
        symlinkOrCopy(resolvedTarget, targetPath, targetStat.isDirectory())
      } catch (error) {
        if (!resolvedTarget || !targetStat) {
          try {
            resolvedTarget = fs.realpathSync(sourcePath)
            targetStat = fs.statSync(resolvedTarget)
          } catch (innerError) {
            console.warn(`${LOG_PREFIX} Failed to resolve symlink ${sourcePath}: ${innerError?.message || innerError}`)
          }
        }
        console.warn(`${LOG_PREFIX} Failed to recreate symlink ${sourcePath}: ${error?.message || error}. Falling back to copy.`)
        const fallbackSource = resolvedTarget || sourcePath
        let fallbackStat = targetStat
        if (!fallbackStat) {
          try {
            fallbackStat = fs.statSync(fallbackSource)
          } catch (statError) {
            console.warn(`${LOG_PREFIX} Failed to stat fallback source ${fallbackSource}: ${statError?.message || statError}`)
          }
        }
        if (fallbackStat?.isDirectory()) {
          fs.cpSync(fallbackSource, targetPath, { recursive: true, dereference: true })
        } else {
          fs.copyFileSync(fallbackSource, targetPath)
        }
      }
      continue
    }

    if (WORKER_ALWAYS_COPY.has(name)) {
      fs.copyFileSync(sourcePath, targetPath)
      continue
    }

    if (entry.isDirectory()) {
      symlinkOrCopy(sourcePath, targetPath, true)
    } else if (entry.isFile()) {
      symlinkOrCopy(sourcePath, targetPath, false)
    }
  }
  return workerDir
}

let activeRuntimeKey = null

function ensureRuntime(runtime) {
  const key = `${runtime.tool}:${runtime.versionSpec}`
  if (activeRuntimeKey === key) return true
  if (runtime.tool === 'node') {
    const logFile = path.join(logsRoot, `runtime-${runtime.label}.log`)
    console.log(`${LOG_PREFIX} Activating runtime ${runtime.label}`)
    if (!restoreNodeVersion) restoreNodeVersion = originalNodeVersion
    const res = sh(`pnpm env use --global ${runtime.versionSpec}`, root, logFile)
    if (!res.ok) {
      const error = new Error(`Failed to activate Node runtime ${runtime.label}`)
      error.output = res.out
      throw error
    }
    activeRuntimeKey = key
    runtimeMutated = true
    return true
  }

  console.warn(`${LOG_PREFIX} Runtime ${runtime.label} (${runtime.tool}) is not implemented yet; skipping scenarios`)
  activeRuntimeKey = key
  return false
}

function restoreNodeRuntime() {
  if (!runtimeMutated || !restoreNodeVersion) return
  const logFile = path.join(logsRoot, 'runtime-restore.log')
  const res = sh(`pnpm env use --global ${restoreNodeVersion}`, root, logFile)
  if (!res.ok) {
    console.warn(`${LOG_PREFIX} Failed to restore Node runtime ${restoreNodeVersion}: ${res.out}`)
  } else {
    activeRuntimeKey = `node:${restoreNodeVersion}`
  }
  runtimeMutated = false
}

async function main() {
  try {
    fs.mkdirSync(distDir, { recursive: true })
    sh('pnpm pack --pack-destination version-compatibility-tests/dist', root, path.join(logsRoot, 'pack.log'))
    const tgz = fs
      .readdirSync(distDir)
      .filter(f => f.endsWith('.tgz'))
      .map(f => ({ f, t: fs.statSync(path.join(distDir, f)).ctimeMs }))
      .sort((a, b) => {
        const timeDiff = b.t - a.t
        if (timeDiff !== 0) return timeDiff
        // When multiple packs land within the same millisecond, prefer the lexicographically
        // greatest filename (pnpm appends incremental suffixes) so the newest tarball wins.
        return b.f.localeCompare(a.f)
      })[0]?.f
    if (!tgz) {
      throw new Error(`${LOG_PREFIX} Failed to find packed tarball under dist`)
    }

    const scenarios = listScenarios()
    const scenariosByRuntime = new Map()
    for (const scenario of scenarios) {
      const list = scenariosByRuntime.get(scenario.runtime.id) || []
      list.push(scenario)
      scenariosByRuntime.set(scenario.runtime.id, list)
    }

    const requestedParallel = parseParallel()
    const results = []

    for (const runtime of RUNTIMES) {
      const batch = scenariosByRuntime.get(runtime.id)
      if (!batch || !batch.length) continue

      if (!ensureRuntime(runtime)) {
        console.warn(`${LOG_PREFIX} Skipping scenarios for runtime ${runtime.label}`)
        continue
      }

      const parallel = Math.min(requestedParallel, batch.length)
      console.log(`${LOG_PREFIX} Runtime ${runtime.label}: ${batch.length} scenarios (parallel ${parallel})`)

      const workRoot = path.join(suiteDir, '.work', `${path.basename(logsRoot)}-${runtime.id}`)
      fs.mkdirSync(workRoot, { recursive: true })
      const workerAppDirs = Array.from({ length: parallel }, (_, i) => prepareWorkerDir(workRoot, i))

      let next = 0
      const batchResults = []

      async function runWorker(workerIndex) {
        const appDirForRun = workerAppDirs[workerIndex]
        while (true) {
          const currentIndex = next++
          if (currentIndex >= batch.length) break
          const scenario = batch[currentIndex]
          try {
            const res = await runScenario(scenario, tgz, appDirForRun)
            batchResults.push(res)
          } catch (error) {
            const scenarioId = scenarioSlug(scenario)
            console.error(`${LOG_PREFIX} ${scenarioId}: unexpected error`, error)
            throw error
          }
        }
      }

      const workers = Array.from({ length: parallel }, (_, i) => runWorker(i))
      await Promise.all(workers)
      results.push(...batchResults)
    }

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
      const error = new Error('Markdown summary generation failed')
      error.summaryLog = summaryLog
      throw error
    }

    const hasBlockingOutcome = counts.fail > 0 || counts.xpass > 0
    if (hasBlockingOutcome) {
      console.error(
        `${LOG_PREFIX} Blocking scenarios detected (FAIL=${counts.fail}, XPASS=${counts.xpass}). See logs under ${logsRoot}`
      )
      const error = new Error('Blocking scenarios detected')
      error.summaryPath = summaryPath
      error.counts = counts
      throw error
    }

    if (counts.xfail > 0) {
      console.warn(`${LOG_PREFIX} ${counts.xfail} scenarios marked as expected failures.`)
    }
  } finally {
    restoreNodeRuntime()
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
  main().catch(error => {
    console.error(`${LOG_PREFIX} Unhandled error`, error)
    process.exit(1)
  })
}
