import { useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft, Upload, Camera, FileText, Sparkles, Loader2,
  CheckCircle2, ChevronDown, ChevronUp, Calendar, Dumbbell,
  AlertTriangle, Check, X, RefreshCw, Plus,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { format, addDays, addWeeks, startOfWeek, getDay } from "date-fns"
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

const nextMonday = () => {
  const d = new Date()
  const dow = getDay(d)
  return format(addDays(d, dow === 0 ? 1 : 8 - dow), "yyyy-MM-dd")
}

function SessionCard({ session, expanded, onToggle }: {
  session: ParsedSession; expanded: boolean; onToggle: () => void
}) {
  const color = CATEGORY_COLORS[session.category] ?? "#f97316"
  return (
    <div className="rounded-[16px] overflow-hidden border border-border/60 bg-card">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3.5 touch-manipulation text-left">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
          <Dumbbell className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-foreground truncate">{session.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {session.duration_minutes}min{session.exercises.length > 0 && ` · ${session.exercises.length} exercises`}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && session.exercises.length > 0 && (
        <div className="border-t border-border/40 px-3.5 pb-3.5 pt-2 space-y-2">
          {session.exercises.map((ex, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-muted/50 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-foreground">{ex.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[ex.sets ? `${ex.sets} sets` : null, ex.reps ? `${ex.reps} reps` : null, ex.duration_seconds ? `${ex.duration_seconds}s` : null].filter(Boolean).join(" · ") || "See plan"}
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
  const pendingRowsRef = useRef<any[]>([])

  const [step, setStep] = useState<"upload" | "processing" | "review" | "saving">("upload")
  const [pasteMode, setPasteMode] = useState(false)
  const [pastedText, setPastedText] = useState("")
  const [result, setResult] = useState<ParseResult | null>(null)
  const [useAdjusted, setUseAdjusted] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(nextMonday)
  const [endDate, setEndDate] = useState(() => format(addWeeks(new Date(nextMonday()), 8), "yyyy-MM-dd"))
  const [showConflict, setShowConflict] = useState(false)
  const [conflictCount, setConflictCount] = useState(0)

  const activeSessions = result
    ? (useAdjusted && result.adjustedSessions?.length ? result.adjustedSessions : result.sessions)
    : []

  // Repeats the weekly pattern from startDate until endDate
  const buildRows = useCallback((sessions: ParsedSession[], userId: string, assessment: string) => {
    if (!sessions.length) return []
    const base = startOfWeek(new Date(startDate), { weekStartsOn: 1 })
    const end = new Date(endDate)
    const maxWeek = Math.max(...sessions.map(s => s.week_number))
    const rows: any[] = []
    let cycle = 0

    while (true) {
      let anyAdded = false
      for (const s of sessions) {
        const weekOffset = cycle * maxWeek + (s.week_number - 1)
        const dayOffset = s.day_of_week === 0 ? 6 : s.day_of_week - 1
        const date = addDays(base, weekOffset * 7 + dayOffset)
        if (date > end) continue
        rows.push({
          user_id: userId,
          scheduled_date: format(date, "yyyy-MM-dd"),
          workout_title: s.title,
          workout_description: assessment,
          estimated_duration_minutes: s.duration_minutes,
          estimated_calories: s.calories_burned || null,
          workout_source: "ai_generated",
          workout_id: null,
          exercises_snapshot: s.exercises,
          status: "scheduled",
        })
        anyAdded = true
      }
      cycle++
      if (!anyAdded || addDays(base, cycle * maxWeek * 7) > end) break
    }

    return rows.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  }, [startDate, endDate])

  // Preview rows (for the schedule card)
  const previewRows = activeSessions.length
    ? buildRows(activeSessions, "", "").slice(0, 5)
    : []
  const totalRows = activeSessions.length
    ? buildRows(activeSessions, "", "").length
    : 0

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
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content, contentType, userGoal: prefs?.workout_goal, fitnessLevel: prefs?.fitness_level, bodyScanSummary }),
        }
      )
      let json: any
      try { json = await res.json() } catch { throw new Error(`Parse failed (${res.status})`) }
      if (!res.ok) throw new Error(json?.error || `Parse failed (${res.status})`)
      if (!json.sessions?.length) throw new Error("No sessions found — try a clearer photo or paste the text directly.")
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
      processContent(await file.text(), "text")
    }
  }

  const doSave = async (rows: any[], strategy: "replace" | "add") => {
    setShowConflict(false)
    setStep("saving")
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) throw new Error("Not authenticated")

      if (strategy === "replace") {
        const dates = rows.map((r: any) => r.scheduled_date)
        const minDate = dates.reduce((a: string, b: string) => a < b ? a : b)
        const maxDate = dates.reduce((a: string, b: string) => a > b ? a : b)
        const { error: delErr } = await supabase
          .from("scheduled_workouts")
          .delete()
          .eq("user_id", userId)
          .gte("scheduled_date", minDate)
          .lte("scheduled_date", maxDate)
        if (delErr) throw delErr
      }

      const { error } = await supabase.from("scheduled_workouts").insert(rows)
      if (error) throw error

      toast.success(`${rows.length} sessions added to your schedule!`)
      navigate("/workout-schedule")
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan.")
      setStep("review")
    }
  }

  const handleSaveClick = async () => {
    if (!user || !result) return
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData?.session?.user?.id
    if (!userId) return

    const rows = buildRows(activeSessions, userId, result.assessment)
    if (!rows.length) { toast.error("No sessions to schedule in this date range."); return }

    pendingRowsRef.current = rows
    const dates = rows.map((r: any) => r.scheduled_date)
    const minDate = dates.reduce((a: string, b: string) => a < b ? a : b)
    const maxDate = dates.reduce((a: string, b: string) => a > b ? a : b)

    const { count } = await supabase
      .from("scheduled_workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("scheduled_date", minDate)
      .lte("scheduled_date", maxDate)

    if (count && count > 0) {
      setConflictCount(count)
      setShowConflict(true)
    } else {
      doSave(rows, "add")
    }
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
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

        {/* ── UPLOAD ── */}
        {step === "upload" && (
          <>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Upload a photo of your plan, a text/CSV file, or paste it in — the AI will review it against your goals and body scan results.
            </p>

            {!pasteMode ? (
              <div className="space-y-3">
                <button onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 rounded-[18px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-semibold text-foreground">Photo / screenshot</p>
                    <p className="text-[12px] text-muted-foreground">Handwritten notes, PT sheet, app screenshot</p>
                  </div>
                </button>

                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 rounded-[18px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-semibold text-foreground">Upload file</p>
                    <p className="text-[12px] text-muted-foreground">Text file or CSV exported from Excel/Sheets</p>
                  </div>
                </button>

                <button onClick={() => setPasteMode(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-[18px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation">
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
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste your workout plan here — sessions, exercises, sets, reps…"
                  className="w-full min-h-[220px] p-3.5 rounded-[14px] bg-card border border-border text-[13px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2.5">
                  <button onClick={() => { setPasteMode(false); setPastedText("") }}
                    className="flex-1 py-3 rounded-xl border border-border text-[13px] font-semibold text-muted-foreground">
                    Cancel
                  </button>
                  <button onClick={() => { if (pastedText.trim()) processContent(pastedText.trim(), "text") }}
                    disabled={!pastedText.trim()}
                    className="flex-[2] py-3 rounded-xl bg-primary text-white text-[13px] font-bold gap-2 flex items-center justify-center disabled:opacity-40">
                    <Sparkles className="w-4 h-4" /> Analyse plan
                  </button>
                </div>
              </div>
            )}

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileChange(e, true)} />
            <input ref={fileInputRef} type="file" accept=".txt,.csv,text/plain,text/csv" className="hidden" onChange={e => handleFileChange(e, false)} />
          </>
        )}

        {/* ── PROCESSING ── */}
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

        {/* ── REVIEW ── */}
        {(step === "review" || step === "saving") && result && (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#4ade80] flex-shrink-0" />
              <h2 className="text-[15px] font-bold text-foreground">{result.planTitle}</h2>
            </div>

            {/* Assessment card */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-14 h-14 relative flex items-center justify-center">
                  <svg className="absolute inset-0" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                    <circle cx="28" cy="28" r="24" fill="none"
                      stroke={scoreColor(result.alignmentScore)} strokeWidth="5"
                      strokeDasharray={`${(result.alignmentScore / 100) * 150.8} 150.8`}
                      strokeLinecap="round" transform="rotate(-90 28 28)" />
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

              {result.adjustedSessions?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setUseAdjusted(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold border transition-colors ${!useAdjusted ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-border"}`}>
                    {!useAdjusted && <Check className="w-3.5 h-3.5" />} Original
                  </button>
                  <button onClick={() => setUseAdjusted(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold border transition-colors ${useAdjusted ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border"}`}>
                    {useAdjusted && <Sparkles className="w-3.5 h-3.5" />} AI adjusted
                  </button>
                </div>
              )}
            </Card>

            {/* Sessions */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                {activeSessions.length} session{activeSessions.length !== 1 ? "s" : ""} per week
              </p>
              {activeSessions.map((s, i) => (
                <SessionCard key={i} session={s} expanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)} />
              ))}
            </div>

            {/* Date range + repeat */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-[13px] font-bold text-foreground">Schedule duration</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Start date</p>
                  <input type="date" value={startDate} min={format(new Date(), "yyyy-MM-dd")}
                    onChange={e => {
                      setStartDate(e.target.value)
                      if (e.target.value >= endDate) setEndDate(format(addWeeks(new Date(e.target.value), 8), "yyyy-MM-dd"))
                    }}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1.5">Train until</p>
                  <input type="date" value={endDate} min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              {/* Preview */}
              {previewRows.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground/70">
                    {totalRows} total session{totalRows !== 1 ? "s" : ""} across {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))} weeks
                  </p>
                  {previewRows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground truncate flex-1 mr-2">{r.workout_title}</span>
                      <span className="text-[12px] font-medium text-foreground flex-shrink-0">
                        {format(new Date(r.scheduled_date), "EEE d MMM")}
                      </span>
                    </div>
                  ))}
                  {totalRows > 5 && (
                    <p className="text-[11px] text-muted-foreground/60 text-center pt-0.5">+{totalRows - 5} more sessions</p>
                  )}
                </div>
              )}
            </Card>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button onClick={() => { setResult(null); setStep("upload") }}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-border text-[13px] font-semibold text-muted-foreground touch-manipulation">
                <X className="w-4 h-4" /> Retry
              </button>
              <button onClick={handleSaveClick} disabled={step === "saving"}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] rounded-xl py-3 disabled:opacity-50 touch-manipulation">
                {step === "saving"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Check className="w-4 h-4" /> Add to schedule</>
                }
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── CONFLICT MODAL ── */}
      {showConflict && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConflict(false)} />
          <div className="relative w-full bg-background rounded-t-[24px] px-5 pt-5 pb-10"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-foreground">Existing sessions found</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  You have {conflictCount} session{conflictCount !== 1 ? "s" : ""} already scheduled in this date range. What would you like to do?
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => doSave(pendingRowsRef.current, "replace")}
                className="w-full flex items-center gap-3 p-4 rounded-[16px] bg-destructive/8 border border-destructive/25 active:bg-destructive/15 transition-colors touch-manipulation"
              >
                <RefreshCw className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-foreground">Replace existing</p>
                  <p className="text-[12px] text-muted-foreground">Remove the {conflictCount} existing sessions and add this plan</p>
                </div>
              </button>

              <button
                onClick={() => doSave(pendingRowsRef.current, "add")}
                className="w-full flex items-center gap-3 p-4 rounded-[16px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation"
              >
                <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-foreground">Add alongside</p>
                  <p className="text-[12px] text-muted-foreground">Keep existing sessions and add this plan on top</p>
                </div>
              </button>

              <button
                onClick={() => setShowConflict(false)}
                className="w-full py-3.5 rounded-[16px] border border-border text-[13px] font-semibold text-muted-foreground touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
