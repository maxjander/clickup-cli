import * as p from '@clack/prompts'
import {Command} from '@oclif/core'

import type {Config} from '../lib/types.js'

import {createApi} from '../lib/api.js'
import {loadConfig, saveConfig} from '../lib/config.js'

export default class Configure extends Command {
  static description = 'Configure ClickUp API token'
static examples = ['<%= config.bin %> <%= command.id %>']

  async run(): Promise<void> {
    p.intro('ClickUp CLI Configuration')

    const existingConfig = await loadConfig()

    if (existingConfig?.apiToken) {
      const overwrite = await p.confirm({
        message: 'API token already configured. Overwrite?',
      })

      if (p.isCancel(overwrite) || !overwrite) {
        p.outro('Configuration unchanged.')
        return
      }
    }

    const apiToken = await p.text({
      message: 'Enter your ClickUp API token:',
      placeholder: 'pk_...',
      validate(value) {
        if (!value) return 'API token is required'
        if (!value.startsWith('pk_')) return 'API token should start with pk_'
        
      },
    })

    if (p.isCancel(apiToken)) {
      p.cancel('Configuration cancelled.')
      return
    }

    const spinner = p.spinner()
    spinner.start('Validating API token...')

    try {
      const api = createApi(apiToken)
      const user = await api.getUser()
      spinner.stop(`Authenticated as ${user.username} (${user.email})`)

      const teams = await api.getTeams()
      let defaultTeamId: string | undefined

      if (teams.length === 1) {
        defaultTeamId = teams[0].id
        p.log.info(`Default workspace: ${teams[0].name}`)
      } else if (teams.length > 1) {
        const selectedTeam = await p.select({
          message: 'Select default workspace:',
          options: teams.map((team) => ({
            label: team.name,
            value: team.id,
          })),
        })

        if (!p.isCancel(selectedTeam)) {
          defaultTeamId = selectedTeam
        }
      }

      const config: Config = {
        apiToken,
        defaultTeamId,
        userId: user.id,
      }

      await saveConfig(config)
      p.outro('Configuration saved!')
    } catch (error) {
      spinner.stop('Failed to validate API token')
      this.error(error instanceof Error ? error.message : 'Unknown error')
    }
  }
}
