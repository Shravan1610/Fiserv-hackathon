"use client"
import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, CheckCircle, Loader2 } from "lucide-react"
import { uploadReceipt } from "@/lib/api"
import { UploadResponse } from "@/types/expense"

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-100 text-orange-800",
  Travel: "bg-blue-100 text-blue-800",
  Shopping: "bg-purple-100 text-purple-800",
  Entertainment: "bg-pink-100 text-pink-800",
  Healthcare: "bg-green-100 text-green-800",
  Utilities: "bg-yellow-100 text-yellow-800",
  Education: "bg-indigo-100 text-indigo-800",
  Other: "bg-gray-100 text-gray-700",
}

interface Props { onUploadSuccess: (result: UploadResponse) => void }

export function UploadCard({ onUploadSuccess }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await uploadReceipt(file)
      setResult(res)
      onUploadSuccess(res)
    } catch {
      setError("Upload failed. Please try again.")
    } finally { setLoading(false) }
  }

  return (
    <Card className="w-full">
      <CardHeader><CardTitle className="text-base font-medium">Upload Receipt</CardTitle></CardHeader>
      <CardContent>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
        >
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {loading
            ? <><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Processing receipt...</p></>
            : <><Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drop receipt here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF supported</p></>}
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        {result && (
          <div className="mt-4 rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Extracted successfully</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Merchant</span><span className="font-medium">{result.merchant}</span>
              <span className="text-muted-foreground">Amount</span><span className="font-medium">Rs. {result.amount.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">Date</span><span>{result.date}</span>
              <span className="text-muted-foreground">Category</span>
              <Badge className={CATEGORY_COLORS[result.category]}>{result.category}</Badge>
            </div>
            {result.insight && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{result.insight}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
