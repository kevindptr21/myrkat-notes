import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Search, SidebarIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Separator } from '@/components/ui/separator'
import { useMyrkat, useSearch, useSidebar } from '@kevindptr/myrkat-sdk'
import { FC, useEffect, useState } from 'react'

export const Menu = () => {
  const { toggleSidebar } = useSidebar()
  const { open: openSearch, setOpen: setOpenSearch } = useSearch()
  // const { plugins } = useMyrkat()
  // const [MenubarPlugin, setMenuBarPlugin] = useState<FC | null>(null)
  //
  // useEffect(() => {
  //   if (activePlugin) {
  //     setMenuBarPlugin(plugins.getMenu(activePlugin.id))
  //   }
  // }, [activePlugin])

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="size-6"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>

        <Separator orientation="vertical" className="mr-2 h-4" />

        <div className="flex flex-1 items-center justify-between">
          <div />
          {/* {MenubarPlugin ? <MenubarPlugin /> : <div />} */}

          <Button
            variant="outline"
            className={cn(
              'bg-muted/25 text-muted-foreground hover:bg-muted/50 relative h-8 w-full flex-1 justify-start rounded-sm text-sm font-normal shadow-none sm:pr-12 md:w-40 md:flex-none lg:w-56 xl:w-64',
            )}
            onClick={() => setOpenSearch(!openSearch)}
          >
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-1.5 -translate-y-1/2"
            />
            <kbd className="bg-muted pointer-events-none absolute top-[0.3rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
