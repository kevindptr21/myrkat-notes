import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMyrkat } from '@kevindptr/myrkat-sdk'
import { FileService } from '@kevindptr/myrkat-sdk/storage'
import { BaseDocument, StorageRequestPayload } from '@kevindptr/myrkat-sdk/type'
import { Fragment, useEffect } from 'react'
import { loadAndRegisterPlugins } from '@/lib/plugin-loader'
import { Menu } from '@/features/menu'
import { PluginRenderer } from '@/features/plugin-renderer'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { SiteHeader } from '@/components/site-header'
import { AppSidebar } from '@/components/app-sidebar'

const service = new FileService('myrkat-data')

// --- Generic Server Functions ---
const initStorage = createServerFn({ method: 'GET' }).handler(async () => {
  return service.initialize()
})

const handleStorageRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: StorageRequestPayload) => d)
  .handler(async ({ data: payload }) => {
    const { operation, fileName, where, data } = payload
    switch (operation) {
      case 'find':
        return service.find(fileName, where)
      case 'insert':
        return service.insert(fileName, data!)
      case 'update':
        return service.update(fileName, where!, data!)
      case 'delete':
        return service.delete(fileName, where!)
      case 'writeFile':
        return service.writeFile(fileName, data! as Array<BaseDocument>)
      default:
        throw new Error(`Unsupported storage operation: ${operation}`)
    }
  })

export const Route = createFileRoute('/')({
  component: App,
  beforeLoad: async () => await initStorage(),
})

function App() {
  const { plugins, events } = useMyrkat()

  // Register the single, generic handler for all storage requests
  useEffect(() => {
    events.handle('storage:request', (data) => handleStorageRequest({ data }))

    return () => events.unhandle('storage:request')
  }, [])

  // Dynamically load and register all plugins on initial application load
  useEffect(() => {
    loadAndRegisterPlugins(plugins)
  }, [plugins])
  //

  // return (
  //   <div className="[--header-height:calc(--spacing(14))]">
  //     <SidebarProvider className="flex flex-col">
  //       <SiteHeader />
  //       <div className="flex flex-1">
  //         <AppSidebar />
  //         <SidebarInset>
  //           <div className="flex flex-1 flex-col gap-4 p-4">
  //             <div className="grid auto-rows-min gap-4 md:grid-cols-3">
  //               <div className="bg-muted/50 aspect-video rounded-xl" />
  //               <div className="bg-muted/50 aspect-video rounded-xl" />
  //               <div className="bg-muted/50 aspect-video rounded-xl" />
  //             </div>
  //             <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
  //           </div>
  //         </SidebarInset>
  //       </div>
  //     </SidebarProvider>
  //   </div>
  // )

  return (
    <Fragment>
      <Menu />
      <div className="flex flex-1">
        <PluginRenderer />
      </div>
    </Fragment>
  )

  // deprecated
  // return (
  //   <SidebarProvider>
  //     <Sidebar collapsible="icon">
  //       <SidebarContent>
  //         <SidebarViewPluginRenderer />
  //       </SidebarContent>
  //     </Sidebar>
  //
  //     <SidebarInset>
  //       <div className="flex flex-1 flex-col gap-4 p-4">
  //         <MainViewPluginRenderer />
  //       </div>
  //     </SidebarInset>
  //
  //     <DialogWrapper />
  //   </SidebarProvider>
  // )
}
