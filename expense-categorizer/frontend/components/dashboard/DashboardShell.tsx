"use client"

import type { ReactNode } from "react"
import { PanelLeftIcon } from "lucide-react"

import { useWorkspaceShell } from "@/components/workspace-shell-context"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
  contentClassName?: string
}

export function DashboardShell({
  title,
  description,
  action,
  children,
  contentClassName,
}: DashboardShellProps) {
  const { setOpenMobile } = useWorkspaceShell()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpenMobile(true)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white/60 text-foreground shadow-sm hover:bg-white md:hidden"
              aria-label="Open navigation"
            >
              <PanelLeftIcon className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-[1.05rem]">
                {title}
              </h1>
              <p className="truncate text-xs text-muted-foreground sm:text-[0.82rem]">
                {description}
              </p>
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </header>

      <main className={cn("flex-1 px-4 py-5 sm:px-6 sm:py-6", contentClassName)}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
          {children}
        </div>
      </main>
    </div>
  )
}
