import { useState, useRef, useCallback, useEffect } from "react"
import {
  ArrowLeft, Camera, Upload, TrendingUp, Loader2, X, Sparkles,
  ChevronRight, User, SwitchCamera, Timer, Trash2, Share2,
  CheckCircle2, History, ChevronDown, ChevronUp, Ruler,
  CalendarPlus, ScanLine,
} from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type MetricType } from "@/hooks/useHealthMetrics"
import { useAuth } from "@/hooks/useAuth"
import { useHealthMetrics } from "@/hooks/useHealthMetrics"
import { supabase } from "@/integrations/supabase/client"
import { recordActiveDay } from "@/lib/activeDay"
import { toast } from "sonner"
import { format, subDays } from "date-fns"

interface BodyAnalysis {
  estimatedBodyFat: number
  bodyType: string
  muscleDevelopment: {
    upper_body: string
    core: string
    lower_body: string
  }
  visibleMuscleGroups: string[]
  bodySymmetry: string
  posture: string
  keyObservations: string[]
  recommendations: string[]
  confidenceLevel: string
}

// Body-fat zones for the banded gauge (male reference, max = 32%)
const BF_ZONES = [
  { name: "Essential", max: 6,  pct: 6/32,  cls: "bg-blue-400" },
  { name: "Athletic",  max: 14, pct: 8/32,  cls: "bg-green-400" },
  { name: "Fitness",   max: 18, pct: 4/32,  cls: "bg-yellow-400" },
  { name: "Average",   max: 25, pct: 7/32,  cls: "bg-orange-400" },
  { name: "High",      max: 32, pct: 7/32,  cls: "bg-red-400" },
]

const MEASUREMENT_FIELDS = [
  { key: "chest",       label: "Chest" },
  { key: "waist",       label: "Waist" },
  { key: "hips",        label: "Hips" },
  { key: "bicep_left",  label: "Bicep L" },
  { key: "bicep_right", label: "Bicep R" },
  { key: "thigh_left",  label: "Thigh L" },
  { key: "thigh_right", label: "Thigh R" },
  { key: "neck",        label: "Neck" },
]

const POSE_GUIDES = [
  { label: "Front", instruction: "Face the camera, arms slightly away from body" },
  { label: "Side",  instruction: "Stand sideways, arms relaxed at your side" },
  { label: "Back",  instruction: "Back to camera, arms slightly away" },
]

