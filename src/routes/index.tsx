import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMyrkat } from '@kevindptr/myrkat-sdk/hooks'
import { FileService } from '@kevindptr/myrkat-sdk/storage'
import { BaseDocument, StorageRequestPayload } from '@kevindptr/myrkat-sdk/type'
import { useEffect } from 'react'
import { loadAndRegisterPlugins } from '@/lib/plugin-loader'
import { PluginRenderer } from '@/features/plugin-renderer'

const service = new FileService('myrkat-data')

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

  useEffect(() => {
    events.handle('storage:request', (data) => handleStorageRequest({ data }))

    return () => events.unhandle('storage:request')
  }, [])

  useEffect(() => {
    loadAndRegisterPlugins(plugins)
  }, [plugins])

  return <PluginRenderer />
}
