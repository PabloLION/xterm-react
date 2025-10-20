import fs from 'node:fs'
import path from 'node:path'

export const rootDir = process.cwd()
export const suiteDir = path.join(rootDir, 'version-compatibility-tests')
export const appDir = path.join(suiteDir, 'consumer-app')
export const distDir = path.join(suiteDir, 'dist')
export const workRootDir = path.join(suiteDir, '.work')
export const latestPointerPath = path.join(suiteDir, 'MATRIX_LATEST.json')
export const logsDir = path.join(suiteDir, 'logs')

export function createLogsRoot(timestamp = new Date()) {
  const dirName = timestamp.toISOString().replace(/[:.]/g, '-')
  const fullPath = path.join(suiteDir, 'logs', dirName)
  fs.mkdirSync(fullPath, { recursive: true })
  return fullPath
}

export function logsPath(logsRoot, ...segments) {
  return path.join(logsRoot, ...segments)
}

export function ensureWorkDir(runtimeId, logsRoot) {
  const dir = path.join(workRootDir, `${path.basename(logsRoot)}-${runtimeId}`)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function writeLatestSummaryPointer(payload) {
  fs.writeFileSync(latestPointerPath, JSON.stringify(payload, null, 2))
}
