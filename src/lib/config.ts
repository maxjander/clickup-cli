import {existsSync} from 'node:fs'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'

import type {Config} from './types.js'

export async function getConfigDir(): Promise<string> {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const configDir = join(home, '.config', 'clickup-cli')

  if (!existsSync(configDir)) {
    await mkdir(configDir, {recursive: true})
  }

  return configDir
}

export async function getConfigPath(): Promise<string> {
  const configDir = await getConfigDir()
  return join(configDir, 'config.json')
}

export async function loadConfig(): Promise<Config | null> {
  const configPath = await getConfigPath()

  if (!existsSync(configPath)) {
    return null
  }

  const content = await readFile(configPath, 'utf8')
  return JSON.parse(content) as Config
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = await getConfigPath()
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8')
}

export async function getApiToken(): Promise<null | string> {
  const config = await loadConfig()
  return config?.apiToken ?? null
}

export async function requireConfig(): Promise<Config> {
  const config = await loadConfig()

  if (!config?.apiToken) {
    throw new Error('Not configured. Run `clickup-cli configure` first.')
  }

  return config
}

export function filterHiddenStatuses<T extends {status: {status: string}}>(
  tasks: T[],
  hiddenStatuses?: string[],
): T[] {
  if (!hiddenStatuses || hiddenStatuses.length === 0) {
    return tasks
  }

  const hidden = new Set(hiddenStatuses.map((s) => s.toLowerCase()))
  return tasks.filter((task) => !hidden.has(task.status.status.toLowerCase()))
}

/**
 * Merge pinned tasks at the top of a task list, avoiding duplicates
 * @param tasks - The regular task list
 * @param pinnedTasks - The fetched pinned tasks to show at top
 * @returns Combined list with pinned tasks first
 */
export function mergePinnedTasks<T extends {id: string}>(tasks: T[], pinnedTasks: T[]): T[] {
  if (pinnedTasks.length === 0) {
    return tasks
  }

  const pinnedIds = new Set(pinnedTasks.map((t) => t.id))
  const nonPinnedTasks = tasks.filter((t) => !pinnedIds.has(t.id))

  return [...pinnedTasks, ...nonPinnedTasks]
}
