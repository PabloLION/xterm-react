import fs from 'node:fs'
import path from 'node:path'

export function findLatestSummary({ suiteDir, logsDir, latestPointerPath }) {
  if (latestPointerPath && fs.existsSync(latestPointerPath)) {
    try {
      const payload = JSON.parse(fs.readFileSync(latestPointerPath, 'utf8'))
      const pointer = payload.summaryPath
      if (pointer && fs.existsSync(pointer)) return pointer
    } catch {
      // fall through to directory scan
    }
  }

  const entries = fs
    .readdirSync(logsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const full = path.join(logsDir, entry.name)
      const t = fs.statSync(full).mtimeMs
      return { full, t }
    })
    .sort((a, b) => b.t - a.t)

  if (!entries.length) {
    throw new Error(`No logs found in ${logsDir}`)
  }

  const candidate = path.join(entries[0].full, 'MATRIX_SUMMARY.json')
  if (!fs.existsSync(candidate)) {
    throw new Error(`No MATRIX_SUMMARY.json in ${entries[0].full}`)
  }
  return candidate
}
