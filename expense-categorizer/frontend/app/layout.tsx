import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Expense Categorizer",
  description: "AI-powered receipt OCR and expense categorization",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
