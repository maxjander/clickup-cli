import {Args, Command} from '@oclif/core'

import {loadConfig, saveConfig} from '../../lib/config.js'

export default class ConfigUnpin extends Command {
  static args = {
    // eslint-disable-next-line camelcase
    task_id: Args.string({description: 'Task ID to unpin (e.g., abc123 or CU-abc123)', required: true}),
  }
static description = 'Unpin a task from task lists'
static examples = [
    '<%= config.bin %> <%= command.id %> abc123',
    '<%= config.bin %> <%= command.id %> CU-abc123',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(ConfigUnpin)

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

    if (!pinnedTasks.includes(taskId)) {
      this.log(`Task "${args.task_id}" is not pinned.`)
      return
    }

    config.pinnedTasks = pinnedTasks.filter((id) => id !== taskId)

    await saveConfig(config)
    this.log(`Unpinned task "${args.task_id}"`)
    this.log(`Pinned tasks remaining: ${config.pinnedTasks.length}`)
  }
}
