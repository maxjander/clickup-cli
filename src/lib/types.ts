export interface User {
  color: string
  email: string
  global_font_support: boolean
  id: number
  initials: string
  profilePicture: null | string
  timezone: string
  username: string
  week_start_day: number
}

export interface Team {
  avatar: null | string
  color: string
  id: string
  members: TeamMember[]
  name: string
}

export interface TeamMember {
  invited_by?: User
  user: User
}

export interface Space {
  features: SpaceFeatures
  id: string
  multiple_assignees: boolean
  name: string
  private: boolean
  statuses: Status[]
}

export interface SpaceFeatures {
  checklists: { enabled: boolean }
  custom_fields: { enabled: boolean }
  due_dates: { enabled: boolean }
  tags: { enabled: boolean }
  time_estimates: { enabled: boolean }
  time_tracking: { enabled: boolean }
}

export interface Folder {
  hidden: boolean
  id: string
  lists: List[]
  name: string
  orderindex: number
  override_statuses: boolean
  space: { id: string; name: string }
  task_count: string
}

export interface List {
  assignee?: User
  due_date?: string
  folder: { hidden: boolean; id: string; name: string; }
  id: string
  name: string
  orderindex: number
  priority?: { color: string; priority: string; }
  space: { id: string; name: string }
  start_date?: string
  status?: { color: string; status: string; }
  statuses: Status[]
  task_count: null | number
}

export interface Status {
  color: string
  id?: string
  orderindex: number
  status: string
  type: string
}

export interface Task {
  assignees: User[]
  checklists: Checklist[]
  creator: User
  custom_fields: CustomField[]
  custom_id: null | string
  date_closed: null | string
  date_created: string
  date_done: null | string
  date_updated: string
  dependencies: unknown[]
  description: null | string
  due_date: null | string
  folder: { id: string; name: string }
  id: string
  linked_tasks: unknown[]
  list: { id: string; name: string }
  name: string
  orderindex: string
  parent: null | string
  points: null | number
  priority: null | Priority
  space: { id: string }
  start_date: null | string
  status: Status
  tags: Tag[]
  team_id: string
  text_content: null | string
  time_estimate: null | number
  time_spent: null | number
  url: string
  watchers: User[]
}

export interface Checklist {
  id: string
  items: ChecklistItem[]
  name: string
  orderindex: number
  resolved: number
  task_id: string
  unresolved: number
}

export interface ChecklistItem {
  assignee: null | User
  id: string
  name: string
  orderindex: number
  parent: null | string
  resolved: boolean
}

export interface Tag {
  name: string
  tag_bg: string
  tag_fg: string
}

export interface Priority {
  color: string
  id: string
  orderindex: string
  priority: string
}

export interface CustomField {
  date_created: string
  hide_from_guests: boolean
  id: string
  name: string
  required: boolean
  type: string
  type_config: Record<string, unknown>
  value?: unknown
}

export interface Comment {
  assigned_by: null | User
  assignee: null | User
  comment: CommentContent[]
  comment_text: string
  date: string
  id: string
  reactions: unknown[]
  resolved: boolean
  user: User
}

export interface CommentContent {
  attributes?: Record<string, unknown>
  text: string
  type?: string
}

export interface Config {
  apiToken: string
  defaultTeamId?: string
  hiddenStatuses?: string[]
  pinnedTasks?: string[]
  userId?: number
}

export interface ApiError {
  ECODE: string
  err: string
}
