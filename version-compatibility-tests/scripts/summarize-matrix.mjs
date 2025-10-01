#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const suiteDir = path.join(root, 'version-compatibility-tests')
const logsDir = path.join(suiteDir, 'logs')

function findLatestSummary() {
  // Prefer MATRIX_LATEST.json pointer if present
  const latestPtr = path.join(suiteDir, 'MATRIX_LATEST.json')
  if (fs.existsSync(latestPtr)) {
    try {
      const p = JSON.parse(fs.readFileSync(latestPtr, 'utf8')).summaryPath
      if (p && fs.existsSync(p)) return p
    } catch {}
  }
  // Fallback: scan logs/ for newest folder
  const dirs = fs
    .readdirSync(logsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const full = path.join(logsDir, d.name)
      const t = fs.statSync(full).mtimeMs
      return { name: d.name, full, t }
    })
    .sort((a, b) => b.t - a.t)
  if (!dirs.length) throw new Error('No logs found in ' + logsDir)
  const candidate = path.join(dirs[0].full, 'MATRIX_SUMMARY.json')
  if (!fs.existsSync(candidate)) throw new Error('No MATRIX_SUMMARY.json in ' + dirs[0].full)
  return candidate
}

function summarize(summaryPath) {
  const arr = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  const counts = { PASS: 0, FAIL: 0, XFAIL: 0, XPASS: 0 }
  const byReact = new Map()
  const fails = []
  const xfails = []
  const xpasses = []

  for (const s of arr) {
    const outcome = s.outcome || (s.steps?.build && s.steps?.pin_and_build ? 'PASS' : 'FAIL')
    counts[outcome] = (counts[outcome] || 0) + 1
    const r = s.versions?.react || 'unknown'
    if (!byReact.has(r)) byReact.set(r, { PASS: 0, FAIL: 0, XFAIL: 0, XPASS: 0 })
    byReact.get(r)[outcome]++
    if (outcome === 'FAIL') fails.push(s)
    if (outcome === 'XFAIL') xfails.push(s)
    if (outcome === 'XPASS') xpasses.push(s)
  }

  const dir = path.dirname(summaryPath)
  let md = ''
  md += `# Compatibility Matrix Summary\n\n`
  md += `Summary path: \`${summaryPath}\`\n\n`
  md += `## Totals\n\n`
  md += `- Total: ${arr.length}\n`
  md += `- PASS: ${counts.PASS}\n`
  md += `- FAIL: ${counts.FAIL}\n`
  md += `- XFAIL: ${counts.XFAIL}\n`
  md += `- XPASS: ${counts.XPASS}\n\n`
  md += `## By React\n\n`
  for (const [react, c] of byReact.entries()) {
    md += `- ${react}: PASS ${c.PASS} / FAIL ${c.FAIL} / XFAIL ${c.XFAIL} / XPASS ${c.XPASS}\n`
  }
  md += `\n`
  if (fails.length) {
    md += `## FAIL\n\n`
    for (const s of fails) {
      md += `- ${s.scenario} — logs: ${s.logs}\n`
    }
    md += `\n`
  }
  if (xfails.length) {
    md += `## XFAIL (expected failures)\n\n`
    for (const s of xfails) {
      md += `- ${s.scenario} — logs: ${s.logs}\n`
    }
    md += `\n`
  }
  if (xpasses.length) {
    md += `## XPASS (unexpected passes)\n\n`
    for (const s of xpasses) {
      md += `- ${s.scenario} — logs: ${s.logs}\n`
    }
    md += `\n`
  }

  const outPath = path.join(dir, 'MATRIX_SUMMARY.md')
  fs.writeFileSync(outPath, md)
  // Also write a stable alias so README can link to the latest summary
  const stable = path.join(suiteDir, 'MATRIX_SUMMARY.md')
  const header = `<!-- Auto-generated: latest summary alias. Source: ${outPath} -->\n\n`
  fs.writeFileSync(stable, header + md)
  console.log('Markdown summary written to', outPath)
  console.log('Stable alias updated at', stable)

  // Update README with a compact badge-style line between markers
  try {
    const readmePath = path.join(root, 'README.md')
    if (fs.existsSync(readmePath)) {
      const begin = '<!-- compat-matrix-badge:begin -->'
      const end = '<!-- compat-matrix-badge:end -->'
      const relStable = path.posix.join('version-compatibility-tests', 'MATRIX_SUMMARY.md')
      const badge = `Compatibility status: PASS ${counts.PASS} · FAIL ${counts.FAIL} · XFAIL ${counts.XFAIL} · XPASS ${counts.XPASS} — latest: ${relStable}`
      const replacement = `${begin}\n${badge}\n${end}`
      let readme = fs.readFileSync(readmePath, 'utf8')
      if (readme.includes(begin) && readme.includes(end)) {
        readme = readme.replace(new RegExp(`${begin}[\n\r\s\S]*?${end}`), replacement)
      } else {
        const lines = readme.split(/\r?\n/)
        const idx = lines.findIndex((l) => /^##\s+Compatibility\s*$/.test(l.trim()))
        const insertAt = idx >= 0 ? idx + 1 : 0
        lines.splice(insertAt, 0, replacement, '')
        readme = lines.join('\n')
      }
      fs.writeFileSync(readmePath, readme)
      console.log('README badge updated')
    }
  } catch (e) {
    console.warn('Failed to update README badge:', e.message)
  }
  console.log('\n---\n')
  console.log(md)
}

function main() {
  const argSummary = process.argv[2]
  const summaryPath = argSummary && fs.existsSync(argSummary) ? argSummary : findLatestSummary()
  summarize(summaryPath)
}

main()
