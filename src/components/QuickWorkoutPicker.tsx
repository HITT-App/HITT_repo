import { useNavigate } from "react-router-dom"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const DURATIONS = [5, 10, 15, 20] as const

interface QuickWorkoutPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickWorkoutPicker({ open, onOpenChange }: QuickWorkoutPickerProps) {
  const navigate = useNavigate()

  const handleSelect = (minutes: number) => {
    onOpenChange(false)
    navigate(`/workout-library?maxDuration=${minutes}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-5">
          <SheetTitle>How long do you have?</SheetTitle>
        </SheetHeader>
        <div
          className="grid grid-cols-2 gap-3"
          style={{ paddingBottom: "calc(var(--safe-area-inset-bottom, 0px) + 1.5rem)" }}
        >
          {DURATIONS.map((minutes) => (
            <button
              key={minutes}
              onClick={() => handleSelect(minutes)}
              className="flex flex-col items-center justify-center h-20 rounded-2xl bg-secondary border border-border active:bg-primary/15 active:border-primary transition-colors touch-manipulation"
            >
              <span className="text-2xl font-bold text-foreground">{minutes}</span>
              <span className="text-xs text-muted-foreground mt-0.5">min</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
