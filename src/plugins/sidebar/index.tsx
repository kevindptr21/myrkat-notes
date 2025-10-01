import {
  ChevronRight,
  FileIcon,
  Folder,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar'

import {
  UseMutateFunction,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useMyrkat } from '@kevindptr/myrkat-sdk/hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Note } from '../types'
import { StorageRequestPayload } from '@kevindptr/myrkat-sdk/type'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useVirtualizer } from '@kevindptr/myrkat-sdk'
import { Input } from '@/components/ui/input'

export interface NoteTree extends Note {
  children?: Array<NoteTree>
}

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

export function MyrkatNotesSidebar() {
  const queryClient = useQueryClient()
  const { events } = useMyrkat()
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  // TODO: Expand the selected note
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set())
  const [isHovered, setIsHovered] = useState(false)

  const { data: notes } = useSuspenseQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await events.request('storage:request', {
        operation: 'find',
        fileName: 'notes',
      })

      return (response || []) as Array<Note>
    },
  })

  useEffect(() => {
    events.publish('search', {
      data: notes.map((note) => ({
        ...note,
        onClick: () => {
          events.publish('note:selected', {
            ...note,
            content:
              typeof note.content !== 'string'
                ? JSON.stringify(note.content)
                : note.content,
          })
        },
      })),
      options: {
        includeScore: true,
        keys: ['title', 'content.content.text'],
      },
    })
  }, [notes])

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
        fileName: 'notes',
        data,
      }

      return events.request('storage:request', payload)
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      // After creating the note, select it immediately
      if (newNote) {
        events.publish('note:selected', newNote)
      }
    },
  })

  useEffect(() => {
    const handleNoteSelection = (note: unknown) => {
      const selectedNote = note as Note
      setActiveNoteId(selectedNote.id)
      // Expand all ancestors of the selected note
      setExpandedNoteIds((prev) => {
        const newSet = new Set(prev)
        newSet.add(selectedNote.id) // Also expand the selected note itself

        return newSet
      })
    }

    events.subscribe('note:selected', handleNoteSelection)

    return () => events.unsubscribe('note:selected', handleNoteSelection)
  }, [events])

  const noteTree = useMemo(() => buildNoteTree(notes), [notes])

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const virtualizer = useVirtualizer({
    count: noteTree.length,
    estimateSize: () => 32,
    overscan: 20,
    getScrollElement: () => scrollRef.current,
  })

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    if (activeNoteId) {
      const indexOfActiveNote = noteTree.findIndex(
        (pred) => pred.id === activeNoteId,
      )

      if (indexOfActiveNote > -1) {
        virtualizer.scrollToIndex(indexOfActiveNote, {
          behavior: 'smooth',
          align: 'center',
        })
      }
    }
  }, [activeNoteId])

  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]!">
      <SidebarHeader
        className="flex flex-row items-center justify-between"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span>Notes</span>
        {isHovered && (
          <Button
            variant="ghost"
            size="icon"
            className="h-fit w-fit p-0"
            onClick={() => createNote(null)}
          >
            <PlusIcon />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup
          ref={scrollRef}
          className="scrollbar h-[80rem] overflow-auto"
        >
          <SidebarGroupContent
            style={{
              height: virtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
            }}
          >
            <SidebarMenu
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
              }}
            >
              {virtualItems.map((vi) => {
                const note = noteTree[vi.index]

                return (
                  <div
                    id={note.id}
                    key={vi.key}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                  >
                    <Tree
                      item={note}
                      activeNoteId={activeNoteId}
                      createNote={createNote}
                    />
                  </div>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}

function Tree({
  item,
  activeNoteId = null,
  createNote,
}: {
  item: NoteTree
  activeNoteId: string | null
  createNote: UseMutateFunction<unknown, Error, string | null, unknown>
}) {
  const children = item?.children || []
  const hasChildren = children.length > 0

  const queryClient = useQueryClient()

  const { events } = useMyrkat()
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const { mutate: updateNote } = useMutation({
    mutationKey: ['update-note'],
    mutationFn: async ({ id, data }: { id: string; data: Partial<Note> }) => {
      const payload: StorageRequestPayload = {
        operation: 'update',
        fileName: 'notes',
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

  const handleNoteSelect = () => {
    events.publish('note:selected', item)
  }

  const handleSave = () => {
    if (title.trim() !== item.title) {
      updateNote({ id: item.id, data: { title: title.trim() } })
    }
    setIsEditing(false)
  }

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  if (!hasChildren) {
    return (
      <div
        className="hover:bg-accent flex items-center justify-between gap-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarMenuButton
          isActive={item.id === activeNoteId}
          className="data-[active=true]:bg-accent truncate"
          onClick={handleNoteSelect}
          onDoubleClick={() => setIsEditing(true)}
        >
          <FileIcon />
          {isEditing ? (
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setTitle(item.title)
                  setIsEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-fit py-1"
            />
          ) : (
            <span className="truncate">{item.title}</span>
          )}
        </SidebarMenuButton>
        <NoteActionHover
          item={item}
          isHovered={isHovered}
          createNote={createNote}
        />
      </div>
    )
  }

  return (
    <SidebarMenuItem>
      <Collapsible className="group/collapsible [&[data-state=open]>div>div>button>svg#collapsible-transform:first-child]:rotate-90">
        <div
          data-active={activeNoteId === item.id}
          className="hover:bg-accent data-[active=true]:bg-accent flex cursor-pointer items-center justify-between gap-2"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex items-center gap-2 truncate">
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className="w-fit"
                isActive={activeNoteId === item.id}
              >
                {isHovered ? (
                  <ChevronRight
                    id="collapsible-transform"
                    className="transition-transform"
                  />
                ) : (
                  <Folder />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>

            {isEditing ? (
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') {
                    setTitle(item.title)
                    setIsEditing(false)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-fit py-1"
              />
            ) : (
              <span
                className="truncate"
                onClick={handleNoteSelect}
                onDoubleClick={() => setIsEditing(true)}
              >
                {item.title}
              </span>
            )}
          </div>
          <NoteActionHover
            isHovered={isHovered}
            item={item}
            createNote={createNote}
          />
        </div>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0">
            {children.map((subItem, index) => (
              <Tree
                key={index}
                item={subItem}
                activeNoteId={activeNoteId}
                createNote={createNote}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

const NoteActionHover = ({
  isHovered,
  item,
  createNote,
}: {
  isHovered: boolean
  item: NoteTree
  createNote: UseMutateFunction<unknown, Error, string | null, unknown>
}) => {
  const { events } = useMyrkat()
  const queryClient = useQueryClient()

  const { mutate: deleteNote } = useMutation({
    mutationKey: ['delete-note'],
    mutationFn: async (id: string) => {
      const payload: StorageRequestPayload = {
        operation: 'delete',
        fileName: 'notes',
        where: { id },
      }

      return events.request('storage:request', payload)
    },
    onSuccess: () => {
      events.publish('note:selected', null)

      return queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  return (
    <div
      className={cn('hidden grid-cols-2 gap-3 px-2', {
        grid: isHovered,
      })}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-fit w-fit p-0"
        onClick={(e) => {
          e.stopPropagation()
          createNote(item.id)
          // onToggleExpand(note.id)
        }}
        // className="h-fit w-fit rounded-sm p-1!"
      >
        <PlusIcon className="size-4" />
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-fit w-fit p-0"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Trash2Icon className="text-destructive h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-[425px]"
        >
          <DialogHeader>
            <DialogTitle>Delete note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{item.title}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteNote(item.id)
                }}
              >
                Delete
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
