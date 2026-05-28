"use client"
import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { askExpenses, getApiErrorMessage } from "@/lib/api"

const EXAMPLE_QUESTIONS = [
  "How much did I spend on Food this month?",
  "What's my savings rate based on income vs expense?",
  "Which merchant did I spend the most on?",
  "Am I overspending compared to my income?",
]

export function AskWidget() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(q: string) {
    if (!q.trim() || loading) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    try {
      const res = await askExpenses(q.trim())
      setAnswer(res.answer)
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't get an answer right now."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Ask Your Expenses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(question)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about your spending..."
            maxLength={500}
            disabled={loading}
            className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={loading || !question.trim()} size="sm" className="h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuestion(q)
                submit(q)
              }}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {answer && (
          <div className="rounded-md border bg-purple-50 border-purple-200 px-4 py-3 text-sm">
            <p className="whitespace-pre-line leading-7 text-foreground">{answer}</p>
          </div>
        )}
        {error && (
          <div className="rounded-md border bg-red-50 border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
