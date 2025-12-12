import {Args, Command} from '@oclif/core'

import {createApi} from '../../lib/api.js'
import {loadConfig, saveConfig} from '../../lib/config.js'

export default class ConfigPin extends Command {
  static args = {
    // eslint-disable-next-line camelcase
    task_id: Args.string({description: 'Task ID to pin (e.g., abc123 or CU-abc123)', required: true}),
  }
static description = 'Pin a task to always show in task lists'
static examples = [
    '<%= config.bin %> <%= command.id %> abc123',
    '<%= config.bin %> <%= command.id %> CU-abc123',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(ConfigPin)

    const config = await loadConfig()
    if (!config) {
      this.error('Not configured. Run `clickup-cli configure` first.')
    }

    // Handle CU- prefix
    let taskId = args.task_id
    if (taskId.startsWith('CU-')) {
      taskId = taskId.slice(3)
    }

    const pinnedTasks = config.pinnedTasks || []

    if (pinnedTasks.includes(taskId)) {
      this.log(`Task "${args.task_id}" is already pinned.`)
      return
    }

    // Verify task exists
    try {
      const api = createApi(config.apiToken)
      const task = await api.getTask(taskId)

      pinnedTasks.push(taskId)
      config.pinnedTasks = pinnedTasks

      await saveConfig(config)
      this.log(`📌 Pinned: "${task.name}"`)
      this.log(`Pinned tasks: ${pinnedTasks.length}`)
    } catch {
      this.error(`Task "${args.task_id}" not found.`)
    }
  }
}
