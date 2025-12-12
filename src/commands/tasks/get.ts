import {Args, Command, Flags} from '@oclif/core'

import {createApi} from '../../lib/api.js'
import {requireConfig} from '../../lib/config.js'

export default class TasksGet extends Command {
  static args = {
    // eslint-disable-next-line camelcase
    task_id: Args.string({description: 'Task ID (e.g., abc123 or CU-abc123)', required: true}),
  }
static description = 'Get task details'
static examples = [
    '<%= config.bin %> <%= command.id %> abc123',
    '<%= config.bin %> <%= command.id %> CU-abc123 --comments',
  ]
static flags = {
    comments: Flags.boolean({char: 'c', description: 'Include comments'}),
    json: Flags.boolean({description: 'Output as JSON'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(TasksGet)

    const config = await requireConfig()
    const api = createApi(config.apiToken)

    // Handle CU- prefix if present
    let taskId = args.task_id
    if (taskId.startsWith('CU-')) {
      taskId = taskId.slice(3)
    }

    try {
      const task = await api.getTask(taskId)

      if (flags.json) {
        const output: Record<string, unknown> = {task}

        if (flags.comments) {
          const comments = await api.getTaskComments(taskId)
          output.comments = comments
        }

        this.log(JSON.stringify(output, null, 2))
        return
      }

      this.log(`
Task: ${task.name}
ID: ${task.id}${task.custom_id ? ` (${task.custom_id})` : ''}
Status: ${task.status.status}
Priority: ${task.priority?.priority || 'None'}
List: ${task.list.name}
Folder: ${task.folder.name}

Assignees: ${task.assignees.map((a) => a.username).join(', ') || 'None'}
Due Date: ${task.due_date ? new Date(Number(task.due_date)).toLocaleDateString() : 'None'}
Time Estimate: ${task.time_estimate ? `${Math.round(task.time_estimate / 3_600_000)}h` : 'None'}
Time Spent: ${task.time_spent ? `${Math.round(task.time_spent / 3_600_000)}h` : 'None'}

Description:
${task.description || task.text_content || '(No description)'}

URL: ${task.url}
`)

      if (flags.comments) {
        const comments = await api.getTaskComments(taskId)

        if (comments.length === 0) {
          this.log('\n--- No comments ---')
        } else {
          this.log(`\n--- Comments (${comments.length}) ---\n`)

          for (const comment of comments) {
            const date = new Date(Number(comment.date)).toLocaleString()
            this.log(`${comment.user.username} (${date}):`)
            this.log(`  ${comment.comment_text}\n`)
          }
        }
      }
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Failed to fetch task')
    }
  }
}
