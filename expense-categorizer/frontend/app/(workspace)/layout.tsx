"use client"

import { useState, type ReactNode } from "react"
import { XIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { WorkspaceShellContext } from "@/components/workspace-shell-context"
import { cn } from "@/lib/utils"

export default function WorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  const [openMobile, setOpenMobile] = useState(false)

  return (
    <WorkspaceShellContext.Provider value={{ openMobile, setOpenMobile }}>
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border/60 md:flex">
          <AppSidebar />
        </aside>

        <div
          className={cn(
            "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity md:hidden",
            openMobile ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setOpenMobile(false)}
          aria-hidden={!openMobile}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border/60 shadow-xl transition-transform duration-200 ease-out md:hidden",
            openMobile ? "translate-x-0" : "-translate-x-full"
          )}
          aria-hidden={!openMobile}
        >
          <button
            type="button"
            onClick={() => setOpenMobile(false)}
            className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-xl bg-white/80 text-sidebar-foreground shadow-sm hover:bg-white"
            aria-label="Close navigation"
          >
            <XIcon className="size-4" />
          </button>
          <AppSidebar onNavigate={() => setOpenMobile(false)} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </WorkspaceShellContext.Provider>
  )
}
