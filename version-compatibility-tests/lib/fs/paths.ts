import * as fs from 'node:fs'
import * as path from 'node:path'

export const rootDir = process.cwd()
export const suiteDir = path.join(rootDir, 'version-compatibility-tests')
export const appDir = path.join(suiteDir, 'consumer-app')
export const distDir = path.join(suiteDir, 'dist')
export const workRootDir = path.join(suiteDir, '.work')
export const latestPointerPath = path.join(suiteDir, 'MATRIX_LATEST.json')
export const logsDir = path.join(suiteDir, 'logs')

export function createLogsRoot(timestamp: Date = new Date()): string {
  const dirName = timestamp.toISOString().replace(/[:.]/g, '-')
  const fullPath = path.join(suiteDir, 'logs', dirName)
  fs.mkdirSync(fullPath, { recursive: true })
  return fullPath
}

export function logsPath(logsRoot: string, ...segments: string[]): string {
  return path.join(logsRoot, ...segments)
}

export function ensureWorkDir(runtimeId: string, logsRoot: string): string {
  const dir = path.join(workRootDir, `${path.basename(logsRoot)}-${runtimeId}`)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export interface LatestSummaryPointer {
  generatedAt: string
  summaryPath: string
  totals: {
    total: number
    pass: number
    fail: number
    xfail: number
    xpass: number
  }
}

export function writeLatestSummaryPointer(payload: LatestSummaryPointer): void {
  fs.writeFileSync(latestPointerPath, JSON.stringify(payload, null, 2))
}
