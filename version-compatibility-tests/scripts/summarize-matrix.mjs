#!/usr/bin/env node
import fs from 'node:fs'
import { rootDir, suiteDir, logsDir, latestPointerPath } from '../lib/fs/paths.mjs'
import { findLatestSummary } from '../lib/summary/files.mjs'
import { aggregateResults, renderMarkdown } from '../lib/summary/render.mjs'
import { writeSummaryMarkdown, updateReadmeBadge } from '../lib/summary/artifacts.mjs'

function resolveSummaryPath(arg) {
  if (arg && fs.existsSync(arg)) {
    return arg
  }
  return findLatestSummary({
    suiteDir,
    logsDir,
    latestPointerPath
  })
}

function main() {
  const summaryPath = resolveSummaryPath(process.argv[2])
  const results = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  const aggregates = aggregateResults(results)
  const markdown = renderMarkdown(summaryPath, aggregates)

  const { outPath, stable } = writeSummaryMarkdown({ summaryPath, markdown, suiteDir })
  console.log('Markdown summary written to', outPath)
  console.log('Stable alias updated at', stable)

  try {
    if (updateReadmeBadge({ rootDir, counts: aggregates.counts })) {
      console.log('README badge updated')
    }
  } catch (error) {
    console.warn('Failed to update README badge:', error?.message || String(error))
  }

  console.log('\n---\n')
  console.log(markdown)
}

main()
