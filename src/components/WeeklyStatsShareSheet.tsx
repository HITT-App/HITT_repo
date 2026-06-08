import { useState, useEffect, useRef, useCallback } from 'react'
import { Share2, X, Smartphone, Square, Loader2, ImagePlus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { renderWeeklyStats, type TemplateFormat } from '@/lib/shareTemplates'
import { toast } from 'sonner'

const DIMS: Record<TemplateFormat, { w: number; h: number }> = {
  post:  { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
}

function composite(bgUrl: string, overlayUrl: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    const bg = new Image()
    bg.onload = () => {
      // cover-crop background to fill canvas
      const scale = Math.max(w / bg.width, h / bg.height)
      const dx = (w - bg.width * scale) / 2
      const dy = (h - bg.height * scale) / 2
      ctx.drawImage(bg, dx, dy, bg.width * scale, bg.height * scale)

      const overlay = new Image()
      overlay.onload = () => {
        ctx.drawImage(overlay, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      overlay.onerror = reject
      overlay.src = overlayUrl
    }
    bg.onerror = reject
    bg.src = bgUrl
  })
}

interface Props {
  workouts: number
  minutes: number
  streak: number
  calories: number
  onClose: () => void
}

export function WeeklyStatsShareSheet({ workouts, minutes, streak, calories, onClose }: Props) {
  const [format, setFormat] = useState<TemplateFormat>('post')
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null)
  const [bgPhotoUrl, setBgPhotoUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Render transparent overlay whenever format or stats change
  useEffect(() => {
    let cancelled = false
    setIsGenerating(true)
    setOverlayUrl(null)
    setPreviewUrl(null)

    renderWeeklyStats(format, {
      workouts: workouts.toString(),
      minutes: minutes.toString(),
      streak: streak.toString(),
      calories: calories.toLocaleString(),
    })
      .then(url => { if (!cancelled) { setOverlayUrl(url); setIsGenerating(false) } })
      .catch(() => { if (!cancelled) setIsGenerating(false) })

    return () => { cancelled = true }
  }, [format, workouts, minutes, streak, calories])

  // Composite overlay + background whenever either changes
  useEffect(() => {
    if (!overlayUrl) { setPreviewUrl(null); return }
    if (!bgPhotoUrl) { setPreviewUrl(overlayUrl); return }

    const { w, h } = DIMS[format]
    composite(bgPhotoUrl, overlayUrl, w, h)
      .then(url => setPreviewUrl(url))
      .catch(() => setPreviewUrl(overlayUrl))
  }, [overlayUrl, bgPhotoUrl, format])

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target?.result) setBgPhotoUrl(ev.target.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

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

  const isReady = !!previewUrl && !isGenerating

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

        {/* Format toggle */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
          {(['post', 'story'] as TemplateFormat[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors',
                format === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {f === 'post' ? <Square size={11} /> : <Smartphone size={11} />}
              {f === 'post' ? 'Square Post' : 'Story'}
            </button>
          ))}
        </div>

        {/* Preview — tap to add/change background */}
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-2xl bg-secondary flex items-center justify-center mx-auto cursor-pointer',
            format === 'post' ? 'aspect-square max-h-72' : 'aspect-[9/16] max-h-72'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          {!isReady ? (
            <Loader2 size={28} className="text-muted-foreground animate-spin" />
          ) : (
            <img src={previewUrl!} alt="Weekly stats preview" className="w-full h-full object-contain" />
          )}

          {/* Add-photo hint when no background set */}
          {isReady && !bgPhotoUrl && (
            <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <ImagePlus size={13} className="text-white" />
                <span className="text-white text-[11px] font-semibold">Add background photo</span>
              </div>
            </div>
          )}
        </div>

        {/* Remove background button */}
        {bgPhotoUrl && (
          <button
            onClick={() => setBgPhotoUrl(null)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground active:text-foreground transition-colors"
          >
            <Trash2 size={12} />
            Remove background photo
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={!isReady}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all touch-manipulation"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  )
}
