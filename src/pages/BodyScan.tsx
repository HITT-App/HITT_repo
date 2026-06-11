import { useState, useRef, useCallback, useEffect } from "react"
import {
  ArrowLeft, Camera, Upload, TrendingUp, Loader2, X, Sparkles, User,
  SwitchCamera, Timer, Trash2, Share2, CheckCircle2, History,
  ChevronDown, ChevronUp, TrendingDown, Target, CalendarPlus, ScanLine,
  ShieldCheck, ArrowDownRight, ArrowUpRight, Minus, ArrowLeftRight, Check,
  Ruler,
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

const MEASUREMENT_FIELDS = [
  { key: "chest", label: "Chest", unit: "cm", icon: "💪" },
  { key: "waist", label: "Waist", unit: "cm", icon: "📏" },
  { key: "hips", label: "Hips", unit: "cm", icon: "📐" },
  { key: "bicep_left", label: "Left Bicep", unit: "cm", icon: "💪" },
  { key: "bicep_right", label: "Right Bicep", unit: "cm", icon: "💪" },
  { key: "thigh_left", label: "Left Thigh", unit: "cm", icon: "🦵" },
  { key: "thigh_right", label: "Right Thigh", unit: "cm", icon: "🦵" },
  { key: "neck", label: "Neck", unit: "cm", icon: "📏" },
]

const POSE_GUIDES = [
  { label: "Front", instruction: "Stand facing the camera, arms slightly away from body" },
  { label: "Side", instruction: "Stand sideways, arms relaxed at your side" },
  { label: "Back", instruction: "Stand with back to camera, arms slightly away" },
]

// ── inline helpers ───────────────────────────────────────────

const BF_ZONES = [
  { name: "Essential", max: 6,  color: "#60a5fa" },
  { name: "Athletic",  max: 14, color: "#4ade80" },
  { name: "Fitness",   max: 18, color: "#facc15" },
  { name: "Average",   max: 25, color: "#fb923c" },
  { name: "High",      max: 32, color: "#f87171" },
]

function muscleTone(level: string): { color: string; fill: number } {
  switch (level) {
    case "well_developed": return { color: "#4ade80", fill: 1 }
    case "developed":      return { color: "#38bdf8", fill: 0.66 }
    case "average":        return { color: "#facc15", fill: 0.42 }
    default:               return { color: "#f87171", fill: 0.25 }
  }
}

function activeZoneForBF(bf: number): number {
  for (let i = 0; i < BF_ZONES.length; i++) {
    const prev = i === 0 ? 0 : BF_ZONES[i - 1].max
    if (bf > prev && bf <= BF_ZONES[i].max) return i
  }
  return BF_ZONES.length - 1
}

function nextZoneName(activeIdx: number): string {
  if (activeIdx === 0) return BF_ZONES[0].name
  return BF_ZONES[activeIdx - 1].name
}

// Custom SVG trend chart (no recharts)
function BFTrendChart({ data }: { data: Array<{ date: string; bodyFat: number }> }) {
  if (data.length < 2) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Complete at least 2 scans to see trends</p>
      </div>
    )
  }
  const w = 330, h = 130, padX = 6, padTop = 22, padBot = 24
  const vals = data.map(d => d.bodyFat)
  const minV = Math.min(...vals) - 0.8
  const maxV = Math.max(...vals) + 0.8
  const rng = maxV - minV || 1
  const pts = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * (w - padX * 2),
    y: padTop + (1 - (d.bodyFat - minV) / rng) * (h - padTop - padBot),
    d,
  }))
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = `${pts[0].x},${h - padBot} ` + line + ` ${pts[pts.length - 1].x},${h - padBot}`
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="bfAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#bfAreaGrad)" />
      <polyline points={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const last = i === pts.length - 1
        const label = p.d.date
        return (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y}
              r={last ? 5 : 3.5}
              fill={last ? "hsl(var(--primary))" : "hsl(var(--card))"}
              stroke="hsl(var(--primary))" strokeWidth="2"
            />
            {last && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="700"
                fill="hsl(var(--foreground))">{p.d.bodyFat}%</text>
            )}
            <text x={p.x} y={h - 6} textAnchor="middle" fontSize="10"
              fill="hsl(var(--muted-foreground))">{label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── main component ───────────────────────────────────────────

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
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [activeTab, setActiveTab] = useState("scan")
  const [poseIndex, setPoseIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const shouldCaptureRef = useRef(false)

  // Progress data
  const [progressData, setProgressData] = useState<any[]>([])
  const [previousScans, setPreviousScans] = useState<any[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // New: collapsible tape measurements
  const [showMeasure, setShowMeasure] = useState(false)

  // Load historical body fat data for trends
  useEffect(() => {
    if (!user) return
    const loadProgress = async () => {
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
          notes: d.notes,
        })))
        setPreviousScans(data)
      }
    }
    loadProgress()
  }, [user])

  // Wire stream to video element whenever the stream changes
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
      toast.error("Camera not ready yet — wait a moment and try again.")
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

  // Countdown tick
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

  // Auto-open camera on mount — skip the empty picker, go straight to capture
  const didAutoOpen = useRef(false)
  useEffect(() => {
    if (didAutoOpen.current || imagePreview || analysis) return
    didAutoOpen.current = true
    openCamera()
  }, [openCamera, imagePreview, analysis])

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
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.")
      return
    }
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: imagePreview, workoutSummary }),
      })
      let json: any
      try {
        json = await rawRes.json()
      } catch {
        throw new Error(`Analysis failed (${rawRes.status}) — try again`)
      }
      if (!rawRes.ok) throw new Error(json?.error || `Analysis failed (${rawRes.status})`)
      setAnalysis(json)
      const summary = [
        json.bodyType ? `Body type: ${json.bodyType}` : "",
        json.estimatedBodyFat ? `Estimated body fat: ${json.estimatedBodyFat}%` : "",
        json.muscleDevelopment
          ? `Muscle development — upper: ${json.muscleDevelopment.upper_body}, core: ${json.muscleDevelopment.core}, lower: ${json.muscleDevelopment.lower_body}`
          : "",
        ...(json.keyObservations ?? []).slice(0, 2),
        ...(json.recommendations ?? []).slice(0, 2),
      ].filter(Boolean).join("\n")
      localStorage.setItem("hiit-body-scan-summary", summary)
      localStorage.setItem("hiit-body-scan-at", Date.now().toString())
      localStorage.removeItem("hiit-health-profile-at")
      toast.success("Body analysis complete!")
      if (returnTo) {
        setTimeout(() => navigate(returnTo), 1200)
      }
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
        await logMetric.mutateAsync({
          metric_type: `body_${key}` as MetricType,
          value: parseFloat(value),
          unit: "cm",
        })
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
      toast.success("Measurements saved!")
      setMeasurements({})
      setIsSaved(true)
      if (returnTo) {
        setTimeout(() => navigate(returnTo), 800)
      }
    } catch {
      toast.error("Failed to save measurements.")
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
  }

  const shareResults = async () => {
    if (!analysis) return
    const md = analysis.muscleDevelopment
    const devLabel = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    const text = [
      "My HITT Body Scan 💪",
      "",
      `Body Fat: ${analysis.estimatedBodyFat}%  (${analysis.confidenceLevel} confidence)`,
      `Body Type: ${devLabel(analysis.bodyType)}`,
      `Posture: ${devLabel(analysis.posture)}`,
      "",
      "Muscle Development:",
      `• Upper body: ${devLabel(md.upper_body)}`,
      `• Core: ${devLabel(md.core)}`,
      `• Lower body: ${devLabel(md.lower_body)}`,
      "",
      ...(analysis.keyObservations.slice(0, 2).map(o => `• ${o}`)),
      "",
      "Tracked with HITT App",
    ].join("\n")
    try {
      await navigator.share({ title: "My Body Scan Results", text })
    } catch {
      // user cancelled or share not supported
    }
  }

  const devLabel = (val: string) =>
    val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  // Recommendation icon picker
  const recIcon = (text: string) => {
    const t = text.toLowerCase()
    if (t.includes("core") || t.includes("deficit") || t.includes("protein")) return <Target className="w-3.5 h-3.5 text-primary" />
    if (t.includes("down") || t.includes("lean") || t.includes("fat")) return <TrendingDown className="w-3.5 h-3.5 text-primary" />
    return <Sparkles className="w-3.5 h-3.5 text-primary" />
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div className="h-dvh bg-background flex flex-col">
      {/* Fixed header */}
      <div
        className="flex-shrink-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/40"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => returnTo ? navigate(returnTo) : navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary"
          >
            {returnTo ? (
              <span className="text-sm text-muted-foreground font-medium">Skip</span>
            ) : (
              <ArrowLeft className="w-5 h-5 text-foreground" />
            )}
          </button>
          <h1 className="text-lg font-semibold text-foreground">Body Scan</h1>
          <div className="w-9" />
        </div>

        {/* Orange-pill segmented control */}
        <div className="px-4 pb-3">
          <div className="bg-muted/30 border border-border rounded-[13px] p-1 flex gap-1">
            {[
              { id: "scan", label: "Scan", Icon: ScanLine },
              { id: "progress", label: "Progress", Icon: TrendingUp },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-[13.5px] font-semibold transition-colors ${
                  activeTab === id
                    ? "bg-primary text-white"
                    : "text-muted-foreground bg-transparent"
                }`}
              >
                <Icon className="w-[15px] h-[15px]" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto pb-24 w-full">

        {/* ═══════════════════════════════ SCAN TAB ═══════════════════════════════ */}
        {activeTab === "scan" && (
          <>
            {/* Camera view */}
            {isCameraOpen ? (
              <>
                {/* Pose strip */}
                <div className="flex gap-2">
                  {POSE_GUIDES.map((pose, i) => {
                    const isDone = i < poseIndex
                    const isNext = i === poseIndex
                    return (
                      <button
                        key={pose.label}
                        onClick={() => setPoseIndex(i)}
                        className={`flex-1 rounded-xl py-2 text-center border transition-colors ${
                          isDone
                            ? "border-primary/50 bg-primary/13"
                            : isNext
                            ? "border-primary bg-primary/6"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {isDone && <Check className="w-3 h-3 text-primary" strokeWidth={3} />}
                          <span
                            className={`text-[12.5px] font-semibold ${
                              isDone ? "text-primary" : isNext ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {pose.label}
                          </span>
                        </div>
                        <span className={`text-[9.5px] ${isNext ? "text-primary" : "text-muted-foreground/60"}`}>
                          {isDone ? "captured" : "next"}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Camera viewport */}
                <div className="relative overflow-hidden rounded-[20px] bg-black border border-border/40"
                  style={{ aspectRatio: "3/4" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onCanPlay={() => setCameraReady(true)}
                    className={`w-full h-full object-cover${facingMode === "user" ? " scale-x-[-1]" : ""}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Silhouette guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[46%] h-[74%] border-2 border-dashed border-white/28 rounded-[44%_44%_38%_38%]" />
                  </div>

                  {/* Pose instruction */}
                  <div className="absolute top-3.5 inset-x-3.5 pointer-events-none flex justify-center">
                    <div className="bg-black/55 backdrop-blur-sm border border-white/10 rounded-xl px-3.5 py-2 text-center">
                      <p className="text-white text-[12.5px] font-bold">{POSE_GUIDES[poseIndex].label} pose</p>
                      <p className="text-white/70 text-[10.5px] mt-0.5">{POSE_GUIDES[poseIndex].instruction}</p>
                    </div>
                  </div>

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                      <span
                        key={countdown}
                        className="text-white font-black animate-in zoom-in-50 duration-200"
                        style={{ fontSize: 128, lineHeight: 1, textShadow: "0 0 48px rgba(0,0,0,0.9)" }}
                      >
                        {countdown}
                      </span>
                    </div>
                  )}

                  {/* Bottom controls — inside the viewport */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 pb-4 px-4 flex flex-col gap-3">
                    {/* Gallery + Analyze row */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white/15 border border-white/25 text-white font-semibold text-[13px] rounded-xl py-3"
                      >
                        <Upload className="w-[15px] h-[15px]" /> Gallery
                      </button>
                      <button
                        onClick={() => { closeCamera(); analyzeBody() }}
                        className="flex-[2] flex items-center justify-center gap-1.5 bg-primary text-white font-bold text-[13px] rounded-xl py-3"
                      >
                        <Sparkles className="w-4 h-4" /> Analyze photos
                      </button>
                    </div>
                    {/* Shutter controls row */}
                    <div className="flex items-center justify-center gap-5">
                      <button
                        onClick={closeCamera}
                        className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                      <button
                        onClick={flipCamera}
                        className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center"
                      >
                        <SwitchCamera className="w-[19px] h-[19px] text-white" />
                      </button>
                      <button
                        onClick={handleShutter}
                        disabled={!cameraReady || countdown !== null}
                        className="w-[66px] h-[66px] rounded-full border-4 border-white bg-white/20 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="w-[50px] h-[50px] rounded-full bg-white" />
                      </button>
                      <button
                        onClick={cycleTimer}
                        disabled={countdown !== null}
                        className={`w-11 h-11 rounded-full border flex items-center justify-center ${
                          timerSeconds > 0
                            ? "bg-primary/70 border-primary/60"
                            : "bg-white/20 border-white/30"
                        }`}
                      >
                        {timerSeconds === 0
                          ? <Timer className="w-[19px] h-[19px] text-white" />
                          : <span className="text-[13px] font-bold text-white">{timerSeconds}s</span>
                        }
                      </button>
                    </div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </>
            ) : imagePreview && !analysis ? (
              /* Image preview — no analysis yet */
              <>
                <div className="relative overflow-hidden rounded-[18px]">
                  <img src={imagePreview} alt="Body scan" className="w-full aspect-[3/4] object-cover" />
                  <button
                    onClick={clearImage}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <Button onClick={analyzeBody} disabled={isAnalyzing} className="w-full gap-2 h-12 text-base">
                  {isAnalyzing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Analyze Body Composition</>
                  )}
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </>
            ) : analysis ? (
              /* Result view */
              <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Latest scan row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#4ade80] flex-shrink-0" />
                    <span className="text-[12.5px] text-muted-foreground">
                      Latest scan · <b className="text-foreground font-semibold">{format(new Date(), "MMM d")}</b>
                    </span>
                  </div>
                  <button
                    onClick={clearImage}
                    className="inline-flex items-center gap-1.5 border border-primary/32 bg-primary/13 text-primary text-[12.5px] font-semibold rounded-[10px] px-3 py-[7px]"
                  >
                    <Camera className="w-3.5 h-3.5" /> New scan
                  </button>
                </div>

                {/* Body fat card */}
                <Card className="p-4 rounded-[18px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-foreground">Estimated body fat</span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground bg-muted/40 border border-border rounded-full px-2.5 py-[3px]">
                      <ShieldCheck className="w-3 h-3 text-[#4ade80]" /> {analysis.confidenceLevel} confidence
                    </span>
                  </div>
                  {/* Big number + delta */}
                  <div className="flex items-end gap-2 mt-3 mb-3.5">
                    <span className="text-[46px] font-extrabold text-foreground leading-none tracking-tight">
                      {analysis.estimatedBodyFat}
                    </span>
                    <span className="text-lg font-bold text-muted-foreground mb-1">%</span>
                    {progressData.length >= 2 && (() => {
                      const delta = analysis.estimatedBodyFat - progressData[progressData.length - 2]?.bodyFat
                      const isGood = delta < 0
                      const DeltaIcon = delta < 0 ? ArrowDownRight : delta > 0 ? ArrowUpRight : Minus
                      return (
                        <span className={`ml-auto mb-1.5 inline-flex items-center gap-0.5 text-[12px] font-bold ${isGood ? "text-[#4ade80]" : delta > 0 ? "text-[#f87171]" : "text-muted-foreground"}`}>
                          <DeltaIcon className="w-[13px] h-[13px]" />
                          {Math.abs(delta).toFixed(1)}%
                        </span>
                      )
                    })()}
                  </div>
                  {/* Banded gauge */}
                  <div className="relative h-[10px] rounded-full overflow-hidden flex mb-2">
                    {BF_ZONES.map((z, i) => {
                      const prev = i === 0 ? 0 : BF_ZONES[i - 1].max
                      return (
                        <div key={z.name} className="opacity-85" style={{ flex: z.max - prev, background: z.color }} />
                      )
                    })}
                    {/* Marker */}
                    <div
                      className="absolute top-[-3px] bottom-[-3px] w-[3px] rounded-sm bg-white"
                      style={{
                        left: `${Math.min(analysis.estimatedBodyFat / 32, 1) * 100}%`,
                        transform: "translateX(-50%)",
                        boxShadow: "0 0 0 2px rgba(0,0,0,0.55)",
                      }}
                    />
                  </div>
                  {/* Zone labels */}
                  <div className="flex justify-between mb-2.5">
                    {BF_ZONES.map((z, i) => {
                      const activeIdx = activeZoneForBF(analysis.estimatedBodyFat)
                      const isActive = i === activeIdx
                      return (
                        <span
                          key={z.name}
                          className="text-[9px]"
                          style={{
                            color: isActive ? z.color : "hsl(var(--muted-foreground))",
                            fontWeight: isActive ? 700 : 500,
                          }}
                        >
                          {z.name}
                        </span>
                      )
                    })}
                  </div>
                  {/* Zone narrative */}
                  {(() => {
                    const activeIdx = activeZoneForBF(analysis.estimatedBodyFat)
                    const activeZone = BF_ZONES[activeIdx]
                    const toward = nextZoneName(activeIdx)
                    return (
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        You&apos;re in the{" "}
                        <b style={{ color: activeZone.color }}>{activeZone.name}</b>{" "}
                        range, trending toward{" "}
                        <b style={{ color: activeIdx > 0 ? BF_ZONES[activeIdx - 1].color : activeZone.color }}>{toward}</b>.
                      </p>
                    )
                  })()}
                </Card>

                {/* What to do next card */}
                <Card
                  className="p-4 rounded-[18px]"
                  style={{
                    background: "linear-gradient(180deg, rgba(249,115,22,0.07), rgba(249,115,22,0.02))",
                    borderColor: "rgba(249,115,22,0.32)",
                  }}
                >
                  <h3 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-[15px] h-[15px] text-primary" /> What to do next
                  </h3>
                  <div className="space-y-2.5">
                    {analysis.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <div className="w-7 h-7 flex-shrink-0 rounded-[9px] bg-primary/13 border border-primary/32 flex items-center justify-center">
                          {recIcon(rec)}
                        </div>
                        <span className="text-[12.5px] text-muted-foreground leading-relaxed pt-1">{rec}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-3 gap-1.5 h-11">
                    <CalendarPlus className="w-4 h-4" /> Add these to my plan
                  </Button>
                </Card>

                {/* Muscle development card */}
                <Card className="p-4 rounded-[18px]">
                  <h3 className="text-[13px] font-bold text-foreground mb-3">Muscle development</h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.muscleDevelopment).map(([area, level]) => {
                      const { color, fill } = muscleTone(level)
                      return (
                        <div key={area}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[12.5px] text-muted-foreground capitalize">{area.replace(/_/g, " ")}</span>
                            <span className="text-[12px] font-semibold" style={{ color }}>{devLabel(level)}</span>
                          </div>
                          <div className="h-[6px] rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full opacity-85"
                              style={{ width: `${fill * 100}%`, background: color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Collapsible tape measurements */}
                <Card className="rounded-[18px] overflow-hidden p-0">
                  <button
                    onClick={() => setShowMeasure(s => !s)}
                    className="w-full flex items-center justify-between p-4 bg-transparent"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[13px] font-bold text-foreground">Tape measurements</span>
                      <span className="text-[11px] text-muted-foreground/60">optional</span>
                    </span>
                    {showMeasure
                      ? <ChevronUp className="w-[18px] h-[18px] text-muted-foreground" />
                      : <ChevronDown className="w-[18px] h-[18px] text-muted-foreground" />
                    }
                  </button>
                  {showMeasure && (
                    <div className="px-4 pb-4">
                      {/* Asymmetry callout if gap > 0.4cm */}
                      {(() => {
                        const bl = parseFloat(measurements.bicep_left || "0")
                        const br = parseFloat(measurements.bicep_right || "0")
                        if (bl > 0 && br > 0 && Math.abs(bl - br) > 0.4) {
                          return (
                            <div className="flex gap-2 items-center bg-muted/30 border border-border rounded-xl px-3 py-2.5 mb-3">
                              <ArrowLeftRight className="w-4 h-4 text-[#facc15] flex-shrink-0" />
                              <span className="text-[11.5px] text-muted-foreground leading-snug">
                                <b className="text-foreground">{Math.abs(bl - br).toFixed(1)}cm</b> left/right bicep gap — your widest asymmetry.
                              </span>
                            </div>
                          )
                        }
                        return null
                      })()}
                      <div className="grid grid-cols-2 gap-2.5">
                        {MEASUREMENT_FIELDS.map(field => (
                          <div key={field.key}>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>{field.icon}</span> {field.label} ({field.unit})
                            </Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={measurements[field.key] || ""}
                              onChange={e => setMeasurements(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={saveMeasurements}
                        disabled={isSaving}
                        variant="outline"
                        className="w-full mt-3 gap-2"
                      >
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Update measurements"}
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Key observations card */}
                <Card className="p-4 rounded-[18px]">
                  <h3 className="text-[13px] font-bold text-foreground mb-3">Key observations</h3>
                  <div className="space-y-2">
                    {analysis.keyObservations.map((obs, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="w-[5px] h-[5px] rounded-full bg-primary flex-shrink-0 mt-[7px]" />
                        <span className="text-[12.5px] text-muted-foreground leading-relaxed">{obs}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Share + Save */}
                <div className="flex gap-2.5">
                  <button
                    onClick={shareResults}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-border bg-card text-foreground font-semibold text-[13px] rounded-xl py-3"
                  >
                    <Share2 className="w-[15px] h-[15px]" /> Share
                  </button>
                  {isSaved ? (
                    <button
                      disabled
                      className="flex-[2] flex items-center justify-center gap-1.5 bg-foreground text-background font-bold text-[13px] rounded-xl py-3 opacity-80"
                    >
                      <Check className="w-4 h-4" strokeWidth={2.6} /> Saved to history
                    </button>
                  ) : (
                    <button
                      onClick={saveMeasurements}
                      disabled={isSaving}
                      className="flex-[2] flex items-center justify-center gap-1.5 bg-foreground text-background font-bold text-[13px] rounded-xl py-3 disabled:opacity-50"
                    >
                      {isSaving
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        : "Save Scan Results"
                      }
                    </button>
                  )}
                </div>

                {/* AI disclaimer */}
                <p className="text-[11px] text-muted-foreground/70 text-center bg-muted/30 border border-border rounded-xl px-3 py-2 leading-relaxed">
                  AI estimates are approximations, not medical assessments.
                </p>
              </div>
            ) : (
              /* Empty state */
              <>
                <Card className="rounded-[18px] border-dashed border-2 border-muted-foreground/30 bg-secondary/50">
                  <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">Take or upload a body photo</p>
                      <p className="text-sm text-muted-foreground mt-1">AI will estimate body composition and provide feedback</p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <Button onClick={() => openCamera()} className="flex-1 gap-2">
                        <Camera className="w-4 h-4" /> Camera
                      </Button>
                      <Button onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2" variant="outline">
                        <Upload className="w-4 h-4" /> Gallery
                      </Button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </div>
                </Card>
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════ PROGRESS TAB ═══════════════════════════════ */}
        {activeTab === "progress" && (
          <div className="space-y-3.5 animate-in fade-in duration-300">
            {/* Visual progress card */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-foreground">Visual progress</h3>
                {previousScans.length >= 2 && (
                  <span className="text-[11px] text-muted-foreground/60">
                    {Math.round(
                      (new Date(previousScans[previousScans.length - 1].recorded_at).getTime() -
                        new Date(previousScans[0].recorded_at).getTime()) /
                        (1000 * 60 * 60 * 24 * 7)
                    )} weeks apart
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* First scan slot */}
                <div
                  className="relative rounded-[14px] overflow-hidden border border-border/60 flex flex-col justify-between"
                  style={{
                    aspectRatio: "3/4",
                    background: "repeating-linear-gradient(135deg, hsl(var(--card)) 0 9px, hsl(var(--background)) 9px 18px)",
                  }}
                >
                  <div className="p-2">
                    <span className="font-mono text-[9.5px] tracking-wide text-muted-foreground bg-black/45 border border-border/40 px-1.5 py-0.5 rounded-md uppercase">
                      {previousScans.length > 0
                        ? format(new Date(previousScans[0].recorded_at), "MMM d")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground/30" strokeWidth={1.5} />
                  </div>
                  <div className="p-2 text-center">
                    <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wide">FIRST</span>
                  </div>
                </div>
                {/* Latest scan slot */}
                <div
                  className="relative rounded-[14px] overflow-hidden border border-border/60 flex flex-col justify-between"
                  style={{
                    aspectRatio: "3/4",
                    background: "repeating-linear-gradient(135deg, hsl(var(--card)) 0 9px, hsl(var(--background)) 9px 18px)",
                  }}
                >
                  <div className="p-2">
                    <span
                      className="font-mono text-[9.5px] tracking-wide bg-black/45 border border-border/40 px-1.5 py-0.5 rounded-md uppercase"
                      style={{ color: "hsl(var(--primary))" }}
                    >
                      {previousScans.length > 0
                        ? format(new Date(previousScans[previousScans.length - 1].recorded_at), "MMM d")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground/30" strokeWidth={1.5} />
                  </div>
                  <div className="p-2 text-center">
                    <span className="font-mono text-[9px] text-muted-foreground/60 tracking-wide">LATEST</span>
                  </div>
                </div>
              </div>

              {/* Delta summary */}
              {previousScans.length >= 2 && (() => {
                const delta = previousScans[previousScans.length - 1].value - previousScans[0].value
                const isGood = delta < 0
                return (
                  <div className={`mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 border ${
                    isGood
                      ? "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.25)]"
                      : "bg-muted/30 border-border"
                  }`}>
                    {isGood
                      ? <TrendingDown className="w-[15px] h-[15px] text-[#4ade80]" />
                      : <TrendingUp className="w-[15px] h-[15px] text-muted-foreground" />
                    }
                    <span className={`text-[12.5px] font-semibold ${isGood ? "text-[#4ade80]" : "text-muted-foreground"}`}>
                      {delta < 0 ? `−${Math.abs(delta).toFixed(1)}% body fat` : `+${delta.toFixed(1)}% body fat`}
                    </span>
                  </div>
                )
              })()}
            </Card>

            {/* Body fat trend card — custom SVG chart */}
            <Card className="p-4 rounded-[18px]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[13px] font-bold text-foreground">Body fat trend</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Your body fat % over time</p>
                </div>
                {progressData.length >= 2 && (() => {
                  const total = progressData[progressData.length - 1].bodyFat - progressData[0].bodyFat
                  const isGood = total < 0
                  const DeltaIcon = total < 0 ? ArrowDownRight : total > 0 ? ArrowUpRight : Minus
                  return (
                    <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold ${isGood ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                      <DeltaIcon className="w-[13px] h-[13px]" />
                      {Math.abs(total).toFixed(1)}%
                    </span>
                  )
                })()}
              </div>
              <BFTrendChart data={progressData} />
              {progressData.length >= 2 && (() => {
                const total = progressData[progressData.length - 1].bodyFat - progressData[0].bodyFat
                const isDown = total < 0
                return (
                  <p className="text-[11.5px] text-muted-foreground text-center mt-1">
                    {isDown ? "Down" : "Up"}{" "}
                    <b style={{ color: isDown ? "#4ade80" : "#f87171" }}>{Math.abs(total).toFixed(1)}%</b>
                    {" "}across {progressData.length} scan{progressData.length !== 1 ? "s" : ""}.
                  </p>
                )
              })()}
              {progressData.length < 2 && (
                <Button variant="link" className="w-full mt-2" onClick={() => setActiveTab("scan")}>
                  Start a scan →
                </Button>
              )}
            </Card>

            {/* Scan history card */}
            {previousScans.length > 0 && (
              <Card className="p-4 rounded-[18px]">
                <h3 className="text-[13px] font-bold text-foreground mb-3">Scan history</h3>
                <div className="space-y-2">
                  {[...previousScans].reverse().slice(0, 10).map((scan, i) => (
                    <div key={scan.id} className="rounded-xl bg-muted/20 overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-[34px] h-[34px] flex-shrink-0 rounded-[9px] bg-card border border-border flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground/60" strokeWidth={1.6} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground">{scan.value}% body fat</p>
                          <p className="text-[10.5px] text-muted-foreground">
                            {format(new Date(scan.recorded_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-[9.5px] font-semibold rounded-full px-2 py-[3px] border"
                            style={i === 0 ? {
                              color: "hsl(var(--primary))",
                              background: "rgba(249,115,22,0.13)",
                              borderColor: "rgba(249,115,22,0.32)",
                            } : {
                              color: "hsl(var(--muted-foreground))",
                              background: "transparent",
                              borderColor: "hsl(var(--border))",
                            }}
                          >
                            {i === 0 ? "Latest" : (scan.notes?.includes("AI") ? "AI" : "Manual")}
                          </span>
                          <button
                            onClick={() => setConfirmDeleteId(confirmDeleteId === scan.id ? null : scan.id)}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive transition-colors touch-manipulation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {confirmDeleteId === scan.id && (
                        <div className="flex items-center justify-between px-3 py-2 bg-destructive/10 border-t border-destructive/20">
                          <p className="text-xs text-destructive font-medium">Delete this scan?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-medium touch-manipulation"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteScan(scan.id)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-medium touch-manipulation"
                            >
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
          </div>
        )}

      </div>
    </div>
  )
}

export default BodyScan
