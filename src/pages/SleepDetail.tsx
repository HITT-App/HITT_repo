import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Moon, Sun } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useSleep } from "@/hooks/useSleep"
import { garminAttribution } from "@/lib/garmin-state"
import { cn } from "@/lib/utils"

type SleepLog = ReturnType<typeof useSleep>["logs"][number]

const STAGES = [
  { key: "deep_sleep_minutes", label: "Deep", color: "bg-indigo-600" },
  { key: "rem_sleep_minutes", label: "REM", color: "bg-violet-400" },
  { key: "light_sleep_minutes", label: "Light", color: "bg-sky-400" },
  { key: "awake_minutes", label: "Awake", color: "bg-orange-400" },
] as const

const formatDuration = (minutes: number) =>
  minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`

const qualityColor = (quality: number) => {
  if (quality >= 80) return "bg-green-500/10 text-green-600"
  if (quality >= 60) return "bg-yellow-500/10 text-yellow-600"
  return "bg-red-500/10 text-red-600"
}

const formatTime = (iso: string) => {
  try {
    return format(parseISO(iso), "h:mm a")
  } catch {
    return "--:--"
  }
}

const SleepDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { logs } = useSleep()
  const cached = logs.find(l => l.id === id)

  const { data: fetched, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["sleep-log", user?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("id", id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user?.id && !!id && !cached,
    retry: 1,
  })

  const log: SleepLog | null | undefined = cached ?? fetched

  const header = (title: string) => (
    <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
      <button
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors touch-manipulation"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      <span className="font-semibold text-foreground">{title}</span>
    </header>
  )

  const shell = (title: string, body: React.ReactNode) => (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {header(title)}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-28 space-y-3">{body}</div>
      </div>
    </div>
  )

  if (!log && (isLoading || (isFetching && !isError))) {
    return shell("Sleep", (
      <>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </>
    ))
  }

  if (!log && isError) {
    return shell("Sleep", (
      <div className="bg-card border border-border/60 rounded-2xl p-6 text-center space-y-4">
        <p className="text-muted-foreground">Couldn't load this night. Check your connection.</p>
        <Button onClick={() => refetch()} disabled={isFetching}>Retry</Button>
      </div>
    ))
  }

  if (!log) {
    return shell("Sleep", (
      <div className="bg-card border border-border/60 rounded-2xl p-6 text-center space-y-4">
        <p className="text-muted-foreground">This sleep record isn't available</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>
    ))
  }

  const duration = log.duration_minutes ?? 0
  const isGarmin = log.source_platform === "garmin_api"
  const stages = STAGES
    .map(s => ({ ...s, minutes: log[s.key] ?? 0 }))
    .filter(s => s.minutes > 0)
  const stageTotal = stages.reduce((sum, s) => sum + s.minutes, 0)

  return shell(format(parseISO(log.sleep_date), "EEE, MMM d"), (
    <>
      <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-3xl font-semibold">{formatDuration(duration)}</p>
          {log.sleep_quality != null && (
            <Badge className={cn(qualityColor(log.sleep_quality))}>
              {log.sleep_quality} sleep score
            </Badge>
          )}
        </div>
        {isGarmin && <p className="text-[10.5px] text-muted-foreground">{garminAttribution(null)}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
              <Moon className="w-3 h-3 text-indigo-500" /> Bedtime
            </p>
            <p className="font-medium">{formatTime(log.bedtime)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-500" /> Wake time
            </p>
            <p className="font-medium">{formatTime(log.wake_time)}</p>
          </div>
        </div>
      </div>

      {stageTotal > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
          <p className="text-[13px] font-semibold">Sleep stages</p>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {stages.map(s => (
              <div key={s.key} className={s.color} style={{ width: `${(s.minutes / stageTotal) * 100}%` }} />
            ))}
          </div>
          <div className="space-y-2">
            {stages.map(s => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", s.color)} />
                  {s.label}
                </span>
                <span className="text-muted-foreground">
                  {formatDuration(s.minutes)} · {Math.round((s.minutes / stageTotal) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {log.notes?.trim() && (
        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-1">
          <p className="text-[13px] font-semibold">Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{log.notes}</p>
        </div>
      )}
    </>
  ))
}

export default SleepDetail
