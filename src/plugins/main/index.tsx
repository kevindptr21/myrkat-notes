import { Skeleton } from '@/components/ui/skeleton'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useDebounceCallback } from '@/hooks/use-debounce-callback'
// import { cn } from '@/lib/utils'
import { useMyrkat } from '@kevindptr/myrkat-sdk/hooks'
import { StorageRequestPayload } from '@kevindptr/myrkat-sdk/type'
import { Button, SidebarInset } from '@kevindptr/myrkat-sdk/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileTextIcon, NotebookPenIcon, WorkflowIcon } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Editor } from '../components/editor'
import { Note } from '../types'

import '@excalidraw/excalidraw/index.css'
import { ButtonGroup } from '@/components/ui/button-group'

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
      <style lang="jsx">{`
        .bn-block-content[data-content-type=codeBlock]>pre { white-space: unset; }
        `}</style>
      <div className="grid grow grid-cols-[minmax(20px,50px)_repeat(auto-fit,minmax(250px,1fr))] gap-2 p-4">
        <ButtonGroup orientation="vertical">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setNoteTabStates((prev) => ({
                    ...prev,
                    [selectedNote.id]: 'editor',
                  }))
                }
              >
                <NotebookPenIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notes</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setNoteTabStates((prev) => ({
                    ...prev,
                    [selectedNote.id]: 'excalidraw',
                  }))
                }
              >
                <WorkflowIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Flow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => events.publish('note:export-pdf')}
              >
                <FileTextIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export PDF</TooltipContent>
          </Tooltip>
        </ButtonGroup>

        <div className="w-full">
          {activeTab === 'editor' && (
            <Editor
              key={selectedNote.id}
              note={selectedNote}
              onChange={handleContentChange}
            />
          )}

          {activeTab === 'excalidraw' && (
            <ExcalidrawComponent
              key={selectedNote.id}
              note={selectedNote}
              onChange={handleExcalidrawChange}
              onLibraryChange={handleExcalidrawLibraryChange}
            />
          )}
        </div>
      </div>
    </SidebarInset>
  )
}
