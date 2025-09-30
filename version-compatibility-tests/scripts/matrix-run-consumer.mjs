#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appDir = path.join(root, 'version-compatibility-tests', 'consumer-app')
const logsRoot = path.join(root, 'version-compatibility-tests', 'logs', new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(logsRoot, { recursive: true })

const REACTS = ['18.3.1', '19.1.1']
const TYPES = ['5.4.5', '5.9.3']
const ESLINTS = ['8-ts6', '9-ts8']
const PRETTIERS = ['2.8', '3.3']
const BIOMES = ['2.2.4']

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

function runScenario(react, ts, eslint, prettier, biome) {
  const scenario = slug([`react-${react}`, `ts-${ts}`, `eslint-${eslint}`, `prettier-${prettier}`, `biome-${biome}`])
  const dir = path.join(logsRoot, scenario)
  fs.mkdirSync(dir, { recursive: true })

  const pinCmd = `node ../scripts/consumer-pin-and-build.mjs --react ${react} --react-dom ${react} --typescript ${ts} --eslint ${eslint} --prettier ${prettier} --biome ${biome}`
  const pinRes = sh(pinCmd, path.join(root, 'version-compatibility-tests'), path.join(dir, 'pin-and-build.log'))

  // After build, run quick checks again to capture statuses independently
  const buildRes = sh('pnpm exec vite build', appDir, path.join(dir, 'build.log'))
  const lintRes = sh('pnpm exec eslint .', appDir, path.join(dir, 'eslint.log'))
  const formatRes = sh('pnpm exec prettier --check .', appDir, path.join(dir, 'prettier.log'))
  const biomeRes = sh('pnpm exec biome check .', appDir, path.join(dir, 'biome.log'))

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
  const all = []
  for (const [r, t, e, p, b] of combos()) all.push(runScenario(r, t, e, p, b))
  const summaryPath = path.join(logsRoot, 'MATRIX_SUMMARY.json')
  fs.writeFileSync(summaryPath, JSON.stringify(all, null, 2))
  console.log('\nMatrix results written to', summaryPath)
}

main()

