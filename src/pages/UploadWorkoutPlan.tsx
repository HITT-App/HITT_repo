import { useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft, Upload, Camera, FileText, Sparkles, Loader2,
  CheckCircle2, ChevronDown, ChevronUp, Calendar, Dumbbell,
  Clock, Flame, AlertTriangle, Check, X,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { format, addDays, startOfWeek, getDay } from "date-fns"
import type { ExerciseSnapshot } from "@/integrations/supabase/types"

interface ParsedExercise extends ExerciseSnapshot {}

interface ParsedSession {
  title: string
  category: string
  duration_minutes: number
  calories_burned: number
  day_of_week: number
  week_number: number
  exercises: ParsedExercise[]
}

interface ParseResult {
  planTitle: string
  assessment: string
  alignmentScore: number
  adjustmentNotes: string[]
  sessions: ParsedSession[]
  adjustedSessions?: ParsedSession[]
}

const CATEGORY_COLORS: Record<string, string> = {
  strength: "#8b5cf6",
  cardio: "#0ea5e9",
  hiit: "#f97316",
  recovery: "#10b981",
  flexibility: "#10b981",
  sports: "#f59e0b",
}

const scoreColor = (n: number) =>
  n >= 80 ? "#4ade80" : n >= 60 ? "#facc15" : "#f87171"

function SessionCard({ session, expanded, onToggle }: {
  session: ParsedSession
  expanded: boolean
  onToggle: () => void
}) {
  const color = CATEGORY_COLORS[session.category] ?? "#f97316"
  return (
    <div className="rounded-[16px] overflow-hidden border border-border/60 bg-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 touch-manipulation text-left"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22` }}>
          <Dumbbell className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-foreground truncate">{session.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {session.duration_minutes}min
            {session.exercises.length > 0 && ` · ${session.exercises.length} exercises`}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>
      {expanded && session.exercises.length > 0 && (
        <div className="border-t border-border/40 px-3.5 pb-3.5 pt-2 space-y-2">
          {session.exercises.map((ex, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-muted/50 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-foreground">{ex.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[
                    ex.sets ? `${ex.sets} sets` : null,
                    ex.reps ? `${ex.reps} reps` : null,
                    ex.duration_seconds ? `${ex.duration_seconds}s` : null,
                  ].filter(Boolean).join(" · ") || "See plan"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UploadWorkoutPlan() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [step, setStep] = useState<"upload" | "processing" | "review" | "saving">("upload")
  const [pasteMode, setPasteMode] = useState(false)
  const [pastedText, setPastedText] = useState("")
  const [result, setResult] = useState<ParseResult | null>(null)
  const [useAdjusted, setUseAdjusted] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    const dow = getDay(d)
    const daysUntilMonday = dow === 0 ? 1 : 8 - dow
    return format(addDays(d, daysUntilMonday), "yyyy-MM-dd")
  })

  const activeSessions = result
    ? (useAdjusted && result.adjustedSessions?.length ? result.adjustedSessions : result.sessions)
    : []

  const processContent = useCallback(async (content: string, contentType: "image" | "text") => {
    if (!user) return
    setStep("processing")
    try {
      const { data: prefs } = await supabase
        .from("workout_preferences")
        .select("workout_goal, fitness_level")
        .eq("user_id", user.id)
        .maybeSingle()

      const bodyScanSummary = localStorage.getItem("hiit-body-scan-summary") || undefined

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-workout-plan`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            contentType,
            userGoal: prefs?.workout_goal,
            fitnessLevel: prefs?.fitness_level,
            bodyScanSummary,
          }),
        }
      )
      let json: any
      try { json = await res.json() } catch { throw new Error(`Parse failed (${res.status})`) }
      if (!res.ok) throw new Error(json?.error || `Parse failed (${res.status})`)
      if (!json.sessions?.length) throw new Error("No sessions found in your plan — try a clearer photo or paste the text directly.")
      setResult(json)
      setUseAdjusted(false)
      setStep("review")
    } catch (err: any) {
      toast.error(err.message || "Could not read your plan. Try a clearer image or paste the text.")
      setStep("upload")
    }
  }, [user])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => processContent(reader.result as string, "image")
      reader.readAsDataURL(file)
    } else {
      const text = await file.text()
      processContent(text, "text")
    }
  }

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return
    processContent(pastedText.trim(), "text")
  }

  const mapSessionsToSchedule = (sessions: ParsedSession[]): { scheduled_date: string; session: ParsedSession }[] => {
    const base = new Date(startDate)
    const baseMonday = startOfWeek(base, { weekStartsOn: 1 })
    return sessions.map(s => {
      const weekOffset = (s.week_number - 1) * 7
      const dayOffset = s.day_of_week === 0 ? 6 : s.day_of_week - 1
      const date = addDays(baseMonday, weekOffset + dayOffset)
      return { scheduled_date: format(date, "yyyy-MM-dd"), session: s }
    })
  }

  const handleSave = async () => {
    if (!user || !result) return
    setStep("saving")
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) throw new Error("Not authenticated")

      const mapped = mapSessionsToSchedule(activeSessions)
      const rows = mapped.map(({ scheduled_date, session }) => ({
        user_id: userId,
        scheduled_date,
        workout_title: session.title,
        workout_description: result.assessment,
        estimated_duration_minutes: session.duration_minutes,
        estimated_calories: session.calories_burned || null,
        workout_source: "ai_generated",
        workout_id: null,
        exercises_snapshot: session.exercises,
        status: "scheduled",
      }))

      const { error } = await supabase.from("scheduled_workouts").insert(rows)
      if (error) throw error

      toast.success(`${rows.length} sessions added to your schedule!`)
      navigate("/schedule")
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan.")
      setStep("review")
    }
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Import Workout Plan</h1>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">

        {/* ── UPLOAD STEP ── */}
        {step === "upload" && (
          <>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Upload a photo of your plan, a text/CSV file, or paste it in — the AI will review it against your goals and body scan results.
            </p>

            {!pasteMode ? (
              <div className="space-y-3">
                {/* Photo */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 rounded-[18px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-semibold text-foreground">Photo / screenshot</p>
                    <p className="text-[12px] text-muted-foreground">Handwritten notes, PT sheet, app screenshot</p>
                  </div>
                </button>

                {/* File */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 rounded-[18px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-semibold text-foreground">Upload file</p>
                    <p className="text-[12px] text-muted-foreground">Text file or CSV exported from Excel/Sheets</p>
                  </div>
                </button>

                {/* Paste */}
                <button
                  onClick={() => setPasteMode(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-[18px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-semibold text-foreground">Paste text</p>
                    <p className="text-[12px] text-muted-foreground">Copy from notes, messages, or any app</p>
                  </div>
                </button>

                <p className="text-[11px] text-muted-foreground/60 text-center pt-1">
                  For XLS files, export as CSV from Excel or Google Sheets first
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste your workout plan here — sessions, exercises, sets, reps…"
                  className="w-full min-h-[220px] p-3.5 rounded-[14px] bg-card border border-border text-[13px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2.5">
                  <button
                    onClick={() => { setPasteMode(false); setPastedText("") }}
                    className="flex-1 py-3 rounded-xl border border-border text-[13px] font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasteSubmit}
                    disabled={!pastedText.trim()}
                    className="flex-[2] py-3 rounded-xl bg-primary text-white text-[13px] font-bold gap-2 flex items-center justify-center disabled:opacity-40"
                  >
                    <Sparkles className="w-4 h-4" /> Analyse plan
                  </button>
                </div>
              </div>
            )}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleFileChange(e, true)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              className="hidden"
              onChange={e => handleFileChange(e, false)}
            />
          </>
        )}

        {/* ── PROCESSING STEP ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Reviewing your plan…</p>
              <p className="text-[13px] text-muted-foreground mt-1">Cross-referencing with your goals and body scan</p>
            </div>
          </div>
        )}

        {/* ── REVIEW STEP ── */}
        {(step === "review" || step === "saving") && result && (
          <>
            {/* Plan title */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#4ade80] flex-shrink-0" />
              <h2 className="text-[15px] font-bold text-foreground">{result.planTitle}</h2>
            </div>

            {/* AI assessment card */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-start gap-3">
                {/* Score ring */}
                <div className="flex-shrink-0 w-14 h-14 relative flex items-center justify-center">
                  <svg className="absolute inset-0" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                    <circle
                      cx="28" cy="28" r="24" fill="none"
                      stroke={scoreColor(result.alignmentScore)}
                      strokeWidth="5"
                      strokeDasharray={`${(result.alignmentScore / 100) * 150.8} 150.8`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                    />
                  </svg>
                  <span className="text-[13px] font-extrabold" style={{ color: scoreColor(result.alignmentScore) }}>
                    {result.alignmentScore}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">AI Assessment</p>
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">{result.assessment}</p>
                </div>
              </div>

              {/* Adjustment notes */}
              {result.adjustmentNotes?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {result.adjustmentNotes.map((note, i) => (
                    <div key={i} className="flex gap-2 items-start bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.25)] rounded-xl px-3 py-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24] flex-shrink-0 mt-0.5" />
                      <span className="text-[12px] text-muted-foreground leading-snug">{note}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Toggle adjusted vs original */}
              {result.adjustedSessions?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setUseAdjusted(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold border transition-colors ${
                      !useAdjusted ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-border"
                    }`}
                  >
                    {!useAdjusted && <Check className="w-3.5 h-3.5" />} Original
                  </button>
                  <button
                    onClick={() => setUseAdjusted(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold border transition-colors ${
                      useAdjusted ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border"
                    }`}
                  >
                    {useAdjusted && <Sparkles className="w-3.5 h-3.5" />} AI adjusted
                  </button>
                </div>
              )}
            </Card>

            {/* Sessions */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                {activeSessions.length} session{activeSessions.length !== 1 ? "s" : ""} found
              </p>
              {activeSessions.map((s, i) => (
                <SessionCard
                  key={i}
                  session={s}
                  expanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                />
              ))}
            </div>

            {/* Start date picker */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-[13px] font-bold text-foreground">Start date</p>
              </div>
              <p className="text-[12px] text-muted-foreground mb-3">
                Sessions will be scheduled from the week containing this date.
              </p>
              <input
                type="date"
                value={startDate}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 text-[13.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {/* Preview */}
              <div className="mt-3 space-y-1">
                {mapSessionsToSchedule(activeSessions).slice(0, 4).map(({ scheduled_date, session }, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">{session.title}</span>
                    <span className="text-[12px] font-medium text-foreground">
                      {format(new Date(scheduled_date), "EEE d MMM")}
                    </span>
                  </div>
                ))}
                {activeSessions.length > 4 && (
                  <p className="text-[11px] text-muted-foreground/60 text-center pt-1">
                    +{activeSessions.length - 4} more sessions
                  </p>
                )}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => { setResult(null); setStep("upload") }}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-border text-[13px] font-semibold text-muted-foreground"
              >
                <X className="w-4 h-4" /> Retry
              </button>
              <button
                onClick={handleSave}
                disabled={step === "saving"}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] rounded-xl py-3 disabled:opacity-50"
              >
                {step === "saving"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Check className="w-4 h-4" /> Add to schedule</>
                }
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
