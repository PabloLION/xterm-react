#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)

function parseArgs(list) {
  const out = { label: '' }
  for (let i = 0; i < list.length; i++) {
    const arg = list[i]
    if (arg === '--label' && list[i + 1]) {
      out.label = list[++i]
    } else if (!arg.startsWith('--') && !out.label) {
      out.label = arg
    }
  }
  return out
}

const { label } = parseArgs(args)
const prefix = label ? `[summary:${label}]` : '[summary]'

const suiteDir = path.join(process.cwd(), 'version-compatibility-tests')
const latestPtr = path.join(suiteDir, 'MATRIX_LATEST.json')

let summaryPath = ''
let summaryDir = ''

if (fs.existsSync(latestPtr)) {
  try {
    const data = JSON.parse(fs.readFileSync(latestPtr, 'utf8'))
    summaryPath = data.summaryPath || ''
    summaryDir = summaryPath ? path.dirname(summaryPath) : ''
  } catch (error) {
    console.warn(`${prefix} Failed to read ${latestPtr}: ${error.message}`)
  }
} else {
  console.warn(`${prefix} ${latestPtr} does not exist`)
}

if (!summaryPath) {
  console.warn(`${prefix} No summary path detected`)
}

const lines = [`summary-path=${summaryPath}`, `summary-dir=${summaryDir}`]
console.log(lines.join('\n'))

const outputFile = process.env.GITHUB_OUTPUT
if (outputFile) {
  fs.appendFileSync(outputFile, lines.join('\n') + '\n')
}
