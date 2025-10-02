import { useMyrkat } from '@kevindptr/myrkat-sdk/hooks'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileTextIcon, NotebookPenIcon, WorkflowIcon } from 'lucide-react'
import { useDebounceCallback } from '@/hooks/use-debounce-callback'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import '@excalidraw/excalidraw/index.css'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SidebarInset } from '@kevindptr/myrkat-sdk/ui'
import { Note } from '../types'
import { Editor } from '../components/editor'
import { StorageRequestPayload } from '@kevindptr/myrkat-sdk/type'

// Dynamically import Excalidraw only on the client side
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((module) => ({
    default: module.Excalidraw,
  })),
)

const ExcalidrawComponent = ({
  note,
  onChange,
  onLibraryChange,
}: {
  note: Note
  onChange: (elements: any) => void
  onLibraryChange: (libraryItems: any) => void
}) => {
  return (
    <Suspense fallback={<Skeleton className="h-full w-full" />}>
      <Excalidraw
        initialData={{
          elements: note.excalidraw ? JSON.parse(note.excalidraw) : [],
          libraryItems: note.excalidrawLibrary
            ? JSON.parse(note.excalidrawLibrary)
            : [],
        }}
        onChange={onChange}
        onLibraryChange={onLibraryChange}
      />
    </Suspense>
  )
}

export const MyrkatNotesMain = () => {
  const queryClient = useQueryClient()
  const { events } = useMyrkat()
  const [noteTabStates, setNoteTabStates] = useState<
    Record<string, 'editor' | 'excalidraw'>
  >({})
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [excalidrawElStr, setExcalidrawElStr] = useState<string | undefined>(
    undefined,
  )
  const [excalidrawLibraryStr, setExcalidrawLibraryStr] = useState<
    string | undefined
  >(undefined)
  const selectedNoteRef = useRef<Note | null>(null)
  selectedNoteRef.current = selectedNote

  const { mutate: updateNote } = useMutation({
    mutationKey: ['update-note'],
    mutationFn: async (data: Partial<Note> & { id: string }) => {
      const { id, ...updateData } = data
      const payload: StorageRequestPayload = {
        operation: 'update',
        fileName: 'notes',
        where: { id },
        data: updateData,
      }
      return events.request('storage:request', payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })

  const handleContentChange = useDebounceCallback((content: string) => {
    if (selectedNoteRef.current) {
      updateNote({ id: selectedNoteRef.current.id, content })
    }
  }, 500)

  const handleExcalidrawChange = useDebounceCallback((elements) => {
    setExcalidrawElStr(JSON.stringify(elements))
  }, 500)

  const handleExcalidrawLibraryChange = useDebounceCallback((libraryItems) => {
    setExcalidrawLibraryStr(JSON.stringify(libraryItems))
  }, 500)

  useEffect(() => {
    const handleNoteSelection = (note: unknown) => {
      if (!note) {
        setSelectedNote(null)
        setExcalidrawElStr(undefined)
        setExcalidrawLibraryStr(undefined)
        return
      }

      const selected = note as Note
      setSelectedNote(selected)
      setExcalidrawElStr(selected.excalidraw)
      setExcalidrawLibraryStr(selected.excalidrawLibrary)
    }

    events.subscribe('note:selected', handleNoteSelection)

    return () => events.unsubscribe('note:selected', handleNoteSelection)
  }, [events])

  useEffect(() => {
    if (selectedNoteRef.current) {
      updateNote({
        id: selectedNoteRef.current.id,
        excalidraw: excalidrawElStr,
      })
    }
  }, [excalidrawElStr, updateNote])

  useEffect(() => {
    if (selectedNoteRef.current) {
      updateNote({
        id: selectedNoteRef.current.id,
        excalidrawLibrary: excalidrawLibraryStr,
      })
    }
  }, [excalidrawLibraryStr, updateNote])

  if (!selectedNote) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-gray-500">
        Select a note from the sidebar to start editing.
      </div>
    )
  }

  const activeTab = noteTabStates[selectedNote.id] || 'editor'

  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs
          value={activeTab}
          className="relative grid h-full grid-cols-[auto_1fr]"
          onValueChange={(value) => {
            setNoteTabStates((prev) => ({
              ...prev,
              [selectedNote.id]: value as 'editor' | 'excalidraw',
            }))
          }}
        >
          <div className="flex flex-col">
            <TabsList className="sticky top-18 flex h-fit flex-col gap-2 space-x-0 p-1">
              <TabsTrigger value="editor">
                <NotebookPenIcon />
              </TabsTrigger>
              <TabsTrigger value="excalidraw">
                <WorkflowIcon />
              </TabsTrigger>
            </TabsList>

            <Tooltip>
              <TooltipTrigger
                className={cn('sticky top-36 hidden', {
                  block: activeTab === 'editor',
                })}
                asChild
              >
                <Button
                  variant="outline"
                  className="rounded-md"
                  onClick={() => events.publish('note:export-pdf')}
                >
                  <FileTextIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>Export PDF</span>
              </TooltipContent>
            </Tooltip>
          </div>

          <TabsContent value="editor" className="block h-full">
            <Editor
              key={selectedNote.id}
              note={selectedNote}
              onChange={handleContentChange}
            />
          </TabsContent>
          <TabsContent value="excalidraw" className="block h-full">
            <ExcalidrawComponent
              key={selectedNote.id}
              note={selectedNote}
              onChange={handleExcalidrawChange}
              onLibraryChange={handleExcalidrawLibraryChange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  )
}
