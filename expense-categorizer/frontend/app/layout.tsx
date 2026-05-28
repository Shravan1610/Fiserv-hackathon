import type { Metadata } from "next"
import { Inter } from "next/font/google";
import type { ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Expense Categorizer",
  description: "AI-powered receipt OCR and expense categorization",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
