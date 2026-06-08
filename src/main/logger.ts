import { app, ipcMain } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { inspect } from 'node:util'

function getLogFilePath() {
  return join(app.getPath('userData'), 'logs', 'latest.log')
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`.trim()
  }
  if (typeof error === 'string') return error
  return inspect(error, { depth: 5, breakLength: 120 })
}

export function writeLog(scope: string, message: string, detail?: unknown) {
  try {
    const logFile = getLogFilePath()
    mkdirSync(dirname(logFile), { recursive: true })
    const timestamp = new Date().toISOString()
    const detailText = detail === undefined ? '' : `\n${stringifyError(detail)}`
    appendFileSync(logFile, `[${timestamp}] [${scope}] ${message}${detailText}\n\n`, 'utf-8')
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export function logError(scope: string, error: unknown) {
  writeLog(scope, 'error', error)
}

export function getLatestLogFilePath() {
  return getLogFilePath()
}

ipcMain.handle('get-log-file-path', () => getLatestLogFilePath())

ipcMain.handle('log-client-error', (_event, payload: { scope?: string; message: string }) => {
  writeLog(payload.scope || 'renderer', payload.message)
})
