import {Args, Command} from '@oclif/core'

import {loadConfig, saveConfig} from '../../lib/config.js'

export default class ConfigHide extends Command {
  static args = {
    status: Args.string({description: 'Status name to hide (e.g., "icebox", "live")', required: true}),
  }
static description = 'Hide a status from task lists'
static examples = [
    '<%= config.bin %> <%= command.id %> icebox',
    '<%= config.bin %> <%= command.id %> "on hold"',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(ConfigHide)

    const config = await loadConfig()
    if (!config) {
      this.error('Not configured. Run `clickup-cli configure` first.')
    }

    const statusToHide = args.status.toLowerCase()
    const hiddenStatuses = config.hiddenStatuses || []

    if (hiddenStatuses.includes(statusToHide)) {
      this.log(`Status "${args.status}" is already hidden.`)
      return
    }

    hiddenStatuses.push(statusToHide)
    config.hiddenStatuses = hiddenStatuses

    await saveConfig(config)
    this.log(`Status "${args.status}" is now hidden from task lists.`)
    this.log(`Hidden statuses: ${hiddenStatuses.join(', ')}`)
  }
}
