"use client"

import { createContext, useContext } from "react"

type WorkspaceShellContextValue = {
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
}

export const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(null)

export function useWorkspaceShell() {
  const ctx = useContext(WorkspaceShellContext)
  if (!ctx) {
    throw new Error("useWorkspaceShell must be used within WorkspaceShellContext.Provider")
  }
  return ctx
}
