import {Args, Command} from '@oclif/core'

import {loadConfig, saveConfig} from '../../lib/config.js'

export default class ConfigUnhide extends Command {
  static args = {
    status: Args.string({description: 'Status name to unhide', required: true}),
  }
static description = 'Unhide a status from task lists'
static examples = [
    '<%= config.bin %> <%= command.id %> icebox',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(ConfigUnhide)

    const config = await loadConfig()
    if (!config) {
      this.error('Not configured. Run `clickup-cli configure` first.')
    }

    const statusToUnhide = args.status.toLowerCase()
    const hiddenStatuses = config.hiddenStatuses || []

    if (!hiddenStatuses.includes(statusToUnhide)) {
      this.log(`Status "${args.status}" is not hidden.`)
      return
    }

    config.hiddenStatuses = hiddenStatuses.filter((s) => s !== statusToUnhide)

    await saveConfig(config)
    this.log(`Status "${args.status}" is now visible.`)

    if (config.hiddenStatuses.length > 0) {
      this.log(`Hidden statuses: ${config.hiddenStatuses.join(', ')}`)
    } else {
      this.log('No statuses are hidden.')
    }
  }
}
