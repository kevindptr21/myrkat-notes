import { useMyrkat } from '@kevindptr/myrkat-sdk'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { NoteTreeItem } from './components/note-tree-item'
import type { NoteTree } from './components/note-tree-item'
import type { Note } from './types'
import type { StorageRequestPayload } from '@/storage/service'
import { Button } from '@/components/ui/button'

// Utility to build the note hierarchy
const buildNoteTree = (notes: Array<Note>): Array<NoteTree> => {
  const noteMap = new Map<string, NoteTree>()
  const rootNotes: Array<NoteTree> = []

  notes.forEach((note) => {
    noteMap.set(note.id, { ...note, children: [] })
  })

  noteMap.forEach((note) => {
    if (note.parentId && noteMap.has(note.parentId)) {
      noteMap?.get(note.parentId)?.children?.push(note)
    } else {
      rootNotes.push(note)
    }
  })

  return rootNotes
}

export const NotesSidebar = () => {
  const queryClient = useQueryClient()
  const { events } = useMyrkat()
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  useEffect(() => {
    const handleNoteSelection = (note: unknown) => {
      setActiveNoteId((note as Note).id)
    }
    events.subscribe('note:selected', handleNoteSelection)
    return () => events.unsubscribe('note:selected', handleNoteSelection)
  }, [])

  const { data: notes } = useSuspenseQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await events.request<Array<Note>>('storage:request', {
        operation: 'find',
        tableName: 'notes',
      })
      return response || []
    },
  })

  const { mutate: createNote } = useMutation({
    mutationKey: ['create-note'],
    mutationFn: async (parentId: string | null = null) => {
      const data: Partial<Note> = {
        title: 'Untitled',
        parentId,
        content: '[{ "type": "paragraph", "content": "" }]',
        excalidraw: '',
      }

      const payload: StorageRequestPayload = {
        operation: 'insert',
        tableName: 'notes',
        data,
      }

      return events.request<Note>('storage:request', payload)
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      // After creating the note, select it immediately
      if (newNote) {
        events.publish('note:selected', newNote)
      }
    },
  })

  const { mutate: updateNote } = useMutation({
    mutationKey: ['update-note'],
    mutationFn: async ({ id, data }: { id: string; data: Partial<Note> }) => {
      const payload: StorageRequestPayload = {
        operation: 'update',
        tableName: 'notes',
        where: { id },
        data,
      }

      return events.request('storage:request', payload)
    },
    onSuccess: (updated) => {
      const note = (updated as Array<Note>)[0]
      events.publish('note:selected', note)
      return queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const { mutate: deleteNote } = useMutation({
    mutationKey: ['delete-note'],
    mutationFn: async (id: string) => {
      const payload: StorageRequestPayload = {
        operation: 'delete',
        tableName: 'notes',
        where: { id },
      }

      return events.request('storage:request', payload)
    },
    onSuccess: () => {
      events.publish('note:selected', null)

      return queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const noteTree = buildNoteTree(notes)

  return (
    <div className="p-2">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold">Notes</h3>
        <Button variant="outline" size="sm" onClick={() => createNote(null)}>
          New
        </Button>
      </div>
      <div className="space-y-1">
        {noteTree?.map((note) => (
          <NoteTreeItem
            key={note.id}
            note={note}
            createNote={createNote}
            updateNote={updateNote}
            deleteNote={deleteNote}
            activeNoteId={activeNoteId}
          />
        ))}
      </div>
    </div>
  )
}
