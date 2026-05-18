import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { UtensilsCrossed, Droplets, Scale, Zap } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { QuickWorkoutPicker } from "./QuickWorkoutPicker"

interface QuickAddSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTIONS = [
  { icon: UtensilsCrossed, label: "Log a meal",  path: "/log-meal",  colour: "text-orange-400" },
  { icon: Droplets,        label: "Log water",   path: "/hydration", colour: "text-blue-400"   },
  { icon: Scale,           label: "Log weight",  path: "/weight",    colour: "text-green-400"  },
]

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const navigate = useNavigate()
  const [showPicker, setShowPicker] = useState(false)

  const handleAction = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  const handleQuickWorkout = () => {
    onOpenChange(false)
    // Wait for Sheet close animation before opening the picker
    setTimeout(() => setShowPicker(true), 150)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0">
          <div
            className="px-4 py-5 space-y-1"
            style={{ paddingBottom: "calc(var(--safe-area-inset-bottom, 0px) + 1.25rem)" }}
          >
            {ACTIONS.map(({ icon: Icon, label, path, colour }) => (
              <button
                key={path}
                onClick={() => handleAction(path)}
                className="w-full flex items-center gap-4 px-3 py-3.5 rounded-xl active:bg-secondary transition-colors touch-manipulation"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Icon className={cn("w-5 h-5", colour)} />
                </div>
                <span className="font-medium text-foreground text-[15px]">{label}</span>
              </button>
            ))}
            <button
              onClick={handleQuickWorkout}
              className="w-full flex items-center gap-4 px-3 py-3.5 rounded-xl active:bg-secondary transition-colors touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground text-[15px]">Quick workout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <QuickWorkoutPicker open={showPicker} onOpenChange={setShowPicker} />
    </>
  )
}
