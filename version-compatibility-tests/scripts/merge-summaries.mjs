#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)

function parseSummaries(list) {
  const summaries = []
  for (let i = 0; i < list.length; i++) {
    const arg = list[i]
    if (arg === '--summary' && list[i + 1]) {
      summaries.push(list[++i])
    } else if (!arg.startsWith('--')) {
      summaries.push(arg)
    }
  }
  return summaries.filter(Boolean)
}

const summaries = parseSummaries(args)
const prefix = '[merge]'

const aggregate = []
const sources = []

for (const summaryPath of summaries) {
  if (!summaryPath) continue
  if (!fs.existsSync(summaryPath)) {
    console.warn(`${prefix} Summary ${summaryPath} not found; skipping`)
    continue
  }
  try {
    const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    if (Array.isArray(data) && data.length) {
      aggregate.push(...data)
      sources.push(summaryPath)
    }
  } catch (error) {
    console.warn(`${prefix} Failed to read ${summaryPath}: ${error.message}`)
  }
}

const outputFile = process.env.GITHUB_OUTPUT

if (!aggregate.length) {
  console.warn(`${prefix} No summary data provided`)
  if (outputFile) {
    fs.appendFileSync(outputFile, 'summary-path=\nsummary-dir=\n')
  }
  process.exit(0)
}

const suiteDir = path.join(process.cwd(), 'version-compatibility-tests')
const logsDir = path.join(suiteDir, 'logs')
const runId = process.env.GITHUB_RUN_ID || Date.now().toString()
const combinedDir = path.join(logsDir, `${runId}-combined`)
fs.mkdirSync(combinedDir, { recursive: true })

const combinedSummaryPath = path.join(combinedDir, 'MATRIX_SUMMARY.json')
fs.writeFileSync(combinedSummaryPath, JSON.stringify(aggregate, null, 2))
fs.writeFileSync(path.join(combinedDir, 'sources.json'), JSON.stringify(sources, null, 2))

const lines = [`summary-path=${combinedSummaryPath}`, `summary-dir=${combinedDir}`]
console.log(lines.join('\n'))

if (outputFile) {
  fs.appendFileSync(outputFile, lines.join('\n') + '\n')
}
