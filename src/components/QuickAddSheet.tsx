import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Utensils, Droplets, Scale } from "lucide-react"

interface QuickAddSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTIONS = [
  { Icon: Utensils, label: "Log food",   path: "/log-meal",  color: "#f97316" },
  { Icon: Droplets, label: "Log water",  path: "/hydration", color: "#0ea5e9" },
  { Icon: Scale,    label: "Log weight", path: "/weight",    color: "#8b5cf6" },
]

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    // z-40 — sits above page content but below the nav bar (z-50),
    // so the nav bar stays visible with the ✕ icon showing.
    <div className="fixed inset-0 z-40">
      {/* Blurred scrim — tap anywhere outside the dial to dismiss */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(2px)" }}
        onClick={() => onOpenChange(false)}
      />

      {/* Speed-dial — fans upward from the Quick Add tab position */}
      <div
        className="absolute flex flex-col gap-3"
        style={{
          // ~88px from left aligns with the Quick Add tab centre on iPhone
          left: 88,
          bottom: "calc(var(--safe-area-inset-bottom, 0px) + 78px)",
        }}
      >
        {/* Render top-to-bottom so Log food is highest, Log weight is closest to the nav.
            Stagger so the bottom item appears first (fans upward). */}
        {ACTIONS.map(({ Icon, label, path, color }, i) => {
          // Reverse stagger: Log weight (i=2) has 0 delay, Log food (i=0) has the most
          const delay = `${(ACTIONS.length - 1 - i) * 0.06}s`
          return (
            <div
              key={path}
              className="flex items-center gap-3"
              style={{
                opacity: 1,
                transform: "translateY(0)",
                animation: `quickAddFanIn 0.22s ease both ${delay}`,
              }}
            >
              <button
                onClick={() => { onOpenChange(false); navigate(path) }}
                style={{
                  width: 52, height: 52, borderRadius: 17, flexShrink: 0,
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
                  display: "grid", placeItems: "center", cursor: "pointer",
                }}
              >
                <Icon size={23} strokeWidth={2.1} style={{ color }} />
              </button>
              <span
                style={{
                  fontSize: 14, fontWeight: 700,
                  color: "hsl(var(--foreground))",
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
                  padding: "8px 14px", borderRadius: 11,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes quickAddFanIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
