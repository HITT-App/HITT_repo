export type TemplateId =
  | '01-just-duration'
  | '02-full-stats'
  | '03-personal-bests'
  | '04-first-route'
  | '05-triathlon'
  | '06-challenge'

export type TemplateFormat = 'post' | 'story'

const DIMENSIONS: Record<TemplateFormat, { width: number; height: number }> = {
  post:  { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
}

type PatchMap = Record<string, string>

async function fetchAndPatch(id: TemplateId, format: TemplateFormat, patches: PatchMap): Promise<string> {
  const res = await fetch(`/share-templates/${id}-${format}.svg`)
  if (!res.ok) throw new Error(`Template not found: ${id}-${format}.svg`)
  const text = await res.text()

  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'image/svg+xml')

  for (const [elId, value] of Object.entries(patches)) {
    const el = doc.getElementById(elId)
    if (el) el.textContent = value
  }

  return new XMLSerializer().serializeToString(doc)
}

function svgStringToPng(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')) }
    img.src = url
  })
}

async function render(id: TemplateId, format: TemplateFormat, patches: PatchMap): Promise<string> {
  const svg = await fetchAndPatch(id, format, patches)
  const { width, height } = DIMENSIONS[format]
  return svgStringToPng(svg, width, height)
}

// ─── Public render functions ────────────────────────────────────────────────

export interface DurationData {
  duration: string  // e.g. "32:14"
}
export function renderDuration(format: TemplateFormat, data: DurationData) {
  return render('01-just-duration', format, {
    stat_1: data.duration,
  })
}

export interface FullStatsData {
  distance: string
  distanceUnit: string  // "KM" | "MI"
  time: string          // "46:59"
  elevation: string     // "203"
  elevationUnit: string // "M" | "FT"
  pace: string          // "4:41"
  heartRate: string     // "162"
  calories: string      // "847"
}
export function renderFullStats(format: TemplateFormat, data: FullStatsData) {
  return render('02-full-stats', format, {
    stat_1: data.distance,
    unit_1: data.distanceUnit,
    stat_2: data.time,
    stat_3: data.elevation,
    unit_2: data.elevationUnit,
    stat_4: data.pace,
    stat_5: data.heartRate,
    stat_6: data.calories,
  })
}

export interface PersonalBestsData {
  pb1Label: string   // "5K TIME"
  pb1Delta: string   // "−0:14"
  pb1Value: string   // "22:08"
  pb1Unit: string    // "MIN"
  pb2Label: string   // "LONGEST RUN"
  pb2Delta: string   // "+2.1 KM"
  pb2Value: string   // "14.3"
  pb2Unit: string    // "KM"
}
export function renderPersonalBests(format: TemplateFormat, data: PersonalBestsData) {
  return render('03-personal-bests', format, {
    label_1: data.pb1Label,
    stat_1:  data.pb1Delta,
    stat_2:  data.pb1Value,
    unit_1:  data.pb1Unit,
    label_2: data.pb2Label,
    stat_3:  data.pb2Delta,
    stat_4:  data.pb2Value,
    unit_2:  data.pb2Unit,
  })
}

export interface FirstRouteData {
  routeName: string
  location: string     // "London · UK"
  distance: string     // "8.4"
  distanceUnit: string // "KM"
  elevation: string    // "412"
  elevationUnit: string
  time: string         // "58:22"
}
export function renderFirstRoute(format: TemplateFormat, data: FirstRouteData) {
  return render('04-first-route', format, {
    stat_1:  data.routeName,
    label_1: data.location,
    stat_2:  data.distance,
    unit_1:  data.distanceUnit,
    stat_3:  data.elevation,
    unit_2:  data.elevationUnit,
    stat_4:  data.time,
  })
}

export interface TriathlonData {
  raceType: string     // "TRIATHLON · OLYMPIC"
  totalTime: string    // "2:41:18"
  swimDistance: string // "1.5"
  swimTime: string     // "00:28"
  bikeDistance: string // "40.0"
  bikeTime: string     // "01:14"
  runDistance: string  // "10.0"
  runTime: string      // "00:58"
}
export function renderTriathlon(format: TemplateFormat, data: TriathlonData) {
  return render('05-triathlon', format, {
    label_1: data.raceType,
    stat_1:  data.totalTime,
    stat_2:  data.swimDistance,
    stat_3:  data.swimTime,
    stat_4:  data.bikeDistance,
    stat_5:  data.bikeTime,
    stat_6:  data.runDistance,
    stat_7:  data.runTime,
  })
}

export interface WeeklyStatsData {
  workouts: string
  minutes: string
  streak: string
  calories: string
}
export function renderWeeklyStats(format: TemplateFormat, data: WeeklyStatsData) {
  return render('02-full-stats', format, {
    label_1: 'WORKOUTS',
    stat_1:  data.workouts,
    unit_1:  'THIS WK',
    label_2: 'MINUTES',
    stat_2:  data.minutes,
    label_3: 'STREAK',
    stat_3:  data.streak,
    unit_2:  'DAYS',
    stat_4:  '',
    unit_3:  '',
    stat_5:  '',
    unit_4:  '',
    stat_6:  data.calories,
    unit_5:  'KCAL',
  })
}

export interface ChallengeData {
  challengeName: string // "MAY BURNOUT"
  currentDay: string    // "12"
  totalDays: string     // "30"
  duration: string      // "38:42"
  hashtag: string       // "MAYBURNOUT30"
}
export function renderChallenge(format: TemplateFormat, data: ChallengeData) {
  return render('06-challenge', format, {
    label_1:  data.challengeName,
    stat_1:   data.currentDay,
    stat_2:   data.currentDay,
    stat_3:   data.totalDays,
    stat_4:   data.duration,
    hashtag_1: data.hashtag,
  })
}
