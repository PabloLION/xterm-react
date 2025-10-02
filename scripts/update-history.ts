/*
  Append a row to HISTORY.md based on the latest matrix run.
  - Reads version-compatibility-tests/MATRIX_LATEST.json to find summary JSON
  - Aggregates totals and unique version sets per dimension
  - Parses HISTORY.md (first table) and appends a new row if the date is new
*/
import fs from 'node:fs'
import path from 'node:path'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import { visit } from 'unist-util-visit'

const root = process.cwd()
const latestPtr = path.join(root, 'version-compatibility-tests', 'MATRIX_LATEST.json')
const historyPath = path.join(root, 'HISTORY.md')

function loadLatestSummaryPath(): { generatedAt: string, summaryPath: string } {
  if (!fs.existsSync(latestPtr)) throw new Error('Missing MATRIX_LATEST.json at ' + latestPtr)
  const p = JSON.parse(fs.readFileSync(latestPtr, 'utf8'))
  if (!p.summaryPath || !fs.existsSync(p.summaryPath)) throw new Error('Invalid summaryPath in MATRIX_LATEST.json')
  return { generatedAt: p.generatedAt, summaryPath: p.summaryPath }
}

type Scenario = {
  outcome?: 'PASS' | 'FAIL' | 'XFAIL' | 'XPASS',
  steps?: { pin_and_build?: boolean, build?: boolean },
  versions?: { react?: string, ts?: string, eslint?: string, prettier?: string, biome?: string }
}

function aggregate(summaryPath: string) {
  const arr: Scenario[] = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  const counts = { PASS: 0, FAIL: 0, XFAIL: 0, XPASS: 0 }
  const sets = { react: new Set<string>(), ts: new Set<string>(), eslint: new Set<string>(), prettier: new Set<string>(), biome: new Set<string>() }
  for (const s of arr) {
    const outcome = s.outcome || ((s.steps?.build && s.steps?.pin_and_build) ? 'PASS' : 'FAIL')
    // @ts-expect-error index type
    counts[outcome] = (counts as any)[outcome] + 1
    if (s.versions?.react) sets.react.add(s.versions.react)
    if (s.versions?.ts) sets.ts.add(s.versions.ts)
    if (s.versions?.eslint) sets.eslint.add(s.versions.eslint)
    if (s.versions?.prettier) sets.prettier.add(s.versions.prettier)
    if (s.versions?.biome) sets.biome.add(s.versions.biome)
  }
  function fmt(set: Set<string>) {
    return Array.from(set).sort().join(', ')
  }
  return {
    counts,
    react: fmt(sets.react),
    typescript: fmt(sets.ts),
    eslint: fmt(sets.eslint),
    prettier: fmt(sets.prettier),
    biome: fmt(sets.biome)
  }
}

function code(s: string): any { return { type: 'inlineCode', value: s } }
function text(s: string): any { return { type: 'text', value: s } }

function appendRow(historyMd: string, dateIso: string, agg: ReturnType<typeof aggregate>) {
  const ast = fromMarkdown(historyMd, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  let tableFound = false
  visit(ast, 'table', (node: any) => {
    if (tableFound) return
    tableFound = true
    // Detect duplicate date
    const exists = node.children?.some((row: any, idx: number) => idx > 0 && row.children?.[0]?.children?.[0]?.value === dateIso)
    if (exists) return
    const row = {
      type: 'tableRow',
      children: [
        { type: 'tableCell', children: [text(dateIso)] },
        { type: 'tableCell', children: [text(String(agg.counts.PASS))] },
        { type: 'tableCell', children: [text(String(agg.counts.FAIL))] },
        { type: 'tableCell', children: [code(agg.react)] },
        { type: 'tableCell', children: [code(agg.typescript)] },
        { type: 'tableCell', children: [code(agg.eslint)] },
        { type: 'tableCell', children: [code(agg.prettier)] },
        { type: 'tableCell', children: [code(agg.biome)] }
      ]
    }
    node.children.push(row)
  })
  return toMarkdown(ast as any, { extensions: [gfmToMarkdown()] })
}

function main() {
  const { generatedAt, summaryPath } = loadLatestSummaryPath()
  const agg = aggregate(summaryPath)
  const md = fs.readFileSync(historyPath, 'utf8')
  const out = appendRow(md, (generatedAt || new Date().toISOString()).replace(/\..*Z$/, 'Z'), agg)
  fs.writeFileSync(historyPath, out)
  console.log('HISTORY.md updated for run at', generatedAt)
}

main()
