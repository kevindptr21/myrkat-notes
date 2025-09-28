// @apps/web/src/plugins/notes-plugin/index.ts
import type { PluginManager } from '@kevindptr/myrkat-sdk'
import { NotesLogo } from './logo'
import { MyrkatNotes } from './myrkat-notes'

/**
 * Registers the Notes Plugin and its components.
 * @param pluginManager An instance of the PluginManager from the SDK.
 */
export function register(pluginManager: PluginManager) {
  pluginManager.registerPlugin({
    id: 'myrkat-notes',
    name: 'Myrkat Notes',
    logo: NotesLogo,
    component: MyrkatNotes,
  })

  console.log('Notes Plugin registered!')
}
