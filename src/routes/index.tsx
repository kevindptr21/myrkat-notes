import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMyrkat } from '@kevindptr/myrkat-sdk'
import { useEffect } from 'react'
import type { StorageRequestPayload } from '@/storage/service'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { DialogWrapper } from '@/components/dialog-wrapper'
import { SidebarViewPluginRenderer } from '@/features/sidebar-plugin-render'
import { MainViewPluginRenderer } from '@/features/main-plugin-render'
import { jsonDbService } from '@/storage/service'
import { loadAndRegisterPlugins } from '@/lib/plugin-loader'

const service = jsonDbService

// --- Generic Server Functions ---
const initStorage = createServerFn({ method: 'GET' }).handler(async () => {
  return service.initialize()
})

const handleStorageRequest = createServerFn({ method: 'POST' })
  .validator((d: StorageRequestPayload) => d)
  .handler(async ({ data: payload }) => {
    const { operation, tableName, where, data } = payload
    switch (operation) {
      case 'find':
        return service.find(tableName, where)
      case 'insert':
        return service.insert(tableName, data)
      case 'update':
        return service.update(tableName, where, data)
      case 'delete':
        return service.delete(tableName, where)
      case 'writeTable':
        return service.writeTable(tableName, data)
      default:
        throw new Error(`Unsupported storage operation: ${operation}`)
    }
  })

export const Route = createFileRoute('/')({
  component: App,
  beforeLoad: () => initStorage(),
})

function App() {
  const { plugins, events } = useMyrkat()

  // Register the single, generic handler for all storage requests
  useEffect(() => {
    events.handle('storage:request', (d: unknown) => {
      const payload = d as StorageRequestPayload

      return handleStorageRequest({ data: payload })
    })

    return () => events.unhandle('storage:request')
  }, [])

  // Dynamically load and register all plugins on initial application load
  useEffect(() => {
    loadAndRegisterPlugins(plugins)
  }, [plugins])

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarViewPluginRenderer />
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <MainViewPluginRenderer />
        </div>
      </SidebarInset>

      <DialogWrapper />
    </SidebarProvider>
  )
}
