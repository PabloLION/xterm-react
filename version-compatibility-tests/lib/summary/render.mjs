function ensureCounter(map, key) {
  if (!map.has(key)) {
    map.set(key, { PASS: 0, FAIL: 0, XFAIL: 0, XPASS: 0 })
  }
  return map.get(key)
}

export function aggregateResults(results) {
  const counts = { PASS: 0, FAIL: 0, XFAIL: 0, XPASS: 0 }
  const byRuntime = new Map()
  const byReact = new Map()
  const byLinter = new Map()
  const lintSets = {
    biome: new Set(),
    eslint: new Set(),
    prettier: new Set()
  }
  const fails = []
  const xfails = []
  const xpasses = []

  for (const scenario of results) {
    const outcome = scenario.outcome || (scenario.steps?.build && scenario.steps?.pin_and_build ? 'PASS' : 'FAIL')
    counts[outcome] = (counts[outcome] ?? 0) + 1

    const runtimeInfo = scenario.versions?.runtime
    const runtimeLabel = runtimeInfo ? `${runtimeInfo.id} (${runtimeInfo.tool}@${runtimeInfo.version})` : 'unknown'
    ensureCounter(byRuntime, runtimeLabel)[outcome]++

    const reactVersion = scenario.versions?.react || 'unknown'
    ensureCounter(byReact, reactVersion)[outcome]++

    const linterInfo = scenario.versions?.linter
    const linterTool = linterInfo?.tool || 'unknown'
    ensureCounter(byLinter, linterTool)[outcome]++

    if (linterInfo) {
      if (linterInfo.tool === 'biome' && linterInfo.version) lintSets.biome.add(linterInfo.version)
      if (linterInfo.tool === 'eslint-prettier') {
        if (linterInfo.eslint) lintSets.eslint.add(linterInfo.eslint)
        if (linterInfo.prettier) lintSets.prettier.add(linterInfo.prettier)
      }
    }

    if (outcome === 'FAIL') fails.push(scenario)
    if (outcome === 'XFAIL') xfails.push(scenario)
    if (outcome === 'XPASS') xpasses.push(scenario)
  }

  return {
    counts: { ...counts, total: results.length },
    byRuntime,
    byReact,
    byLinter,
    lintSets,
    fails,
    xfails,
    xpasses
  }
}

export function renderMarkdown(summaryPath, aggregates) {
  const { counts, byRuntime, byReact, byLinter, lintSets, fails, xfails, xpasses } = aggregates
  let md = ''
  md += `# Compatibility Matrix Summary\n\n`
  md += `Summary path: \`${summaryPath}\`\n\n`
  md += `## Totals\n\n`
  md += `- Total: ${counts.total}\n`
  md += `- PASS: ${counts.PASS}\n`
  md += `- FAIL: ${counts.FAIL}\n`
  md += `- XFAIL: ${counts.XFAIL}\n`
  md += `- XPASS: ${counts.XPASS}\n\n`

  md += `## By Runtime\n\n`
  for (const [runtime, c] of byRuntime.entries()) {
    md += `- ${runtime}: PASS ${c.PASS} / FAIL ${c.FAIL} / XFAIL ${c.XFAIL} / XPASS ${c.XPASS}\n`
  }
  md += `\n`

  md += `## By React\n\n`
  for (const [react, c] of byReact.entries()) {
    md += `- ${react}: PASS ${c.PASS} / FAIL ${c.FAIL} / XFAIL ${c.XFAIL} / XPASS ${c.XPASS}\n`
  }
  md += `\n`

  md += `## By Linter Tool\n\n`
  for (const [tool, c] of byLinter.entries()) {
    md += `- ${tool}: PASS ${c.PASS} / FAIL ${c.FAIL} / XFAIL ${c.XFAIL} / XPASS ${c.XPASS}\n`
  }
  md += `\n`

  const lintParts = []
  if (lintSets.biome.size) lintParts.push(`biome: ${Array.from(lintSets.biome).sort().join(', ')}`)
  if (lintSets.eslint.size) lintParts.push(`eslint: ${Array.from(lintSets.eslint).sort().join(', ')}`)
  if (lintSets.prettier.size) lintParts.push(`prettier: ${Array.from(lintSets.prettier).sort().join(', ')}`)
  if (lintParts.length) {
    md += `### Linter Versions\n\n`
    for (const part of lintParts) {
      md += `- ${part}\n`
    }
    md += `\n`
  }

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

  return md
}
