import {Command} from '@oclif/core'

import {createApi} from '../../lib/api.js'
import {loadConfig} from '../../lib/config.js'

export default class ConfigShow extends Command {
  static description = 'Show current configuration'
static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  async run(): Promise<void> {
    const config = await loadConfig()

    if (!config) {
      this.log('Not configured. Run `clickup-cli configure` first.')
      return
    }

    this.log('\nClickUp CLI Configuration:\n')
    this.log(`  API Token: ${config.apiToken.slice(0, 10)}...`)
    this.log(`  User ID: ${config.userId || 'Not set'}`)
    this.log(`  Default Team: ${config.defaultTeamId || 'Not set'}`)

    if (config.hiddenStatuses && config.hiddenStatuses.length > 0) {
      this.log(`\n  Hidden Statuses:`)
      for (const status of config.hiddenStatuses) {
        this.log(`    - ${status}`)
      }
    } else {
      this.log(`\n  Hidden Statuses: None`)
    }

    if (config.pinnedTasks && config.pinnedTasks.length > 0) {
      this.log(`\n  Pinned Tasks:`)
      const api = createApi(config.apiToken)
      const tasks = await api.getTasks_ByIds(config.pinnedTasks)

      for (const task of tasks) {
        this.log(`    - ${task.name}`)
        this.log(`      ID: ${task.id} | List: ${task.list.name} | Folder: ${task.folder.name}`)
      }

      // Show any task IDs that couldn't be fetched (deleted tasks)
      const fetchedIds = new Set(tasks.map((t) => t.id))
      const missingIds = config.pinnedTasks.filter((id) => !fetchedIds.has(id))
      for (const id of missingIds) {
        this.log(`    - [Not found] ${id}`)
      }
    } else {
      this.log(`\n  Pinned Tasks: None`)
    }

    this.log('')
  }
}
