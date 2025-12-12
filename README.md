# @tjabo/clickup-cli

An interactive CLI for ClickUp task management. Quickly view, manage, and interact with your ClickUp tasks from the terminal.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@tjabo/clickup-cli.svg)](https://npmjs.org/package/@tjabo/clickup-cli)
[![Downloads/week](https://img.shields.io/npm/dw/@tjabo/clickup-cli.svg)](https://npmjs.org/package/@tjabo/clickup-cli)

## Features

- **Interactive task browsing** - Navigate through workspaces, spaces, folders, and lists
- **Quick task list** - View your recently updated assigned tasks
- **Due date reminders** - See tasks due soon with overdue highlighting
- **Private spaces** - Access tasks in your private spaces
- **Task actions** - View details, change status, add comments, open in browser
- **Pin tasks** - Keep important tasks always visible at the top of lists
- **Hide statuses** - Filter out statuses you don't want to see (e.g., "Icebox", "Done")

## Installation

```bash
npm install -g @tjabo/clickup-cli
```

## Quick Start

```bash
# Configure with your ClickUp API token
clickup-cli configure

# List your recent tasks
clickup-cli tasks list

# Interactive task browser
clickup-cli tasks select
```

## Getting Your API Token

1. Go to ClickUp Settings > Apps
2. Click "Generate" under API Token
3. Copy the token and use it with `clickup-cli configure`

## Commands

### Configuration

#### `clickup-cli configure`
Set up your ClickUp API token and default workspace.

```bash
clickup-cli configure
```

#### `clickup-cli config show`
Display current configuration including hidden statuses and pinned tasks.

```bash
clickup-cli config show
```

#### `clickup-cli config hide <status>`
Hide a status from task lists (e.g., hide "Icebox" or "Done" tasks).

```bash
clickup-cli config hide "icebox"
clickup-cli config hide "done"
```

#### `clickup-cli config unhide <status>`
Show a previously hidden status again.

```bash
clickup-cli config unhide "done"
```

#### `clickup-cli config pin <task_id>`
Pin a task to always show at the top of task lists.

```bash
clickup-cli config pin abc123
clickup-cli config pin CU-abc123
```

#### `clickup-cli config unpin <task_id>`
Remove a task from pinned tasks.

```bash
clickup-cli config unpin abc123
```

### Tasks

#### `clickup-cli tasks list`
List your recently updated assigned tasks with interactive actions.

```bash
# Show 10 most recent tasks (default)
clickup-cli tasks list

# Show more tasks
clickup-cli tasks list --limit 20

# Filter by space (interactive)
clickup-cli tasks list --space

# Include hidden statuses
clickup-cli tasks list --all
```

**Flags:**
- `-n, --limit <number>` - Number of tasks to show (default: 10)
- `-s, --space` - Filter by space interactively
- `-a, --all` - Show all tasks including hidden statuses

#### `clickup-cli tasks select`
Interactive task browser with multiple view modes.

```bash
clickup-cli tasks select
```

**View modes:**
- My Assigned Tasks - Tasks assigned to you
- Team/Workspace Tasks - All tasks in the workspace
- Browse by List - Navigate through spaces, folders, and lists

#### `clickup-cli tasks due`
Show tasks due soon (reminders).

```bash
# Tasks due within 7 days (default)
clickup-cli tasks due

# Tasks due within 3 days
clickup-cli tasks due --days 3

# Include overdue tasks
clickup-cli tasks due --overdue
```

**Flags:**
- `-d, --days <number>` - Show tasks due within N days (default: 7)
- `-o, --overdue` - Include overdue tasks

#### `clickup-cli tasks private`
List tasks from your private spaces.

```bash
clickup-cli tasks private
clickup-cli tasks private --limit 20
```

#### `clickup-cli tasks get <task_id>`
Get details for a specific task.

```bash
clickup-cli tasks get abc123
clickup-cli tasks get CU-abc123
clickup-cli tasks get abc123 --comments
```

**Flags:**
- `-c, --comments` - Include task comments

#### `clickup-cli tasks move <task_id>`
Move a task to a different status.

```bash
# Interactive status selection
clickup-cli tasks move abc123

# Direct status change
clickup-cli tasks move abc123 --status "In Progress"
```

### Task Actions

When selecting a task, you can:
- **View details** - See full task information
- **Move status** - Change the task status
- **Show comments** - View all comments
- **Add comment** - Post a new comment
- **Open in browser** - Open task in ClickUp web app
- **Pin/Unpin task** - Toggle task pinning

## Task Display

Tasks are displayed with:
- Status badge: `[In Progress]`
- Custom ID (if set): `CU-123 -`
- Task name
- Location hint: `Folder / List`
- Pin indicator for pinned tasks

Example:
```
Select a task:
  [In Progress] CU-123 - Update documentation    Development / Sprint 1
  [To Do] Fix login bug                          Bugs / Backlog
```

## Configuration File

Configuration is stored in `~/.config/clickup-cli/config.json`:

```json
{
  "apiToken": "pk_...",
  "userId": 12345678,
  "defaultTeamId": "1234567",
  "hiddenStatuses": ["icebox", "done"],
  "pinnedTasks": ["abc123", "def456"]
}
```

## Development

```bash
# Clone the repository
git clone https://github.com/maxjander/clickup-cli.git
cd clickup-cli

# Install dependencies
pnpm install

# Run in development mode
pnpm run dev tasks list

# Build
pnpm run build

# Lint
pnpm run lint
pnpm run lint:fix

# Run tests
pnpm test
```

## Release

This project uses [release-it](https://github.com/release-it/release-it) with conventional commits.

```bash
# Patch release (0.0.x)
pnpm run release:patch

# Minor release (0.x.0)
pnpm run release:minor

# Major release (x.0.0)
pnpm run release:major

# Dry run
pnpm run release:dry
```

## License

MIT
