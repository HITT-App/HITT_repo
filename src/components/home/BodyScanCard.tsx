import { useNavigate } from "react-router-dom"
import { Camera } from "lucide-react"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function BodyScanCard() {
  const navigate = useNavigate()
  const scanAt = localStorage.getItem('hiit-body-scan-at')
  const scanTimestamp = scanAt ? parseInt(scanAt, 10) : null
  const isRecent = scanTimestamp !== null && Date.now() - scanTimestamp < THIRTY_DAYS_MS
  const daysSince = scanTimestamp
    ? Math.floor((Date.now() - scanTimestamp) / (24 * 60 * 60 * 1000))
    : null

  if (isRecent) {
    return (
      <div className="mx-5 mt-4 mb-2">
        <button
          onClick={() => navigate('/body-scan')}
          className="w-full flex items-center gap-3 bg-card border border-border/60 rounded-[18px] p-4 active:bg-secondary transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Body Scan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last scan: {daysSince} {daysSince === 1 ? 'day' : 'days'} ago
            </p>
          </div>
          <span className="text-xs font-medium text-primary shrink-0">Update →</span>
        </button>
      </div>
    )
  }

  return (
    <div className="mx-5 mt-[22px] mb-2">
      <button
        onClick={() => navigate('/body-scan')}
        className="w-full rounded-[18px] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-4 text-left active:bg-primary/25 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Body Scan</p>
            <p className="text-xs text-muted-foreground mt-0.5">Track your physique over time</p>
          </div>
          <span className="text-xs font-semibold text-primary shrink-0">Start scan →</span>
        </div>
      </button>
    </div>
  )
}
