"use client"
import { useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Upload } from "lucide-react"
import { extractReceipt, getApiErrorMessage } from "@/lib/api"
import { ExtractResponse } from "@/types/expense"
import { ReviewCard } from "./ReviewCard"

interface Props {
  onUploadSuccess: () => void
}

export function UploadCard({ onUploadSuccess }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<ExtractResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function resetInput() {
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    setDraft(null)
    try {
      const res = await extractReceipt(file)
      setDraft(res)
    } catch (err) {
      setError(getApiErrorMessage(err, "Upload failed. Please try again."))
    } finally {
      setLoading(false)
      resetInput()
    }
  }

  function handleSaved() {
    setDraft(null)
    onUploadSuccess()
  }

  function handleDiscard() {
    setDraft(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="w-full rounded-2xl border-white/70 bg-white/82 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
        <CardHeader className="space-y-2 px-6 pb-5 pt-6">
          <CardTitle className="text-lg font-semibold">Upload a new receipt</CardTitle>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            We'll OCR the receipt, run Gemini twice (extract + verify), and let you review before anything is saved.
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border border-dashed px-6 py-14 text-center transition-all
              ${
                dragging
                  ? "border-primary bg-primary/[0.08] shadow-[0_10px_28px_rgba(47,127,142,0.12)]"
                  : "border-border/80 bg-muted/[0.22] hover:border-primary/[0.35] hover:bg-primary/5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {loading ? (
              <>
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-base font-semibold">Reading receipt…</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  OCR → Gemini extract → Gemini verify → categorize.
                </p>
              </>
            ) : (
              <>
                <Upload className="mx-auto mb-3 h-8 w-8 text-primary" />
                <p className="text-base font-semibold">Drop a receipt here or click to browse</p>
                <p className="mt-2 text-sm text-muted-foreground">JPG, PNG, WEBP, and PDF supported</p>
              </>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {draft && (
        <ReviewCard draft={draft} onSaved={handleSaved} onDiscard={handleDiscard} />
      )}
    </div>
  )
}
