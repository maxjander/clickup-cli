/* eslint-disable n/no-unsupported-features/node-builtins, camelcase, no-undef */
import type {ApiError, Comment, Folder, List, Space, Task, Team, User} from './types.js'

const BASE_URL = 'https://api.clickup.com/api/v2'

export class ClickUpApi {
  constructor(private apiToken: string) {}

  async addTaskComment(taskId: string, commentText: string): Promise<void> {
    await this.request(`/task/${taskId}/comment`, {
      body: JSON.stringify({comment_text: commentText}),
      method: 'POST',
    })
  }

  async getFolderlessLists(spaceId: string): Promise<List[]> {
    const response = await this.request<{lists: List[]}>(`/space/${spaceId}/list`)
    return response.lists
  }

  async getFolders(spaceId: string): Promise<Folder[]> {
    const response = await this.request<{folders: Folder[]}>(`/space/${spaceId}/folder`)
    return response.folders
  }

  async getLists(folderId: string): Promise<List[]> {
    const response = await this.request<{lists: List[]}>(`/folder/${folderId}/list`)
    return response.lists
  }

  async getListStatuses(listId: string): Promise<List> {
    return this.request<List>(`/list/${listId}`)
  }

  async getSpaces(teamId: string): Promise<Space[]> {
    const response = await this.request<{spaces: Space[]}>(`/team/${teamId}/space`)
    return response.spaces
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/task/${taskId}`)
  }

  async getTaskComments(taskId: string): Promise<Comment[]> {
    const response = await this.request<{comments: Comment[]}>(`/task/${taskId}/comment`)
    return response.comments
  }

  async getTasks(listId: string): Promise<Task[]> {
    const response = await this.request<{tasks: Task[]}>(`/list/${listId}/task`)
    return response.tasks
  }

  async getTasks_ByIds(taskIds: string[]): Promise<Task[]> {
    if (taskIds.length === 0) return []

    const results = await Promise.allSettled(
      taskIds.map((taskId) => this.getTask(taskId)),
    )

    return results
      .filter((r): r is PromiseFulfilledResult<Task> => r.status === 'fulfilled')
      .map((r) => r.value)
  }

  async getTeams(): Promise<Team[]> {
    const response = await this.request<{teams: Team[]}>('/team')
    return response.teams
  }

  async getTeamTasks(
    teamId: string,
    options: {
      assignees?: number[]
      dueDateGt?: number
      dueDateLt?: number
      includeClosed?: boolean
      listIds?: string[]
      orderBy?: 'created' | 'due_date' | 'id' | 'updated'
      page?: number
      reverse?: boolean
      spaceIds?: string[]
      statuses?: string[]
    } = {},
  ): Promise<Task[]> {
    const params = new URLSearchParams()

    if (options.assignees?.length) {
      for (const assignee of options.assignees) {
        params.append('assignees[]', String(assignee))
      }
    }

    if (options.statuses?.length) {
      for (const status of options.statuses) {
        params.append('statuses[]', status)
      }
    }

    if (options.includeClosed) {
      params.set('include_closed', 'true')
    }

    if (options.page !== undefined) {
      params.set('page', String(options.page))
    }

    if (options.orderBy) {
      params.set('order_by', options.orderBy)
    }

    if (options.reverse !== undefined) {
      params.set('reverse', String(options.reverse))
    }

    if (options.spaceIds?.length) {
      for (const spaceId of options.spaceIds) {
        params.append('space_ids[]', spaceId)
      }
    }

    if (options.listIds?.length) {
      for (const listId of options.listIds) {
        params.append('list_ids[]', listId)
      }
    }

    if (options.dueDateGt !== undefined) {
      params.set('due_date_gt', String(options.dueDateGt))
    }

    if (options.dueDateLt !== undefined) {
      params.set('due_date_lt', String(options.dueDateLt))
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await this.request<{tasks: Task[]}>(`/team/${teamId}/task${query}`)
    return response.tasks
  }

  async getUser(): Promise<User> {
    const response = await this.request<{user: User}>('/user')
    return response.user
  }

  async updateTask(
    taskId: string,
    data: {
      assignees?: {add?: number[]; rem?: number[]}
      description?: string
      name?: string
      priority?: number
      status?: string
    },
  ): Promise<Task> {
    return this.request<Task>(`/task/${taskId}`, {
      body: JSON.stringify(data),
      method: 'PUT',
    })
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.apiToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data as ApiError
      throw new Error(error.err || `API error: ${response.status}`)
    }

    return data as T
  }
}

export function createApi(apiToken: string): ClickUpApi {
  return new ClickUpApi(apiToken)
}
