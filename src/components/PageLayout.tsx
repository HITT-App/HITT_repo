import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  onBack?: () => void
  right?: React.ReactNode
}

export function PageHeader({ title, onBack, right }: PageHeaderProps) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))

  return (
    <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
      <button
        onClick={handleBack}
        className="w-[38px] h-[38px] rounded-[11px] bg-secondary border border-border/60 flex items-center justify-center active:opacity-70 transition-opacity"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <ArrowLeft size={18} strokeWidth={2.2} className="text-foreground" />
      </button>
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <div className="w-[38px] flex justify-end">
        {right ?? null}
      </div>
    </header>
  )
}

interface PageLayoutProps {
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
  scrollClassName?: string
}

export function PageLayout({ header, children, className, scrollClassName }: PageLayoutProps) {
  return (
    <div className={cn("fixed inset-0 flex flex-col bg-background text-foreground", className)}>
      {header}
      <div className={cn("flex-1 overflow-y-auto", scrollClassName)}>
        {children}
      </div>
    </div>
  )
}
