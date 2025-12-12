import * as p from '@clack/prompts'
import {Command, Flags} from '@oclif/core'
import {exec} from 'node:child_process'

import type {Comment, Task} from '../../lib/types.js'

import {ClickUpApi, createApi} from '../../lib/api.js'
import {filterHiddenStatuses, loadConfig, mergePinnedTasks, requireConfig, saveConfig} from '../../lib/config.js'

export default class TasksPrivate extends Command {
  static description = 'List tasks from your private spaces'
static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --limit 20',
  ]
static flags = {
    limit: Flags.integer({char: 'n', default: 10, description: 'Number of tasks to show'}),
  }
private api!: ClickUpApi
  private pinnedTaskIds: Set<string> = new Set()
  private teamId!: string

  async run(): Promise<void> {
    const {flags} = await this.parse(TasksPrivate)

    const config = await requireConfig()
    this.api = createApi(config.apiToken)

    p.intro('Private Tasks')

    if (!config.defaultTeamId) {
      const teams = await this.api.getTeams()
      if (teams.length === 0) {
        p.log.error('No workspaces found.')
        return
      }

      config.defaultTeamId = teams[0].id
    }

    this.teamId = config.defaultTeamId

    const spinner = p.spinner()
    spinner.start('Finding private spaces...')

    const spaces = await this.api.getSpaces(this.teamId)
    const privateSpaces = spaces.filter((s) => s.private)

    if (privateSpaces.length === 0) {
      spinner.stop('No private spaces found.')
      p.outro('Done')
      return
    }

    spinner.message(`Found ${privateSpaces.length} private space(s). Fetching tasks...`)

    // Set up pinned task IDs
    const pinnedTaskIdsList = config.pinnedTasks || []
    this.pinnedTaskIds = new Set(pinnedTaskIdsList)

    // Fetch pinned tasks first
    const pinnedTasks = await this.api.getTasks_ByIds(pinnedTaskIdsList)

    const privateSpaceIds = privateSpaces.map((s) => s.id)

    let tasks = await this.api.getTeamTasks(this.teamId, {
      assignees: [config.userId!],
      orderBy: 'updated',
      reverse: true,
      spaceIds: privateSpaceIds,
    })

    // Filter hidden statuses
    tasks = filterHiddenStatuses(tasks, config.hiddenStatuses)

    // Merge pinned tasks at the top
    tasks = mergePinnedTasks(tasks, pinnedTasks)

    const displayTasks = tasks.slice(0, flags.limit)
    spinner.stop(`Found ${tasks.length} tasks in private spaces (showing ${displayTasks.length})`)

    if (displayTasks.length === 0) {
      p.log.info('No tasks in your private spaces.')
      p.outro('Done')
      return
    }

    await this.selectAndActOnTask(displayTasks)
  }

  private async addComment(task: Task): Promise<void> {
    const comment = await p.text({
      message: 'Enter your comment:',
      placeholder: 'Type your comment here...',
      validate(value) {
        if (!value?.trim()) return 'Comment cannot be empty'
      },
    })

    if (p.isCancel(comment)) return

    const spinner = p.spinner()
    spinner.start('Posting comment...')
    await this.api.addTaskComment(task.id, comment)
    spinner.stop('Comment posted!')
  }

  private async moveTaskStatus(task: Task): Promise<void> {
    const spinner = p.spinner()
    spinner.start('Loading available statuses...')

    const list = await this.api.getListStatuses(task.list.id)
    const {statuses} = list

    spinner.stop()

    const newStatus = await p.select({
      message: 'Select new status:',
      options: statuses.map((s) => ({
        hint: s.status === task.status.status ? '(current)' : undefined,
        label: s.status,
        value: s.status,
      })),
    })

    if (p.isCancel(newStatus)) return

    if (newStatus === task.status.status) {
      p.log.info('Status unchanged.')
      return
    }

    spinner.start('Updating task status...')
    await this.api.updateTask(task.id, {status: newStatus})
    spinner.stop(`Status changed to "${newStatus}"`)
  }

  private async openInBrowser(task: Task): Promise<void> {
    const {url} = task
    const {platform} = process

    const command =
      platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'

    exec(`${command} "${url}"`, (error) => {
      if (error) {
        p.log.error(`Failed to open browser: ${error.message}`)
      } else {
        p.log.success(`Opened ${url}`)
      }
    })
  }

  private async selectAndActOnTask(tasks: Task[]): Promise<void> {
    const selectedTaskId = await p.select({
      message: 'Select a task:',
      options: tasks.map((t) => {
        const isPinned = this.pinnedTaskIds.has(t.id)
        const pinPrefix = isPinned ? '\u{1F4CC} ' : ''
        return {
          hint: `${t.folder.name} / ${t.list.name}`,
          label: `${pinPrefix}[${t.status.status}] ${t.custom_id ? `${t.custom_id} - ` : ''}${t.name}`,
          value: t.id,
        }
      }),
    })

    if (p.isCancel(selectedTaskId)) {
      p.outro('Done')
      return
    }

    const task = tasks.find((t) => t.id === selectedTaskId)!
    const isPinned = this.pinnedTaskIds.has(task.id)

    const action = await p.select({
      message: `What do you want to do with "${task.name}"?`,
      options: [
        {label: 'View details', value: 'details'},
        {label: 'Move status', value: 'status'},
        {label: 'Show comments', value: 'comments'},
        {label: 'Add comment', value: 'add_comment'},
        {label: 'Open in browser', value: 'open'},
        {label: isPinned ? 'Unpin task' : 'Pin task', value: 'toggle_pin'},
      ],
    })

    if (p.isCancel(action)) {
      p.outro('Done')
      return
    }

    switch (action) {
      case 'add_comment': {
        await this.addComment(task)
        break
      }

      case 'comments': {
        await this.showTaskComments(task)
        break
      }

      case 'details': {
        await this.showTaskDetails(task)
        break
      }

      case 'open': {
        await this.openInBrowser(task)
        break
      }

      case 'status': {
        await this.moveTaskStatus(task)
        break
      }

      case 'toggle_pin': {
        await this.togglePin(task)
        break
      }
    }

    p.outro('Done')
  }

  private async showTaskComments(task: Task): Promise<void> {
    const spinner = p.spinner()
    spinner.start('Loading comments...')
    const comments: Comment[] = await this.api.getTaskComments(task.id)
    spinner.stop()

    if (comments.length === 0) {
      p.log.info('No comments on this task.')
      return
    }

    p.log.message(`\n--- Comments (${comments.length}) ---\n`)

    for (const comment of comments) {
      const date = new Date(Number(comment.date)).toLocaleString()
      p.log.message(`${comment.user.username} (${date}):`)
      p.log.message(`  ${comment.comment_text}\n`)
    }
  }

  private async showTaskDetails(task: Task): Promise<void> {
    const spinner = p.spinner()
    spinner.start('Fetching task details...')
    const fullTask = await this.api.getTask(task.id)
    spinner.stop()

    p.log.message(`
Task: ${fullTask.name}
ID: ${fullTask.id}${fullTask.custom_id ? ` (${fullTask.custom_id})` : ''}
Status: ${fullTask.status.status}
Priority: ${fullTask.priority?.priority || 'None'}
List: ${fullTask.list.name}
Folder: ${fullTask.folder.name}

Assignees: ${fullTask.assignees.map((a) => a.username).join(', ') || 'None'}
Due Date: ${fullTask.due_date ? new Date(Number(fullTask.due_date)).toLocaleDateString() : 'None'}

Description:
${fullTask.description || fullTask.text_content || '(No description)'}

URL: ${fullTask.url}
`)
  }

  private async togglePin(task: Task): Promise<void> {
    const config = await loadConfig()
    if (!config) return

    const pinnedTasks = config.pinnedTasks || []
    const isPinned = pinnedTasks.includes(task.id)

    if (isPinned) {
      config.pinnedTasks = pinnedTasks.filter((id) => id !== task.id)
      await saveConfig(config)
      this.pinnedTaskIds.delete(task.id)
      p.log.success(`Unpinned: "${task.name}"`)
    } else {
      pinnedTasks.push(task.id)
      config.pinnedTasks = pinnedTasks
      await saveConfig(config)
      this.pinnedTaskIds.add(task.id)
      p.log.success(`Pinned: "${task.name}"`)
    }
  }
}
