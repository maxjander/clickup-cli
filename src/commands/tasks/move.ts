import * as p from '@clack/prompts'
import {Args, Command, Flags} from '@oclif/core'

import {createApi} from '../../lib/api.js'
import {requireConfig} from '../../lib/config.js'

export default class TasksMove extends Command {
  static args = {
    // eslint-disable-next-line camelcase
    task_id: Args.string({description: 'Task ID (e.g., abc123 or CU-abc123)', required: true}),
  }
static description = 'Move task to a different status'
static examples = [
    '<%= config.bin %> <%= command.id %> abc123 --status "In Progress"',
    '<%= config.bin %> <%= command.id %> CU-abc123',
  ]
static flags = {
    status: Flags.string({char: 's', description: 'New status name'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TasksMove)

    const config = await requireConfig()
    const api = createApi(config.apiToken)

    // Handle CU- prefix if present
    let taskId = args.task_id
    if (taskId.startsWith('CU-')) {
      taskId = taskId.slice(3)
    }

    try {
      const task = await api.getTask(taskId)

      let newStatus = flags.status

      if (!newStatus) {
        // Interactive mode - show status picker
        const list = await api.getListStatuses(task.list.id)
        const {statuses} = list

        const selected = await p.select({
          message: `Move "${task.name}" to which status?`,
          options: statuses.map((s) => ({
            hint: s.status === task.status.status ? '(current)' : undefined,
            label: s.status,
            value: s.status,
          })),
        })

        if (p.isCancel(selected)) {
          this.log('Cancelled.')
          return
        }

        newStatus = selected
      }

      if (newStatus === task.status.status) {
        this.log(`Task is already in "${newStatus}" status.`)
        return
      }

      await api.updateTask(taskId, {status: newStatus})
      this.log(`Task "${task.name}" moved to "${newStatus}"`)
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Failed to move task')
    }
  }
}
