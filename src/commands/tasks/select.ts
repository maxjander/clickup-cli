import * as p from '@clack/prompts'
import {Command} from '@oclif/core'
import {exec} from 'node:child_process'

import type {Comment, Config,Task} from '../../lib/types.js'

import {ClickUpApi, createApi} from '../../lib/api.js'
import {filterHiddenStatuses, loadConfig, mergePinnedTasks, requireConfig, saveConfig} from '../../lib/config.js'

export default class TasksSelect extends Command {
  static description = 'Interactive task selection and management'
static examples = ['<%= config.bin %> <%= command.id %>']
private api!: ClickUpApi
  private appConfig!: Config
  private defaultTeamId?: string
  private pinnedTaskIds: Set<string> = new Set()
  private userId!: number

  async run(): Promise<void> {
    await this.parse(TasksSelect)
    this.appConfig = await requireConfig()
    this.api = createApi(this.appConfig.apiToken)
    this.userId = this.appConfig.userId!
    this.defaultTeamId = this.appConfig.defaultTeamId

    // Set up pinned task IDs
    const pinnedTaskIdsList = this.appConfig.pinnedTasks || []
    this.pinnedTaskIds = new Set(pinnedTaskIdsList)

    p.intro('ClickUp Task Manager')

    const viewMode = await p.select({
      message: 'View tasks by:',
      options: [
        {label: 'My Assigned Tasks', value: 'assigned'},
        {label: 'Team/Workspace Tasks', value: 'team'},
        {label: 'Browse by List', value: 'list'},
      ],
    })

    if (p.isCancel(viewMode)) {
      p.cancel('Cancelled.')
      return
    }

    let tasks: Task[] = []
    let pinnedTasks: Task[] = []

    // Fetch pinned tasks first
    if (pinnedTaskIdsList.length > 0) {
      pinnedTasks = await this.api.getTasks_ByIds(pinnedTaskIdsList)
    }

    switch (viewMode) {
      case 'assigned': {
        tasks = await this.fetchAssignedTasks()
        break
      }

      case 'list': {
        tasks = await this.fetchListTasks()
        break
      }

      case 'team': {
        tasks = await this.fetchTeamTasks()
        break
      }
    }

    // Filter hidden statuses
    tasks = filterHiddenStatuses(tasks, this.appConfig.hiddenStatuses)

    // Merge pinned tasks at the top
    tasks = mergePinnedTasks(tasks, pinnedTasks)

    if (tasks.length === 0) {
      p.log.info('No tasks found.')
      p.outro('Done')
      return
    }

    await this.selectAndActOnTask(tasks)
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

  private async fetchAssignedTasks(): Promise<Task[]> {
    const spinner = p.spinner()
    spinner.start('Fetching your assigned tasks...')

    const teamId = await this.getTeamId()
    if (!teamId) return []

    const tasks = await this.api.getTeamTasks(teamId, {
      assignees: [this.userId],
    })

    spinner.stop(`Found ${tasks.length} assigned tasks`)
    return tasks
  }

  private async fetchListTasks(): Promise<Task[]> {
    const teamId = await this.getTeamId()
    if (!teamId) return []

    // Select space
    const spinner = p.spinner()
    spinner.start('Loading spaces...')
    const spaces = await this.api.getSpaces(teamId)
    spinner.stop()

    if (spaces.length === 0) {
      p.log.warn('No spaces found.')
      return []
    }

    const spaceId = await p.select({
      message: 'Select a space:',
      options: spaces.map((s) => ({label: s.name, value: s.id})),
    })

    if (p.isCancel(spaceId)) return []

    // Select folder or folderless lists
    spinner.start('Loading folders and lists...')
    const folders = await this.api.getFolders(spaceId)
    const folderlessLists = await this.api.getFolderlessLists(spaceId)
    spinner.stop()

    const folderOptions = [
      ...folderlessLists.map((l) => ({
        label: `[List] ${l.name}`,
        value: `list:${l.id}`,
      })),
      ...folders.map((f) => ({
        label: `[Folder] ${f.name}`,
        value: `folder:${f.id}`,
      })),
    ]

    if (folderOptions.length === 0) {
      p.log.warn('No folders or lists found.')
      return []
    }

    const selection = await p.select({
      message: 'Select a folder or list:',
      options: folderOptions,
    })

    if (p.isCancel(selection)) return []

    let listId: string

    if (selection.startsWith('list:')) {
      listId = selection.replace('list:', '')
    } else {
      // It's a folder, show lists in folder
      const folderId = selection.replace('folder:', '')
      spinner.start('Loading lists...')
      const lists = await this.api.getLists(folderId)
      spinner.stop()

      if (lists.length === 0) {
        p.log.warn('No lists in this folder.')
        return []
      }

      const selectedList = await p.select({
        message: 'Select a list:',
        options: lists.map((l) => ({label: l.name, value: l.id})),
      })

      if (p.isCancel(selectedList)) return []
      listId = selectedList
    }

    spinner.start('Loading tasks...')
    const tasks = await this.api.getTasks(listId)
    spinner.stop(`Found ${tasks.length} tasks`)
    return tasks
  }

  private async fetchTeamTasks(): Promise<Task[]> {
    const teamId = await this.getTeamId()
    if (!teamId) return []

    const spinner = p.spinner()
    spinner.start('Fetching team tasks...')

    const tasks = await this.api.getTeamTasks(teamId)
    spinner.stop(`Found ${tasks.length} tasks`)
    return tasks
  }

  private async getTeamId(): Promise<null | string> {
    if (this.defaultTeamId) return this.defaultTeamId

    const spinner = p.spinner()
    spinner.start('Loading workspaces...')
    const teams = await this.api.getTeams()
    spinner.stop()

    if (teams.length === 0) {
      p.log.error('No workspaces found.')
      return null
    }

    if (teams.length === 1) {
      return teams[0].id
    }

    const teamId = await p.select({
      message: 'Select a workspace:',
      options: teams.map((t) => ({label: t.name, value: t.id})),
    })

    if (p.isCancel(teamId)) return null
    return teamId
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
