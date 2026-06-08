import { useState, useEffect } from 'react'
import { Share2, X, Smartphone, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { renderWeeklyStats, type TemplateFormat } from '@/lib/shareTemplates'
import { toast } from 'sonner'

interface Props {
  workouts: number
  minutes: number
  streak: number
  calories: number
  onClose: () => void
}

export function WeeklyStatsShareSheet({ workouts, minutes, streak, calories, onClose }: Props) {
  const [format, setFormat] = useState<TemplateFormat>('post')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsGenerating(true)
    setPreviewUrl(null)

    renderWeeklyStats(format, {
      workouts: workouts.toString(),
      minutes: minutes.toString(),
      streak: streak.toString(),
      calories: calories.toLocaleString(),
    })
      .then(url => {
        if (!cancelled) { setPreviewUrl(url); setIsGenerating(false) }
      })
      .catch(() => {
        if (!cancelled) setIsGenerating(false)
      })

    return () => { cancelled = true }
  }, [format, workouts, minutes, streak, calories])

  const handleShare = async () => {
    if (!previewUrl) return
    try {
      const blob = await (await fetch(previewUrl)).blob()
      const file = new File([blob], 'hitt-weekly-stats.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        await navigator.clipboard.writeText(previewUrl)
        toast.success('Image copied to clipboard')
      }
    } catch { /* cancelled by user */ }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-background rounded-t-3xl px-6 pt-4 space-y-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />

        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-bold text-foreground">Share Your Week</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
          {(['post', 'story'] as TemplateFormat[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors',
                format === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              {f === 'post' ? <Square size={11} /> : <Smartphone size={11} />}
              {f === 'post' ? 'Square Post' : 'Story'}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'w-full overflow-hidden rounded-2xl bg-secondary flex items-center justify-center mx-auto',
            format === 'post' ? 'aspect-square max-h-72' : 'aspect-[9/16] max-h-72'
          )}
        >
          {isGenerating || !previewUrl ? (
            <Loader2 size={28} className="text-muted-foreground animate-spin" />
          ) : (
            <img src={previewUrl} alt="Weekly stats share card" className="w-full h-full object-contain" />
          )}
        </div>

        <button
          onClick={handleShare}
          disabled={!previewUrl || isGenerating}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all touch-manipulation"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  )
}
