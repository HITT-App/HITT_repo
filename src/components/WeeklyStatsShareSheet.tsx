import { useState, useRef, useCallback, useMemo } from 'react'
import { Share2, X, Smartphone, Square, Loader2, ImagePlus, Trash2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { format as formatDate, startOfWeek, endOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  WeeklyStatsShareCard,
  type WeeklyStatsFormat,
  type WeeklyStatsBg,
  type WeeklyStatsData,
} from '@/components/workout/WeeklyStatsShareCard'
import { toast } from 'sonner'

interface Props {
  workouts: number
  minutes: number
  streak: number
  calories: number
  onClose: () => void
}

const DIMS: Record<WeeklyStatsFormat, { w: number; h: number }> = {
  post: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
}

// Build the "24–30 JUN 2026" style range from the current week. Kept as its
// own memo so the card's props are stable across renders.
function buildWeekRange(): string {
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  const sameMonth = start.getMonth() === end.getMonth()
  const monthCode = formatDate(end, 'MMM').toUpperCase()
  const year = formatDate(end, 'yyyy')
  if (sameMonth) {
    return `${formatDate(start, 'd')}–${formatDate(end, 'd')} ${monthCode} ${year}`
  }
  return `${formatDate(start, 'd MMM').toUpperCase()} – ${formatDate(end, 'd MMM').toUpperCase()} ${year}`
}

export function WeeklyStatsShareSheet({ workouts, minutes, streak, calories, onClose }: Props) {
  const [format, setFormat] = useState<WeeklyStatsFormat>('post')
  const [bgVariant, setBgVariant] = useState<WeeklyStatsBg>('white')
  const [bgPhotoUrl, setBgPhotoUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)

  const dateRange = useMemo(() => buildWeekRange(), [])

  const data: WeeklyStatsData = useMemo(() => ({
    title: 'My Stats This Week',
    dateRange,
    metrics: [
      { label: 'Workouts', value: workouts.toString() },
      { label: 'Minutes', value: minutes.toString(), unit: 'min' },
      { label: 'Calories', value: calories.toLocaleString(), unit: 'kcal' },
      { label: 'Streak', value: streak.toString(), unit: streak === 1 ? 'wk' : 'wks' },
    ],
  }), [workouts, minutes, calories, streak, dateRange])

  // A photo background means light ink is more legible on top — use the
  // transparent card variant when a photo is set so the photo shows through.
  const effectiveBg: WeeklyStatsBg = bgPhotoUrl ? 'transparent' : bgVariant

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

  const captureBlob = async (): Promise<Blob | null> => {
    const node = captureRef.current
    if (!node) return null

    // Snapshot the off-screen 1080×H card at 1:1 pixel scale.
    const canvas = await html2canvas(node, {
      width: 1080,
      height: DIMS[format].h,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgPhotoUrl || effectiveBg === 'transparent' ? null : '#ffffff',
      logging: false,
    })

    // Composite the background photo underneath if the user picked one.
    if (bgPhotoUrl) {
      const composite = document.createElement('canvas')
      composite.width = DIMS[format].w
      composite.height = DIMS[format].h
      const ctx = composite.getContext('2d')!
      const bg = new Image()
      const bgLoaded = new Promise<void>((resolve, reject) => {
        bg.onload = () => resolve()
        bg.onerror = () => reject(new Error('bg load failed'))
      })
      bg.src = bgPhotoUrl
      await bgLoaded
      const scale = Math.max(composite.width / bg.width, composite.height / bg.height)
      const dx = (composite.width - bg.width * scale) / 2
      const dy = (composite.height - bg.height * scale) / 2
      ctx.drawImage(bg, dx, dy, bg.width * scale, bg.height * scale)
      ctx.drawImage(canvas, 0, 0)
      return await new Promise<Blob | null>((resolve) => composite.toBlob((b) => resolve(b), 'image/png'))
    }

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
  }

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const blob = await captureBlob()
      if (!blob) throw new Error('capture failed')
      const file = new File([blob], 'hitt-weekly-stats.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        await navigator.clipboard.writeText(url)
        toast.success('Image copied to clipboard')
      }
    } catch {
      /* cancelled by user */
    } finally {
      setSharing(false)
    }
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

        {/* Format toggle */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
          {(['post', 'story'] as WeeklyStatsFormat[]).map(f => (
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

        {/* Background variant toggle — only meaningful when there's no photo. */}
        {!bgPhotoUrl && (
          <div className="flex gap-1.5 p-1 rounded-xl bg-secondary">
            {(['white', 'transparent'] as WeeklyStatsBg[]).map(v => (
              <button
                key={v}
                onClick={() => setBgVariant(v)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
                  bgVariant === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {v === 'white' ? 'White' : 'Transparent'}
              </button>
            ))}
          </div>
        )}

        {/* Preview — visible on-screen, scaled to fit. Container is sized
            to the exact scaled-card dimensions and centred via mx-auto,
            so the card fills the frame regardless of sheet width. */}
        {(() => {
          const previewH = 288
          const previewW = format === 'post'
            ? previewH
            : Math.round(previewH * (1080 / DIMS[format].h))
          const scale = previewH / DIMS[format].h
          return (
            <div
              className="relative overflow-hidden rounded-2xl bg-secondary mx-auto cursor-pointer"
              style={{ width: previewW, height: previewH }}
              onClick={() => fileInputRef.current?.click()}
            >
              {bgPhotoUrl && (
                <img src={bgPhotoUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 1080,
                  height: DIMS[format].h,
                }}
              >
                <WeeklyStatsShareCard data={data} format={format} bg={effectiveBg} />
              </div>
              {!bgPhotoUrl && (
                <div className="absolute inset-x-0 bottom-3 flex items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <ImagePlus size={13} className="text-white" />
                    <span className="text-white text-[11px] font-semibold">Add background photo</span>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Off-screen 1:1 render source html2canvas snapshots from. Kept in a
            zero-size clipping wrapper so it participates in layout (Safari
            needs that to actually paint the tree) but stays invisible. */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div ref={captureRef} style={{ width: 1080, height: DIMS[format].h }}>
            <WeeklyStatsShareCard data={data} format={format} bg={effectiveBg} />
          </div>
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
          disabled={sharing}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all touch-manipulation"
        >
          {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          {sharing ? 'Preparing…' : 'Share'}
        </button>
      </div>
    </div>
  )
}
