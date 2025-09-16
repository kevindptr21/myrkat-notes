import type { PluginManager } from '@kevindptr/myrkat-sdk'

// Define the expected structure of a plugin module
interface PluginModule {
  register: (pluginManager: PluginManager) => void
}

/**
 * Dynamically discovers, imports, and registers all plugins.
 *
 * This function uses Vite's `import.meta.glob` feature to find all plugin
 * entry points (`index.ts`) within the `/src/plugins` directory. It then
 * iterates over them, imports each module, and calls its `register` function.
 *
 * @param pluginManager An instance of the PluginManager from the SDK.
 */
export const loadAndRegisterPlugins = async (
  pluginManager: PluginManager,
): Promise<void> => {
  console.log('Starting plugin discovery...')

  // Find all plugin entry files.
  // The `eager: true` option imports the modules directly.
  const pluginModules = import.meta.glob<PluginModule>(
    '/src/plugins/**/index.ts',
    { eager: true },
  )

  for (const path in pluginModules) {
    const module = pluginModules[path]
    if (module && typeof module.register === 'function') {
      try {
        console.log(`Registering plugin from: ${path}`)
        module.register(pluginManager)
      } catch (error) {
        console.error(`Failed to register plugin from ${path}:`, error)
      }
    } else {
      console.warn(`No valid 'register' function found in ${path}`)
    }
  }

  console.log('Plugin discovery and registration complete.')
}
