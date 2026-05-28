"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BadgeIndianRupeeIcon,
  BarChart3Icon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  ScanSearchIcon,
  SparklesIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Upload Receipt", href: "/upload", icon: ScanSearchIcon },
  { title: "All Expenses", href: "/expenses", icon: ReceiptTextIcon },
  { title: "Income", href: "/income", icon: PiggyBankIcon },
  { title: "Analytics", href: "/analytics", icon: BarChart3Icon },
]

interface AppSidebarProps {
  onNavigate?: () => void
  className?: string
}

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="border-b border-sidebar-border/60 px-3 py-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-sidebar-accent/60"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <BadgeIndianRupeeIcon className="size-4" />
          </div>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Expense Categorizer</span>
            <span className="truncate text-xs text-sidebar-foreground/65">
              Receipt analytics workspace
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="px-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
          Workspace
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-[0.92rem] transition-colors",
                  isActive
                    ? "bg-white text-sidebar-foreground shadow-sm ring-1 ring-border/60"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border/60 p-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/55 px-3 py-3 text-sm shadow-sm">
          <div className="rounded-xl bg-sidebar-primary/10 p-2 text-sidebar-primary">
            <SparklesIcon className="size-4" />
          </div>
          <div>
            <p className="font-medium text-sidebar-foreground">Quiet automation</p>
            <p className="text-xs leading-5 text-sidebar-foreground/65">
              OCR, categorization, and review in one calmer workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
