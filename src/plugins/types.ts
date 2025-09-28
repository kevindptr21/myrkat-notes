import { BaseDocument } from '@kevindptr/myrkat-sdk/type'

export interface Note extends BaseDocument {
  title: string
  content: any // This can be refined to Blocknote's specific type later
  parentId: string | null
  excalidraw?: string // JSON string of Excalidraw elements
  excalidrawLibrary?: string // JSON string of Excalidraw library
}