// ── tiny SVG sparkline (for future measurement trends) ─────────
function Sparkline({ data, good = false }: { data: number[]; good?: boolean }) {
  const w = 54, h = 18
  const min = Math.min(...data), max = Math.max(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 2) + 1
    const y = h - 1 - ((v - min) / rng) * (h - 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none"
        stroke={good ? "#4ade80" : "#525252"}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── banded body-fat gauge ──────────────────────────────────────
function BodyFatGauge({ value, delta }: { value: number; delta?: number }) {
  const total = 32
  const markerPct = Math.min((value / total) * 100, 100)
  const activeZone = BF_ZONES.find(z => value <= z.max) ?? BF_ZONES[BF_ZONES.length - 1]
  return (
    <div>
      <div className="flex items-end gap-2 mb-3.5">
        <span className="text-[46px] font-black text-foreground leading-none tracking-tight">{value}</span>
        <span className="text-lg font-bold text-muted-foreground mb-1">%</span>
        {delta !== undefined && (
          <span className={`ml-auto mb-1.5 text-xs font-bold ${delta < 0 ? "text-green-400" : delta > 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {delta < 0 ? "↓" : delta > 0 ? "↑" : "—"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {/* coloured band */}
      <div className="relative h-2.5 rounded-full overflow-hidden flex">
        {BF_ZONES.map(z => (
          <div key={z.name} style={{ flex: z.pct }} className={`${z.cls} opacity-80`} />
        ))}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-[3px] bg-white rounded-sm shadow-[0_0_0_2px_rgba(0,0,0,0.6)]"
          style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
        />
      </div>
      {/* zone labels */}
      <div className="flex justify-between mt-1.5">
        {BF_ZONES.map(z => (
          <span key={z.name} className="text-[9px]"
            style={{ color: z.name === activeZone.name ? (z.cls.includes("green") ? "#4ade80" : z.cls.includes("yellow") ? "#facc15" : z.cls.includes("blue") ? "#60a5fa" : z.cls.includes("orange") ? "#fb923c" : "#f87171") : "#525252",
              fontWeight: z.name === activeZone.name ? 700 : 500 }}>
            {z.name}
          </span>
        ))}
      </div>
      <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-2.5">
        You're in the <b className="text-foreground">{activeZone.name}</b> range.
      </p>
    </div>
  )
}

// ── SVG body-fat trend chart ───────────────────────────────────
function BFTrendChart({ data }: { data: { date: string; bodyFat: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground text-center">Complete at least 2 scans to see your trend</p>
      </div>
    )
  }
  const W = 330, H = 130, pX = 6, pTop = 18, pBot = 24
  const vals = data.map(d => d.bodyFat)
  const min = Math.min(...vals) - 0.8
  const max = Math.max(...vals) + 0.8
  const rng = max - min
  const pts = data.map((d, i) => ({
    x: pX + (i / (data.length - 1)) * (W - pX * 2),
    y: pTop + (1 - (d.bodyFat - min) / rng) * (H - pTop - pBot),
    d,
  }))
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = `${pts[0].x},${H - pBot} ${line} ${pts[pts.length - 1].x},${H - pBot}`
  const first = data[0].bodyFat, last = data[data.length - 1].bodyFat
  const totalDelta = +(last - first).toFixed(1)
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#bfGrad)" />
        <polyline points={line} fill="none" stroke="#f97316" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => {
          const last = i === pts.length - 1
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={last ? 5 : 3.5}
                fill={last ? "#f97316" : "hsl(var(--card))"}
                stroke="#f97316" strokeWidth="2" />
              {last && (
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="12"
                  fontWeight="700" fill="hsl(var(--foreground))"
                  fontFamily="Inter, -apple-system, sans-serif">{p.d.bodyFat}%</text>
              )}
              <text x={p.x} y={H - 6} textAnchor="middle" fontSize="10"
                fill="#6f6f6f" fontFamily="Inter, -apple-system, sans-serif">{p.d.date}</text>
            </g>
          )
        })}
      </svg>
      <p className="text-[11.5px] text-muted-foreground text-center mt-1">
        {totalDelta < 0
          ? <>Down <b className="text-green-400">{Math.abs(totalDelta)}%</b> across {data.length} scans</>
          : totalDelta > 0
          ? <>Up <b className="text-red-400">{totalDelta}%</b> across {data.length} scans</>
          : "No change across scans"}
      </p>
    </div>
  )
}

const BodyScan = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as any)?.returnTo as string | undefined
  const { user } = useAuth()
  const { logMetric } = useHealthMetrics()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [showMeasure, setShowMeasure] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [activeTab, setActiveTab] = useState("scan")
  const [poseIndex, setPoseIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const shouldCaptureRef = useRef(false)

  const [progressData, setProgressData] = useState<{ date: string; bodyFat: number }[]>([])
  const [previousScans, setPreviousScans] = useState<any[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from("health_metrics")
        .select("id, value, recorded_at, notes")
        .eq("user_id", user.id)
        .eq("metric_type", "body_fat")
        .order("recorded_at", { ascending: true })
        .limit(30)
      if (data) {
        setProgressData(data.map(d => ({
          date: format(new Date(d.recorded_at), "MMM d"),
          bodyFat: d.value,
        })))
        setPreviousScans(data)
      }
    }
    load()
  }, [user])

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  const resizeToDataUrl = (srcCanvas: HTMLCanvasElement, maxPx = 900): string => {
    const { width, height } = srcCanvas
    const scale = Math.min(1, maxPx / Math.max(width, height))
    const out = document.createElement("canvas")
    out.width = Math.round(width * scale)
    out.height = Math.round(height * scale)
    out.getContext("2d")?.drawImage(srcCanvas, 0, 0, out.width, out.height)
    return out.toDataURL("image/jpeg", 0.8)
  }

  const closeCamera = useCallback(() => {
    setCountdown(null)
    shouldCaptureRef.current = false
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    if (!video.videoWidth || !video.videoHeight) {
      toast.error("Camera not ready — wait a moment and try again.")
      return
    }
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setImagePreview(resizeToDataUrl(canvas))
    closeCamera()
  }, [closeCamera])

  useEffect(() => {
    if (countdown === null) {
      if (shouldCaptureRef.current) {
        shouldCaptureRef.current = false
        capturePhoto()
      }
      return
    }
    if (countdown === 0) {
      shouldCaptureRef.current = true
      setCountdown(null)
      return
    }
    const t = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000)
    return () => clearTimeout(t)
  }, [countdown, capturePhoto])

  const cycleTimer = () =>
    setTimerSeconds(t => (t === 0 ? 3 : t === 3 ? 5 : t === 5 ? 10 : 0))

  const handleShutter = useCallback(() => {
    if (!cameraReady) return
    if (timerSeconds === 0) { capturePhoto(); return }
    setCountdown(timerSeconds)
  }, [timerSeconds, cameraReady, capturePhoto])

  const startStream = useCallback(async (mode: "user" | "environment") => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1920 } },
    })
    setCameraReady(false)
    setStream(mediaStream)
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream
      videoRef.current.play().catch(() => {})
    }
    return mediaStream
  }, [])

  const openCamera = useCallback(async (mode?: "user" | "environment") => {
    const selectedMode = mode ?? facingMode
    try {
      setIsCameraOpen(true)
      await startStream(selectedMode)
    } catch {
      toast.error("Could not access camera. Please check permissions.")
    }
  }, [facingMode, startStream])

  const flipCamera = useCallback(async () => {
    if (stream) stream.getTracks().forEach(t => t.stop())
    const newMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newMode)
    try {
      await startStream(newMode)
    } catch {
      toast.error("Could not switch camera.")
    }
  }, [facingMode, stream, startStream])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext("2d")?.drawImage(img, 0, 0)
        setImagePreview(resizeToDataUrl(canvas))
      }
      img.src = reader.result as string
    }
    reader.onerror = () => toast.error("Failed to read image file.")
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const analyzeBody = async () => {
    if (!imagePreview || !user) return
    setIsAnalyzing(true)
    setAnalysis(null)
    try {
      const since = subDays(new Date(), 30).toISOString()
      const { data: workoutRows } = await supabase
        .from("scheduled_workouts")
        .select("workout_category")
        .eq("user_id", user.id)
        .gte("scheduled_date", since)

      let workoutSummary = "No workout data available."
      if (workoutRows && workoutRows.length > 0) {
        const counts: Record<string, number> = {}
        for (const row of workoutRows) {
          const cat = (row.workout_category || "uncategorised").toLowerCase()
          counts[cat] = (counts[cat] ?? 0) + 1
        }
        const parts = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, n]) => `${n} ${cat} session${n !== 1 ? "s" : ""}`)
        workoutSummary = `In the last 30 days: ${parts.join(", ")}.`
      }

      const sessionResult = await supabase.auth.getSession()
      const accessToken = sessionResult.data?.session?.access_token
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-body`
      const rawRes = await fetch(fnUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imagePreview, workoutSummary }),
      })
      let json: any
      try { json = await rawRes.json() } catch { throw new Error(`Analysis failed (${rawRes.status})`) }
      if (!rawRes.ok) throw new Error(json?.error || `Analysis failed (${rawRes.status})`)
      setAnalysis(json)
      const summary = [
        json.bodyType ? `Body type: ${json.bodyType}` : "",
        json.estimatedBodyFat ? `Estimated body fat: ${json.estimatedBodyFat}%` : "",
        json.muscleDevelopment ? `Muscle development — upper: ${json.muscleDevelopment.upper_body}, core: ${json.muscleDevelopment.core}, lower: ${json.muscleDevelopment.lower_body}` : "",
        ...(json.keyObservations ?? []).slice(0, 2),
        ...(json.recommendations ?? []).slice(0, 2),
      ].filter(Boolean).join("\n")
      localStorage.setItem("hiit-body-scan-summary", summary)
      localStorage.setItem("hiit-body-scan-at", Date.now().toString())
      localStorage.removeItem("hiit-health-profile-at")
      toast.success("Body analysis complete!")
      if (returnTo) setTimeout(() => navigate(returnTo), 1200)
    } catch (err: any) {
      toast.error(err.message || "Analysis failed. Try a clearer photo.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveMeasurements = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const entries = Object.entries(measurements).filter(([, v]) => v && parseFloat(v) > 0)
      if (entries.length === 0 && !analysis?.estimatedBodyFat) {
        toast.error("Please enter at least one measurement or run a scan.")
        setIsSaving(false)
        return
      }
      for (const [key, value] of entries) {
        await logMetric.mutateAsync({ metric_type: `body_${key}` as MetricType, value: parseFloat(value), unit: "cm" })
      }
      if (analysis?.estimatedBodyFat) {
        await logMetric.mutateAsync({
          metric_type: "body_fat",
          value: analysis.estimatedBodyFat,
          unit: "%",
          notes: `AI estimate (${analysis.confidenceLevel} confidence)`,
        })
      }
      if (analysis) {
        const { error: scanError } = await (supabase as any).from("body_scans").insert({
          user_id: user.id,
          estimated_body_fat: analysis.estimatedBodyFat ?? null,
          confidence_level: analysis.confidenceLevel,
          analysis,
        })
        if (scanError) throw scanError
        recordActiveDay(supabase, user.id).catch(() => {})

        const scanDate = new Date().toISOString().split("T")[0]
        const bf = analysis.estimatedBodyFat != null ? `${analysis.estimatedBodyFat}% body fat` : null
        const md = analysis.muscleDevelopment
        const mdSummary = md ? `upper=${md.upper_body}, core=${md.core}, lower=${md.lower_body}` : null
        const obs = Array.isArray(analysis.keyObservations) ? analysis.keyObservations[0] : null
        const physiqueParts = [
          `Scan ${scanDate}`,
          analysis.bodyType ? `body type: ${analysis.bodyType}` : null,
          bf ? `${bf} (${analysis.confidenceLevel} confidence)` : null,
          mdSummary ? `muscle development: ${mdSummary}` : null,
          obs ? `key observation: ${obs}` : null,
        ].filter(Boolean)
        await (supabase as any).rpc("upsert_user_memory_key", {
          p_user_id: user.id,
          p_key: "physique",
          p_value: physiqueParts.join(". "),
        })
      }
      toast.success("Scan saved!")
      setMeasurements({})
      setIsSaved(true)
      if (returnTo) setTimeout(() => navigate(returnTo), 800)
    } catch {
      toast.error("Failed to save.")
    } finally {
      setIsSaving(false)
    }
  }

  const deleteScan = async (id: string) => {
    await supabase.from("health_metrics").delete().eq("id", id)
    setPreviousScans(prev => prev.filter(s => s.id !== id))
    setProgressData(prev => prev.filter((_, i) => previousScans[i]?.id !== id))
    setConfirmDeleteId(null)
    toast.success("Scan deleted")
  }

  const clearImage = () => {
    setImagePreview(null)
    setAnalysis(null)
    setIsSaved(false)
    setPoseIndex(0)
  }

  const shareResults = async () => {
    if (!analysis) return
    const dv = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    const md = analysis.muscleDevelopment
    const text = [
      `My HITT Body Scan 💪`,
      ``,
      `Body Fat: ${analysis.estimatedBodyFat}%  (${analysis.confidenceLevel} confidence)`,
      `Body Type: ${dv(analysis.bodyType)}`,
      ``,
      `Muscle Development:`,
      `• Upper body: ${dv(md.upper_body)}`,
      `• Core: ${dv(md.core)}`,
      `• Lower body: ${dv(md.lower_body)}`,
      ``,
      ...(analysis.keyObservations.slice(0, 2).map(o => `• ${o}`)),
      ``,
      `Tracked with HITT App`,
    ].join("\n")
    try {
      await navigator.share({ title: "My Body Scan Results", text })
    } catch { /* user cancelled */ }
  }

  const devLabel = (val: string) => val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  const muscleTone = (level: string) => {
    if (level === "well_developed") return { bar: "bg-green-400",  text: "text-green-400",  pct: 100 }
    if (level === "developed")      return { bar: "bg-sky-400",   text: "text-sky-400",   pct: 66 }
    if (level === "average")        return { bar: "bg-yellow-400", text: "text-yellow-400", pct: 42 }
    return { bar: "bg-red-400", text: "text-red-400", pct: 25 }
  }

  // Asymmetry callout for the measurements section
  const bicepGap = Math.abs(parseFloat(measurements.bicep_left || "0") - parseFloat(measurements.bicep_right || "0"))
  const thighGap = Math.abs(parseFloat(measurements.thigh_left || "0") - parseFloat(measurements.thigh_right || "0"))
  const maxGap = Math.max(bicepGap, thighGap)
  const asymArea = bicepGap >= thighGap ? "bicep" : "thigh"

  // Body fat delta vs previous scan
  const bfDelta = previousScans.length >= 2 && analysis
    ? +(analysis.estimatedBodyFat - previousScans[previousScans.length - 1].value).toFixed(1)
    : undefined

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex-shrink-0"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => (returnTo ? navigate(returnTo) : navigate(-1))}
            className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center"
          >
            {returnTo
              ? <span className="text-xs text-muted-foreground font-medium">Skip</span>
              : <ArrowLeft className="w-4.5 h-4.5 text-foreground" />}
          </button>
          <h1 className="text-base font-bold text-foreground">Body Scan</h1>
          <button
            onClick={() => setActiveTab("progress")}
            className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center"
          >
            <History className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Segmented control — 2 tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-secondary border border-border rounded-[13px] p-1">
            {[
              { id: "scan",     label: "Scan",     Icon: ScanLine },
              { id: "progress", label: "Progress", Icon: TrendingUp },
            ].map(({ id, label, Icon }) => {
              const on = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-[9px] py-2.5 text-[13.5px] font-semibold transition-colors ${
                    on ? "bg-primary text-white" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-[15px] h-[15px]" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-24 space-y-3.5 max-w-lg mx-auto w-full">

        {/* ══ SCAN TAB ══════════════════════════════════════ */}
        {activeTab === "scan" && (
          <>
            {/* ─ CAMERA OPEN ─ */}
            {isCameraOpen && (
              <>
                {/* Pose strip */}
                <div className="flex gap-2">
                  {POSE_GUIDES.map((pose, i) => {
                    const done = i < poseIndex
                    const current = i === poseIndex
                    return (
                      <button
                        key={pose.label}
                        onClick={() => setPoseIndex(i)}
                        className={`flex-1 rounded-xl py-2 text-center border transition-colors ${
                          done
                            ? "border-primary/30 bg-primary/10"
                            : current
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {done && <span className="text-primary text-xs font-black">✓</span>}
                          <span className={`text-[12.5px] font-semibold ${done || current ? "text-primary" : "text-muted-foreground"}`}>
                            {pose.label}
                          </span>
                        </div>
                        <span className={`text-[9.5px] ${current ? "text-primary" : "text-muted-foreground/60"}`}>
                          {done ? "captured" : current ? "next" : "pending"}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Camera */}
                <Card className="relative overflow-hidden rounded-2xl bg-black">
                  <video
                    ref={videoRef} autoPlay playsInline muted
                    onCanPlay={() => setCameraReady(true)}
                    className={`w-full aspect-[3/4] object-cover${facingMode === "user" ? " scale-x-[-1]" : ""}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Silhouette + instruction overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[46%] h-[74%] border-2 border-dashed border-white/28 rounded-[44%_44%_38%_38%]" />
                    </div>
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-center">
                      <div className="bg-black/55 border border-white/15 backdrop-blur-sm rounded-xl px-3.5 py-2 text-center">
                        <p className="text-white text-[12.5px] font-bold">{POSE_GUIDES[poseIndex].label} pose</p>
                        <p className="text-white/70 text-[10.5px] mt-0.5">{POSE_GUIDES[poseIndex].instruction}</p>
                      </div>
                    </div>
                    {/* Facing chip */}
                    <div className="absolute bottom-3.5 right-3.5">
                      <span className="font-mono text-[9.5px] text-muted-foreground bg-black/50 border border-white/15 rounded-lg px-2 py-1">
                        {facingMode === "user" ? "FRONT CAM" : "REAR CAM"}
                      </span>
                    </div>
                    {/* Countdown */}
                    {countdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span
                          key={countdown}
                          className="text-white font-black animate-in zoom-in-50 duration-200"
                          style={{ fontSize: 128, lineHeight: 1, textShadow: "0 0 48px rgba(0,0,0,0.9)" }}
                        >{countdown}</span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-6">
                    <button onClick={closeCamera}
                      className="w-[46px] h-[46px] rounded-full border border-white/20 bg-white/12 flex items-center justify-center">
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={flipCamera}
                      className="w-[46px] h-[46px] rounded-full border border-white/20 bg-white/12 flex items-center justify-center">
                      <SwitchCamera className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={handleShutter} disabled={!cameraReady || countdown !== null}
                      className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/35 transition-colors flex items-center justify-center disabled:opacity-40">
                      <div className="w-12 h-12 rounded-full bg-white" />
                    </button>
                    <button onClick={cycleTimer} disabled={countdown !== null}
                      className={`w-[46px] h-[46px] rounded-full border flex items-center justify-center ${
                        timerSeconds > 0 ? "border-primary/60 bg-primary/20" : "border-white/20 bg-white/12"
                      }`}>
                      {timerSeconds === 0
                        ? <Timer className="w-5 h-5 text-white" />
                        : <span className="text-xs font-bold text-primary">{timerSeconds}s</span>}
                    </button>
                  </div>
                </Card>

                {/* Gallery button */}
                <Button variant="outline" className="w-full gap-2" onClick={() => { closeCamera(); fileInputRef.current?.click() }}>
                  <Upload className="w-4 h-4" /> Choose from gallery instead
                </Button>
              </>
            )}

            {/* ─ IMAGE CAPTURED, NOT YET ANALYZED ─ */}
            {!isCameraOpen && imagePreview && !analysis && (
              <>
                <Card className="relative overflow-hidden rounded-2xl">
                  <img src={imagePreview} alt="Body scan" className="w-full aspect-[3/4] object-cover" />
                  <button onClick={clearImage}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </Card>
                <Button onClick={analyzeBody} disabled={isAnalyzing} className="w-full gap-2 h-12 text-base">
                  {isAnalyzing
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing…</>
                    : <><Sparkles className="w-5 h-5" /> Analyze Body Composition</>}
                </Button>
              </>
            )}

            {/* ─ ANALYSIS RESULT ─ */}
            {!isCameraOpen && analysis && (
              <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Latest scan row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[12.5px] text-muted-foreground">
                      New scan · <b className="text-foreground font-semibold">{format(new Date(), "MMM d")}</b>
                    </span>
                  </div>
                  <button onClick={clearImage}
                    className="inline-flex items-center gap-1.5 border border-primary/30 bg-primary/10 text-primary text-[12.5px] font-semibold rounded-[10px] px-3 py-1.5">
                    <Camera className="w-3.5 h-3.5" /> Retake
                  </button>
                </div>

                {/* Hero — body fat gauge */}
                <Card className="p-4 rounded-[18px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-foreground">Estimated body fat</span>
                    <span className="text-[10.5px] font-semibold text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-0.5">
                      {analysis.confidenceLevel} confidence
                    </span>
                  </div>
                  <BodyFatGauge value={analysis.estimatedBodyFat} delta={bfDelta} />
                </Card>

                {/* Recommendations — at the top (the actionable payoff) */}
                <Card className="p-4 rounded-[18px] border-primary/25" style={{ background: "linear-gradient(180deg, rgba(249,115,22,0.07), rgba(249,115,22,0.02))" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-[15px] h-[15px] text-primary" />
                    <span className="text-[13px] font-bold text-foreground">What to do next</span>
                  </div>
                  <div className="space-y-3">
                    {analysis.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-7 h-7 flex-shrink-0 rounded-[9px] bg-primary/12 border border-primary/30 flex items-center justify-center mt-0.5">
                          <ChevronRight className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-[12.5px] text-muted-foreground leading-relaxed pt-1">{rec}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full gap-2 mt-3.5 h-11" onClick={() => navigate("/schedule")}>
                    <CalendarPlus className="w-4 h-4" /> Add these to my plan
                  </Button>
                </Card>

                {/* Muscle development */}
                <Card className="p-4 rounded-[18px]">
                  <p className="text-[13px] font-bold text-foreground mb-3">Muscle development</p>
                  <div className="space-y-3">
                    {Object.entries(analysis.muscleDevelopment).map(([area, level]) => {
                      const tone = muscleTone(level)
                      return (
                        <div key={area}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[12.5px] text-muted-foreground capitalize">{area.replace(/_/g, " ")}</span>
                            <span className={`text-[12px] font-semibold ${tone.text}`}>{devLabel(level)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full opacity-85 ${tone.bar}`} style={{ width: `${tone.pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Tape measurements — collapsible */}
                <Card className="rounded-[18px] overflow-hidden p-0">
                  <button
                    onClick={() => setShowMeasure(s => !s)}
                    className="w-full flex items-center justify-between p-4 bg-transparent"
                  >
                    <span className="flex items-center gap-2.5">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[13px] font-bold text-foreground">Tape measurements</span>
                      <span className="text-[11px] text-muted-foreground/70">optional</span>
                    </span>
                    {showMeasure
                      ? <ChevronUp className="w-4.5 h-4.5 text-muted-foreground" />
                      : <ChevronDown className="w-4.5 h-4.5 text-muted-foreground" />}
                  </button>
                  {showMeasure && (
                    <div className="px-4 pb-4">
                      {/* Asymmetry callout */}
                      {maxGap > 0.4 && (
                        <div className="flex items-center gap-2.5 bg-secondary border border-border rounded-xl px-3 py-2.5 mb-3">
                          <span className="text-yellow-400 text-base">⇄</span>
                          <span className="text-[11.5px] text-muted-foreground leading-snug">
                            <b className="text-foreground">{maxGap.toFixed(1)}cm</b> L/R {asymArea} gap — your widest asymmetry.
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2.5">
                        {MEASUREMENT_FIELDS.map(field => (
                          <div key={field.key}>
                            <Label className="text-[11px] text-muted-foreground">{field.label} (cm)</Label>
                            <Input
                              type="number" inputMode="decimal" placeholder="0"
                              value={measurements[field.key] || ""}
                              onChange={e => setMeasurements(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Key observations */}
                <Card className="p-4 rounded-[18px]">
                  <p className="text-[13px] font-bold text-foreground mb-3">Key observations</p>
                  <div className="space-y-2.5">
                    {analysis.keyObservations.map((obs, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-[12.5px] text-muted-foreground leading-relaxed">{obs}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Save / Saved */}
                {isSaved ? (
                  <div className="space-y-2.5">
                    <div className="flex gap-2.5">
                      <button
                        onClick={shareResults}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-border bg-card text-foreground text-[13px] font-semibold rounded-xl py-3"
                      >
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                      <button
                        disabled
                        className="flex-[2] flex items-center justify-center gap-1.5 bg-foreground/10 text-foreground/50 text-[13px] font-bold rounded-xl py-3 cursor-default"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Saved to history
                      </button>
                    </div>
                    <button
                      onClick={() => setActiveTab("progress")}
                      className="w-full flex items-center justify-center gap-2 border border-border bg-card text-muted-foreground text-[13px] font-semibold rounded-xl py-3"
                    >
                      <History className="w-4 h-4" /> View progress history
                    </button>
                  </div>
                ) : (
                  <Button onClick={saveMeasurements} disabled={isSaving} className="w-full gap-2 h-12 text-base">
                    {isSaving
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
                      : "Save to history"}
                  </Button>
                )}

                <p className="text-[11px] text-muted-foreground text-center bg-secondary border border-border rounded-xl px-3 py-2.5 leading-relaxed">
                  AI estimates are approximations, not medical assessments.
                </p>
              </div>
            )}

            {/* ─ CAPTURE PROMPT (no image, camera closed) ─ */}
            {!isCameraOpen && !imagePreview && !analysis && (
              <>
                {/* Last scan summary if one exists */}
                {previousScans.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-[12.5px] text-muted-foreground">
                        Last scan · <b className="text-foreground font-semibold">
                          {format(new Date(previousScans[previousScans.length - 1].recorded_at), "MMM d")}
                        </b>
                      </span>
                    </div>
                    <span className="text-[12.5px] text-primary font-semibold">
                      {previousScans[previousScans.length - 1].value}% body fat
                    </span>
                  </div>
                )}

                <Card className="rounded-2xl border-dashed border-2 border-muted-foreground/25 bg-secondary/30">
                  <div className="flex flex-col items-center py-14 px-6 gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">Take a full-body photo</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI will estimate body composition from a front, side, or back photo
                      </p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <Button onClick={() => openCamera()} className="flex-1 gap-2">
                        <Camera className="w-4 h-4" /> Camera
                      </Button>
                      <Button onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2" variant="outline">
                        <Upload className="w-4 h-4" /> Gallery
                      </Button>
                    </div>
                  </div>
                </Card>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </>
            )}
          </>
        )}

        {/* ══ PROGRESS TAB ══════════════════════════════════ */}
        {activeTab === "progress" && (
          <>
            {/* Body fat trend */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-bold text-foreground">Body fat trend</p>
                {progressData.length >= 2 && (() => {
                  const delta = +(progressData[progressData.length - 1].bodyFat - progressData[0].bodyFat).toFixed(1)
                  return (
                    <span className={`text-[12px] font-bold ${delta < 0 ? "text-green-400" : delta > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {delta < 0 ? "↓" : delta > 0 ? "↑" : "—"} {Math.abs(delta)}%
                    </span>
                  )
                })()}
              </div>
              <BFTrendChart data={progressData} />
            </Card>

            {/* Before/after — honest empty state until photos are stored */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-foreground">Visual progress</p>
                {previousScans.length >= 2 && (
                  <span className="text-[11px] text-muted-foreground">
                    {previousScans.length} scans
                  </span>
                )}
              </div>
              {previousScans.length >= 2 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground mb-1.5">First scan</p>
                      <div className="bg-secondary rounded-xl p-3">
                        <p className="text-2xl font-bold text-foreground">{previousScans[0].value}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(previousScans[0].recorded_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground mb-1.5">Latest scan</p>
                      <div className="bg-primary/10 border border-primary/25 rounded-xl p-3">
                        <p className="text-2xl font-bold text-foreground">{previousScans[previousScans.length - 1].value}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(previousScans[previousScans.length - 1].recorded_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const diff = +(previousScans[previousScans.length - 1].value - previousScans[0].value).toFixed(1)
                    return (
                      <div className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 ${
                        diff < 0 ? "bg-green-400/10 border border-green-400/25"
                        : diff > 0 ? "bg-red-400/10 border border-red-400/25"
                        : "bg-secondary"
                      }`}>
                        <span className={`text-sm font-semibold ${diff < 0 ? "text-green-400" : diff > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {diff < 0 ? `↓ ${Math.abs(diff)}% decrease` : diff > 0 ? `↑ ${diff}% increase` : "No change"}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 gap-2">
                  <User className="w-10 h-10 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground text-center">Complete 2 scans to compare progress</p>
                  <Button variant="link" onClick={() => setActiveTab("scan")} className="text-primary">
                    Start a scan →
                  </Button>
                </div>
              )}
            </Card>

            {/* Scan history */}
            {previousScans.length > 0 && (
              <Card className="p-4 rounded-[18px]">
                <p className="text-[13px] font-bold text-foreground mb-3">Scan history</p>
                <div className="space-y-2">
                  {[...previousScans].reverse().slice(0, 10).map((scan, i) => (
                    <div key={scan.id} className="rounded-xl bg-secondary overflow-hidden">
                      <div className="flex items-center gap-3 p-2.5 pl-3">
                        <div className="w-8 h-8 rounded-[9px] bg-card border border-border flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground">{scan.value}% body fat</p>
                          <p className="text-[10.5px] text-muted-foreground">
                            {format(new Date(scan.recorded_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <span className={`text-[9.5px] font-semibold rounded-full px-2 py-0.5 border ${
                          i === 0
                            ? "text-primary bg-primary/10 border-primary/30"
                            : "text-muted-foreground/60 border-border"
                        }`}>
                          {i === 0 ? "Latest" : scan.notes?.includes("AI") ? "AI" : "Manual"}
                        </span>
                        <button
                          onClick={() => setConfirmDeleteId(confirmDeleteId === scan.id ? null : scan.id)}
                          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {confirmDeleteId === scan.id && (
                        <div className="flex items-center justify-between px-3 py-2 bg-destructive/10 border-t border-destructive/20">
                          <p className="text-xs text-destructive font-medium">Delete this scan?</p>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-medium">
                              Cancel
                            </button>
                            <button onClick={() => deleteScan(scan.id)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-medium">
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {previousScans.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-3">
                <TrendingUp className="w-12 h-12 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground text-center">No scans yet — your progress will appear here</p>
                <Button onClick={() => setActiveTab("scan")} className="gap-2">
                  <Camera className="w-4 h-4" /> Take your first scan
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default BodyScan
