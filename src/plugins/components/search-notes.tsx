import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { SearchIcon } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMyrkat, useVirtualizer } from '@kevindptr/myrkat-sdk'
import type { Note } from '../types'
import Fuse from 'fuse.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SearchNotes() {
  const [open, setOpen] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const { events } = useMyrkat()
  const listRef = useRef<HTMLUListElement>(null)

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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const filteredNotes = useMemo(() => {
    const fuse = new Fuse(
      notes.map((n) => ({ ...n, content: JSON.parse(n.content) })),
      {
        includeScore: true,
        keys: ['title', 'content.content.text'],
      },
    )

    if (!search) return notes

    return fuse.search(search).map((res) => res.item)
  }, [search, notes])

  useEffect(() => {
    if (open) {
      setActiveIndex(0) // Reset active index when dialog opens
    }
  }, [open, search])

  useEffect(() => {
    if (listRef.current && activeIndex >= 0) {
      const activeItem = listRef.current.children[activeIndex] as HTMLElement
      if (activeItem) {
        activeItem.scrollIntoView({
          block: 'nearest',
        })
      }
    }
  }, [activeIndex])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, filteredNotes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredNotes[activeIndex]) {
        const note = filteredNotes[activeIndex]
        events.publish('note:selected', {
          ...note,
          content:
            typeof note.content !== 'string'
              ? JSON.stringify(note.content)
              : note.content,
        })

        setSearch('')
        setOpen(false)
      }
    }
  }

  const [scrollRef, setScrollRef] = useState<HTMLDivElement | null>(null)

  const scrollRefCallback = useCallback((el: HTMLDivElement) => {
    setScrollRef(el)
  }, [])

  const virtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => scrollRef,
    estimateSize: () => 35,
    overscan: 10,
  })

  return (
    <Fragment>
      <Button
        variant="ghost"
        className="w-fit p-1!"
        size="sm"
        onClick={() => setOpen(!open)}
      >
        <SearchIcon />
      </Button>

      <Dialog modal open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 p-0 transition-all ease-in-out"
        >
          <DialogHeader className="m-0 gap-0 border-b p-0">
            <DialogTitle className="relative">
              <SearchIcon
                size={14}
                className="absolute top-1/2 left-2 -translate-y-1/2"
              />
              <Input
                onChange={({ target: { value } }) => setSearch(value)}
                onKeyDown={handleKeyDown}
                className="border-0 pl-8 shadow-none ring-0 focus-visible:ring-0"
                placeholder="Search notes..."
                autoFocus
              />
            </DialogTitle>
            <DialogDescription className="h-0!" />
          </DialogHeader>

          <div
            key={String(open)}
            ref={scrollRefCallback}
            className={cn('h-80 overflow-auto', {
              'h-12': filteredNotes.length === 0,
            })}
          >
            <ul
              ref={listRef}
              className="w-full px-4 py-3"
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {filteredNotes.length > 0 ? (
                virtualizer.getVirtualItems().map((vi, index) => {
                  const note = filteredNotes[vi.index]

                  return (
                    <li
                      key={note.id}
                      tabIndex={-1}
                      className="p-2 focus:outline-none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${vi.size}px`,
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-start',
                          index === activeIndex &&
                            'bg-accent text-accent-foreground',
                        )}
                        onClick={() => {
                          events.publish('note:selected', {
                            ...note,
                            content:
                              typeof note.content !== 'string'
                                ? JSON.stringify(note.content)
                                : note.content,
                          })
                          setSearch('')
                          setOpen(false)
                        }}
                      >
                        {note.title}
                      </Button>
                    </li>
                  )
                })
              ) : (
                <li
                  tabIndex={-1}
                  className="p-2"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: 32,
                    transform: `translateY(0)`,
                  }}
                >
                  No results found.
                </li>
              )}

              {/* {filteredNotes.map((note, index) => ( */}
              {/*   <li key={note.id} tabIndex={-1} className="focus:outline-none"> */}
              {/*     <Button */}
              {/*       variant="ghost" */}
              {/*       className={cn( */}
              {/*         'w-full justify-start', */}
              {/*         index === activeIndex && */}
              {/*           'bg-accent text-accent-foreground', */}
              {/*       )} */}
              {/*       onClick={() => { */}
              {/*         events.publish('note:selected', { */}
              {/*           ...note, */}
              {/*           content: JSON.stringify(note.content), */}
              {/*         }) */}
              {/*         setSearch('') */}
              {/*         setOpen(false) */}
              {/*       }} */}
              {/*     > */}
              {/*       {note.title} */}
              {/*     </Button> */}
              {/*   </li> */}
              {/* ))} */}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </Fragment>
  )
}
