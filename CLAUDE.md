# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Build (cleans dist/ and compiles TypeScript)
pnpm run build

# Run in development mode (uses ts-node, no build needed)
./bin/dev.js <command>

# Run production build
./bin/run.js <command>

# Lint
pnpm run lint

# Run all tests
pnpm run test

# Run a single test file
pnpm mocha --forbid-only "test/commands/tasks/get.test.ts"
```

## Commands

### Setup
```bash
# Configure API token (interactive)
clickup-cli configure

# Hide statuses from task lists (e.g., icebox, live)
clickup-cli config hide icebox
clickup-cli config hide "on hold"

# Unhide a status
clickup-cli config unhide icebox

# Show current config (including hidden statuses)
clickup-cli config show
```

### Interactive Task Management
```bash
# Interactive task selection and management
clickup-cli tasks select
```
Allows browsing tasks by: My Assigned Tasks, Team Tasks, or Browse by List. After selecting a task, you can view details, change status, view/add comments, or open in browser.

### Quick Access
```bash
# Interactive list of 10 most recent tasks assigned to you
clickup-cli tasks list
clickup-cli tasks list --limit 20
clickup-cli tasks list --space          # Filter by space (e.g., Personal)

# Tasks due soon (reminders)
clickup-cli tasks due                   # Due within 7 days
clickup-cli tasks due --days 3          # Due within 3 days
clickup-cli tasks due --overdue         # Include overdue tasks

# Tasks from private spaces
clickup-cli tasks private
clickup-cli tasks private --limit 20

# Get task details
clickup-cli tasks get <task_id>
clickup-cli tasks get CU-abc123 --comments --json

# Move task to different status
clickup-cli tasks move <task_id>
clickup-cli tasks move CU-abc123 --status "In Progress"
```

Task IDs support the `CU-` prefix format.

## Architecture

This is an oclif-based CLI application for interacting with the ClickUp API.

### Key Patterns

- **Commands**: Located in `src/commands/`. Each command is a class extending `Command` from `@oclif/core`. Commands use a space-separated topic structure (e.g., `tasks get` maps to `src/commands/tasks/get.ts`).
- **Command Structure**: Commands define static `args`, `flags`, `description`, and `examples` properties. The `run()` method contains the execution logic.
- **Lib**: Shared utilities in `src/lib/`:
  - `api.ts` - ClickUp API client with typed methods
  - `config.ts` - Config management (stored in `~/.config/clickup-cli/config.json`)
  - `types.ts` - TypeScript interfaces for API responses
- **Interactive Prompts**: Uses `@clack/prompts` for interactive CLI experiences
- **Tests**: Mirror the command structure under `test/commands/`. Uses `@oclif/test` with `runCommand()` and chai for assertions.

### Build Output

TypeScript compiles from `src/` to `dist/`. The `oclif.manifest.json` is generated during pack/publish.

## ClickUp API Reference

`ClickUp API V2.postman_collection.json` contains the complete ClickUp API V2 endpoint reference. Use this when implementing new commands.

- **Base URL**: `https://api.clickup.com/api/v2/`
- **Auth**: API token passed via `Authorization` header
- **Key endpoints**: Authorization, Tasks, Lists, Folders, Spaces, Teams, Comments, Checklists, Custom Fields, Goals, Time Tracking, Webhooks

### API Hierarchy

Team (Workspace) → Space → Folder → List → Task

## Release Workflow

This project uses semantic versioning with automated changelog generation.

### Commit Convention

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, no code change
refactor: code refactoring
perf: performance improvements
test: adding tests
chore: maintenance tasks
ci: CI/CD changes
build: build system changes
```

Examples:
```bash
git commit -m "feat: add task priority filtering"
git commit -m "fix: handle empty task list gracefully"
git commit -m "docs: update CLI usage examples"
```

### Pre-commit Hooks

- **lint-staged**: Auto-fixes ESLint issues on staged files
- **commitlint**: Validates commit message format

### Creating Releases

```bash
# Dry run (preview what will happen)
pnpm run release:dry

# Release types (auto-generates changelog from commits)
pnpm run release:patch   # 0.0.1 → 0.0.2 (bug fixes)
pnpm run release:minor   # 0.0.1 → 0.1.0 (new features)
pnpm run release:major   # 0.0.1 → 1.0.0 (breaking changes)

# Interactive release (prompts for version)
pnpm run release
```

Release process:
1. Runs lint and build
2. Bumps version in package.json
3. Generates/updates CHANGELOG.md from commits
4. Creates git tag
5. Pushes to GitHub
6. Creates GitHub release
7. Publishes to npm
