import {
  FolderIcon,
  FolderOpenIcon,
  NotepadText,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMyrkat } from '@kevindptr/myrkat-sdk'
import type { UseMutateFunction } from '@tanstack/react-query'
import type { Note } from '../types'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
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
import { Button } from '@/components/ui/button'

export interface NoteTree extends Note {
  children?: Array<NoteTree>
}

interface NoteTreeItemProps {
  note: NoteTree
  level?: number
  createNote: UseMutateFunction<any, Error, string | null | undefined, unknown>
  updateNote: UseMutateFunction<
    any,
    Error,
    { id: string; data: Partial<Note> },
    unknown
  >
  deleteNote: UseMutateFunction<any, Error, string, unknown>
  activeNoteId: string | null
}

export const NoteTreeItem = ({
  note,
  level = 0,
  createNote,
  updateNote,
  deleteNote,
  activeNoteId,
}: NoteTreeItemProps) => {
  const { events } = useMyrkat()
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const children = note?.children || []
  const hasChildren = children.length > 0

  const handleNoteSelect = () => {
    events.publish('note:selected', note)
  }

  const handleSave = () => {
    if (title.trim() !== note.title) {
      updateNote({ id: note.id, data: { title: title.trim() } })
    }
    setIsEditing(false)
  }

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'group hover:bg-primary/90 flex cursor-pointer items-center gap-1 rounded-md p-2 hover:text-white',
          {
            'bg-primary text-white':
              activeNoteId && activeNoteId === note.id && !isEditing,
            'hover:bg-primary-foreground hover:text-primary': isEditing,
          },
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={handleNoteSelect}
        onDoubleClick={() => setIsEditing(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded-sm p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {isOpen ? (
                <FolderOpenIcon className="size-4" />
              ) : (
                <FolderIcon className="size-4" />
              )}
            </button>
          </CollapsibleTrigger>
        ) : (
          <NotepadText className="size-4" />
        )}
        {isEditing ? (
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setTitle(note.title)
                setIsEditing(false)
              }
            }}
            className="h-7"
            onClick={(e) => e.stopPropagation()} // Prevent note selection
          />
        ) : (
          <span className="flex-1">{note.title}</span>
        )}
        {!isEditing && (
          <div
            className={cn('flex items-center opacity-0', {
              'opacity-100': isHovered,
            })}
          >
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                createNote(note.id)
                setIsOpen(true)
              }}
              className="h-fit w-fit rounded-sm p-1!"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className="h-fit w-fit rounded-sm p-1!"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent
                onClick={(e) => e.stopPropagation()}
                className="sm:max-w-[425px]"
              >
                <DialogHeader>
                  <DialogTitle>Delete note</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{note.title}"? This action
                    cannot be undone.
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
                        deleteNote(note.id)
                      }}
                    >
                      Delete
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      {hasChildren && (
        <CollapsibleContent>
          {children.map((child) => (
            <NoteTreeItem
              key={child.id}
              note={child}
              level={level + 1}
              createNote={createNote}
              updateNote={updateNote}
              deleteNote={deleteNote}
              activeNoteId={activeNoteId}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}
