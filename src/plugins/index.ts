// @apps/web/src/plugins/notes-plugin/index.ts
import { NotesSidebar } from './sidebar'
import { NotesMainView } from './main'
import type { PluginManager } from '@kevindptr/myrkat-sdk'
import { NotesLogo } from './logo'

/**
 * Registers the Notes Plugin and its components.
 * @param pluginManager An instance of the PluginManager from the SDK.
 */
export function register(pluginManager: PluginManager) {
  pluginManager.registerPlugin({
    id: 'myrkat-notes',
    name: 'Myrkat Notes',
    logo: NotesLogo,
    sidebarComponent: NotesSidebar,
    mainComponent: NotesMainView,
  })
  // // Register the sidebar component
  // pluginManager.registerSidebarComponent('notes-sidebar', NotesSidebar)
  //
  // // Register the main view component
  // pluginManager.registerMainViewComponent('notes-main-view', NotesMainView)

  console.log('Notes Plugin registered!')
}
