import { useMyrkat, useVirtualizer } from '@kevindptr/myrkat-sdk'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NoteTreeItem } from './components/note-tree-item'
import type { NoteTree } from './components/note-tree-item'
import type { Note } from './types'
import type { StorageRequestPayload } from '@/storage/service'
import { Button } from '@/components/ui/button'
import { SearchNotes } from './components/search-notes'

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
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set())

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

  const parentMap = useMemo(() => {
    const map = new Map<string, string>()
    notes.forEach((note) => {
      if (note.parentId) {
        map.set(note.id, note.parentId)
      }
    })
    return map
  }, [notes])

  const getNoteAncestors = (noteId: string | null): Set<string> => {
    const ancestors = new Set<string>()
    let currentNoteId = noteId
    while (currentNoteId) {
      const parentId = parentMap.get(currentNoteId)
      if (parentId) {
        ancestors.add(parentId)
        currentNoteId = parentId
      } else {
        currentNoteId = null
      }
    }
    return ancestors
  }

  const handleToggleExpand = (noteId: string) => {
    setExpandedNoteIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  useEffect(() => {
    const handleNoteSelection = (note: unknown) => {
      const selectedNote = note as Note
      setActiveNoteId(selectedNote.id)
      // Expand all ancestors of the selected note
      setExpandedNoteIds((prev) => {
        const newSet = new Set(prev)
        newSet.add(selectedNote.id) // Also expand the selected note itself
        getNoteAncestors(selectedNote.id).forEach((ancestorId) =>
          newSet.add(ancestorId),
        )
        return newSet
      })
    }
    events.subscribe('note:selected', handleNoteSelection)
    return () => events.unsubscribe('note:selected', handleNoteSelection)
  }, [events, getNoteAncestors])

  const noteTree = buildNoteTree(notes)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const virtualizer = useVirtualizer({
    count: noteTree.length,
    estimateSize: () => 35,
    overscan: 5,
    getScrollElement: () => scrollRef.current,
  })

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (activeNoteId) {
      const element = document.getElementById(activeNoteId)
      element?.scrollIntoView({
        behavior: 'smooth',
      })
    }
  }, [activeNoteId])

  return (
    <div className="p-2">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold">Notes</h3>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => createNote(null)}>
            New
          </Button>

          <SearchNotes />
        </div>
      </div>

      <div ref={scrollRef} className="h-[45rem] overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              // minHeight: 200,
              transform: `translateY(${virtualItems?.[0]?.start}px)`,
            }}
          >
            {virtualItems.map((vi) => {
              const note = noteTree[vi.index]

              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                >
                  <NoteTreeItem
                    key={note.id}
                    note={note}
                    createNote={createNote}
                    updateNote={updateNote}
                    deleteNote={deleteNote}
                    activeNoteId={activeNoteId}
                    isExpanded={expandedNoteIds.has(note.id)}
                    onToggleExpand={handleToggleExpand}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
