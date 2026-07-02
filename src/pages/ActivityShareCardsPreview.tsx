// Dev-only preview page for the new activity share cards.
// Route: /_preview/share-cards. Renders every activity variant in both
// story and square formats so we can eyeball changes without going through
// the actual share flow. Not linked from any navigation.

import { ActivityShareCard, resolveActivityKey } from '@/components/workout/ActivityShareCard';

// Sample metrics per activity — chosen to mimic the reference design
// numbers (1 Jul 2026 stamps).
const SAMPLES = [
  { key: 'hiit',      raw: 'hiit',       props: { activityType: 'hiit',      durationSeconds: 24 * 60,        calories: 386, avgHR: 162 } },
  { key: 'triathlon', raw: 'triathlon',  props: { activityType: 'triathlon', durationSeconds: 2 * 3600 + 41 * 60 + 18, calories: 2145,
    triathlonSplits: { swim: '28:40', bike: '1:22:05', run: '50:33' } } },
  { key: 'run',       raw: 'jogging',    props: { activityType: 'jogging',   durationSeconds: 10.4 * 5.13 * 60, distanceKm: 10.4, calories: 642 } },
  { key: 'bike',      raw: 'cycling',    props: { activityType: 'cycling',   durationSeconds: 38.6 / 29.2 * 3600, distanceKm: 38.6, calories: 815 } },
  { key: 'swim',      raw: 'swimming',   props: { activityType: 'swimming',  durationSeconds: 1.6 * 108,        distanceKm: 1.6,  calories: 430 } },
  { key: 'strength',  raw: 'gym',        props: { activityType: 'gym',       durationSeconds: 55 * 60,          calories: 318, volumeKg: 12850, exerciseCount: 9 } },
  { key: 'cardio',    raw: 'aerobics',   props: { activityType: 'aerobics',  durationSeconds: 42 * 60,          calories: 498, avgHR: 144 } },
  { key: 'walk',      raw: 'walking',    props: { activityType: 'walking',   durationSeconds: 2 * 3600 + 4 * 60, distanceKm: 9.2,  calories: 560 } },
  { key: 'hike',      raw: 'hiking',     props: { activityType: 'hiking',    durationSeconds: 3 * 3600 + 12 * 60, distanceKm: 14.2, calories: 890 } },
  { key: 'yoga',      raw: 'yoga',       props: { activityType: 'yoga',      durationSeconds: 32 * 60,          calories: 120, avgHR: 96, sessionName: 'Vinyasa' } },
  // Fallback verification — martial-arts and 'other' should both route to cardio.
  { key: 'martial-arts→cardio', raw: 'martial-arts', props: { activityType: 'martial-arts', durationSeconds: 45 * 60, calories: 520, avgHR: 155 } },
  { key: 'other→cardio',        raw: 'other',        props: { activityType: 'other',        durationSeconds: 30 * 60, calories: 210, avgHR: 128 } },
];

const DATE_ISO = '2026-07-01T00:00:00Z';

export default function ActivityShareCardsPreview() {
  return (
    <div style={{ background: '#e7e5e2', minHeight: '100vh', padding: 40 }}>
      <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 22, marginBottom: 24 }}>
        Activity share cards — preview
      </h1>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#555', marginBottom: 40, maxWidth: 700 }}>
        Two rows per activity: story (1080×1920) and square (1080×1080). All rendered at 40% scale.
        Raw activity_type on the left, resolved design key on the right.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 60 }}>
        {SAMPLES.map((s) => (
          <div key={s.key}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, marginBottom: 12, color: '#333' }}>
              <strong>{s.key}</strong>
              <span style={{ color: '#888', marginLeft: 12 }}>
                raw <code>{s.raw}</code> → resolved <code>{resolveActivityKey(s.raw)}</code>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              <div style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: 1080 * 0.4, height: 1920 * 0.4 }}>
                <ActivityShareCard data={s.props as any} format="story" dateISO={DATE_ISO} />
              </div>
              <div style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: 1080 * 0.4, height: 1080 * 0.4 }}>
                <ActivityShareCard data={s.props as any} format="square" dateISO={DATE_ISO} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
