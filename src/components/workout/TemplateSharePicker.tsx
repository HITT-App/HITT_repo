import { useState } from 'react'
import { ChevronLeft, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  type TemplateFormat,
  renderDuration,
  renderFullStats,
  renderPersonalBests,
  renderFirstRoute,
  renderTriathlon,
  renderChallenge,
} from '@/lib/shareTemplates'
import type { RoutePoint } from './ShareCardCanvas'

interface Stat {
  label: string
  value: string | number
  unit?: string
}

interface TemplateSharePickerProps {
  activityTitle: string
  activityType?: string
  stats: Stat[]
  pbLabel?: string
  routePositions?: RoutePoint[]
  onGenerated: (dataUrl: string) => void
  onCancel: () => void
}

interface TemplateCard {
  id: string
  label: string
  desc: string
  file: string  // base filename without -post/-story.svg
  available: boolean
  unavailableReason?: string
}

function findStat(stats: Stat[], ...keywords: string[]): Stat | undefined {
  const kw = keywords.map(k => k.toLowerCase())
  return stats.find(s => kw.some(k => s.label.toLowerCase().includes(k)))
}

function statValue(stat: Stat | undefined, fallback = '—'): string {
  if (!stat) return fallback
  return String(stat.value)
}

function formatDuration(stat: Stat | undefined): string {
  if (!stat) return '00:00'
  const v = String(stat.value)
  if (v.includes(':')) return v
  // seconds → MM:SS
  const secs = parseInt(v, 10)
  if (isNaN(secs)) return v
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TemplateSharePicker({
  activityTitle,
  activityType,
  stats,
  pbLabel,
  routePositions,
  onGenerated,
  onCancel,
}: TemplateSharePickerProps) {
  const [format, setFormat] = useState<TemplateFormat>('post')
  const [generating, setGenerating] = useState<string | null>(null)

  const isTriathlon = activityType?.toLowerCase().includes('triathlon')
  const hasRoute = (routePositions?.length ?? 0) >= 2
  const hasDistance = !!findStat(stats, 'distance', 'dist')
  const hasPBs = !!pbLabel

  const templates: TemplateCard[] = [
    {
      id: '01-just-duration',
      label: 'Duration',
      desc: 'Clean single-stat card',
      file: '01-just-duration',
      available: true,
    },
    {
      id: '02-full-stats',
      label: 'Full Stats',
      desc: 'Distance · time · pace · HR',
      file: '02-full-stats',
      available: hasDistance,
      unavailableReason: 'Requires a GPS activity',
    },
    {
      id: '03-personal-bests',
      label: 'Personal Bests',
      desc: 'Celebrate your new PRs',
      file: '03-personal-bests',
      available: hasPBs,
      unavailableReason: 'No personal best this session',
    },
    {
      id: '04-first-route',
      label: 'New Route',
      desc: 'Name your route and stats',
      file: '04-first-route',
      available: hasRoute,
      unavailableReason: 'Requires GPS route data',
    },
    {
      id: '05-triathlon',
      label: 'Triathlon',
      desc: 'Swim · bike · run splits',
      file: '05-triathlon',
      available: isTriathlon,
      unavailableReason: 'For triathlon activities only',
    },
    {
      id: '06-challenge',
      label: 'Challenge',
      desc: 'Daily challenge progress',
      file: '06-challenge',
      available: true,
    },
  ]

  async function generate(templateId: string) {
    setGenerating(templateId)
    try {
      let dataUrl: string

      const duration = formatDuration(findStat(stats, 'duration', 'time'))
      const distStat = findStat(stats, 'distance', 'dist')
      const elevStat = findStat(stats, 'elev', 'elevation', 'gain')
      const paceStat = findStat(stats, 'pace')
      const hrStat   = findStat(stats, 'hr', 'heart', 'bpm')
      const calStat  = findStat(stats, 'cal', 'kcal', 'calories')
      const distUnit = distStat?.unit?.toUpperCase() ?? 'KM'

      switch (templateId) {
        case '01-just-duration':
          dataUrl = await renderDuration(format, { duration })
          break

        case '02-full-stats':
          dataUrl = await renderFullStats(format, {
            distance:      statValue(distStat, '0.0'),
            distanceUnit:  distUnit,
            time:          duration,
            elevation:     statValue(elevStat, '0'),
            elevationUnit: elevStat?.unit?.toUpperCase() ?? 'M',
            pace:          statValue(paceStat, '—'),
            heartRate:     statValue(hrStat, '—'),
            calories:      statValue(calStat, '—'),
          })
          break

        case '03-personal-bests':
          dataUrl = await renderPersonalBests(format, {
            pb1Label: (pbLabel ?? 'BEST').toUpperCase(),
            pb1Delta: 'NEW',
            pb1Value: duration,
            pb1Unit:  'MIN',
            pb2Label: 'CALORIES',
            pb2Delta: '',
            pb2Value: statValue(calStat, '—'),
            pb2Unit:  'KCAL',
          })
          break

        case '04-first-route':
          dataUrl = await renderFirstRoute(format, {
            routeName:     activityTitle,
            location:      '',
            distance:      statValue(distStat, '0.0'),
            distanceUnit:  distUnit,
            elevation:     statValue(elevStat, '0'),
            elevationUnit: elevStat?.unit?.toUpperCase() ?? 'M',
            time:          duration,
          })
          break

        case '05-triathlon': {
          const swimDist = statValue(findStat(stats, 'swim'), '1.5')
          const bikeDist = statValue(findStat(stats, 'bike', 'cycle'), '40.0')
          const runDist  = statValue(findStat(stats, 'run'), '10.0')
          dataUrl = await renderTriathlon(format, {
            raceType:     'TRIATHLON',
            totalTime:    duration,
            swimDistance: swimDist,
            swimTime:     '—',
            bikeDistance: bikeDist,
            bikeTime:     '—',
            runDistance:  runDist,
            runTime:      '—',
          })
          break
        }

        case '06-challenge':
          dataUrl = await renderChallenge(format, {
            challengeName: activityTitle.toUpperCase(),
            currentDay:    '1',
            totalDays:     '30',
            duration:      duration,
            hashtag:       'HIITWATCH',
          })
          break

        default:
          throw new Error('Unknown template')
      }

      onGenerated(dataUrl)
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate template')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="p-1.5 -ml-1 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <p className="text-sm font-semibold text-foreground flex-1">Branded Templates</p>
        {/* Post / Story toggle */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          {(['post', 'story'] as TemplateFormat[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                format === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'post' ? 'Post' : 'Story'}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-2">
        {templates.map(t => {
          const isGenerating = generating === t.id
          const disabled = !t.available || !!generating

          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => t.available && generate(t.id)}
              className={cn(
                'relative flex flex-col rounded-2xl border overflow-hidden text-left transition-all active:scale-[0.98]',
                t.available
                  ? 'border-border hover:border-primary/40 hover:shadow-md bg-card'
                  : 'border-border/40 bg-muted/30 opacity-50',
                disabled && !isGenerating && 'cursor-default',
              )}
            >
              {/* SVG preview thumbnail */}
              <div className="w-full bg-muted/20 relative overflow-hidden" style={{ aspectRatio: format === 'story' ? '9/16' : '1/1' }}>
                <img
                  src={`/share-templates/${t.file}-${format}.svg`}
                  alt={t.label}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {/* Generating overlay */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {/* Unavailable overlay */}
                {!t.available && (
                  <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-1 p-2">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[9px] text-center text-muted-foreground leading-tight">{t.unavailableReason}</span>
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="px-2.5 py-2">
                <p className="text-xs font-semibold text-foreground">{t.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Tap a template to generate • Stats filled from this session
      </p>
    </div>
  )
}
