// Only the summaries HIIT shows or uses. Epochs, pulse ox, respiration, blood pressure,
// skin temperature, nutrition, hydration, snapshots and sleep stage timelines aren't taken.

export type GarminDaily = {
  userId?: string;
  calendarDate?: string;
  steps?: number;
  restingHeartRateInBeatsPerMinute?: number;
  averageStressLevel?: number;
};
export type GarminStressDetail = {
  userId?: string;
  calendarDate?: string;
  timeOffsetBodyBatteryValues?: Record<string, number>;
};
export type GarminBodyComp = {
  userId?: string;
  summaryId?: string;
  measurementTimeInSeconds?: number;
  weightInGrams?: number;
  bodyFatInPercent?: number;
};
export type GarminUserMetrics = { userId?: string; calendarDate?: string; vo2Max?: number };
export type GarminHrv = { userId?: string; calendarDate?: string; lastNightAvg?: number };
export type GarminSleep = {
  userId?: string;
  calendarDate?: string;
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  deepSleepDurationInSeconds?: number;
  lightSleepDurationInSeconds?: number;
  remSleepInSeconds?: number;
  awakeDurationInSeconds?: number;
  overallSleepScore?: { value?: number };
};

export type MetricRow = {
  user_id: string;
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  source_platform: "garmin_api";
  source_platform_id: string;
};

function metric(
  userId: string,
  metricType: string,
  value: number | null | undefined,
  unit: string,
  recordedAt: string,
  id: string,
): MetricRow[] {
  if (value == null || !Number.isFinite(value)) return [];
  return [{
    user_id: userId,
    metric_type: metricType,
    value,
    unit,
    recorded_at: recordedAt,
    source_platform: "garmin_api",
    // Stable per day: Garmin resends a growing summary through the day and the latest must replace it.
    source_platform_id: id,
  }];
}

// One push can repeat a day or summaryId, and a single upsert can't touch the same row twice.
// Garmin lists a growing summary oldest first, so the last one is the fullest.
export function lastPerSourceId<T extends { user_id: string; source_platform_id: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) byId.set(`${row.user_id}|${row.source_platform_id}`, row);
  return [...byId.values()];
}

const midday = (date: string) => `${date}T12:00:00Z`;
const minutes = (seconds: number | undefined) => (seconds == null ? null : Math.round(seconds / 60));

export function mapDaily(s: GarminDaily, userId: string): MetricRow[] {
  const date = s.calendarDate;
  if (!date) return [];
  // Garmin reports a negative stress level when it couldn't measure one.
  const stress = s.averageStressLevel != null && s.averageStressLevel >= 0 ? s.averageStressLevel : null;
  return [
    // Zero means the watch recorded nothing that day. Saving it would replace a real Apple Health count.
    ...metric(userId, "steps", s.steps || null, "count", midday(date), `steps-${date}`),
    ...metric(userId, "resting_heart_rate", s.restingHeartRateInBeatsPerMinute || null, "bpm", midday(date), `rhr-${date}`),
    ...metric(userId, "stress", stress, "score", midday(date), `stress-${date}`),
  ];
}

// The latest reading of the day. The map's keys are seconds from the start of the summary.
export function mapStressDetail(s: GarminStressDetail, userId: string): MetricRow[] {
  const date = s.calendarDate;
  const values = s.timeOffsetBodyBatteryValues;
  if (!date || !values) return [];
  const latest = Object.keys(values).map(Number).filter(Number.isFinite).sort((a, b) => b - a)[0];
  if (latest === undefined) return [];
  return metric(userId, "body_battery", values[String(latest)], "score", midday(date), `body-battery-${date}`);
}

export function mapBodyComp(s: GarminBodyComp, userId: string): MetricRow[] {
  if (!s.measurementTimeInSeconds) return [];
  const at = new Date(s.measurementTimeInSeconds * 1000).toISOString();
  const key = s.summaryId ?? String(s.measurementTimeInSeconds);
  const weight = s.weightInGrams != null ? s.weightInGrams / 1000 : null;
  return [
    ...metric(userId, "weight", weight, "kg", at, `weight-${key}`),
    ...metric(userId, "body_fat", s.bodyFatInPercent, "%", at, `body-fat-${key}`),
  ];
}

export function mapUserMetrics(s: GarminUserMetrics, userId: string): MetricRow[] {
  if (!s.calendarDate) return [];
  return metric(userId, "vo2_max", s.vo2Max, "ml/kg/min", midday(s.calendarDate), `vo2-${s.calendarDate}`);
}

export function mapHrv(s: GarminHrv, userId: string): MetricRow[] {
  if (!s.calendarDate) return [];
  return metric(userId, "hrv", s.lastNightAvg, "ms", midday(s.calendarDate), `hrv-${s.calendarDate}`);
}

export function mapSleep(s: GarminSleep, userId: string) {
  if (!s.calendarDate || !s.startTimeInSeconds || !s.durationInSeconds) return null;
  const start = s.startTimeInSeconds * 1000;
  return {
    user_id: userId,
    sleep_date: s.calendarDate,
    bedtime: new Date(start).toISOString(),
    wake_time: new Date(start + s.durationInSeconds * 1000).toISOString(),
    duration_minutes: minutes(s.durationInSeconds),
    deep_sleep_minutes: minutes(s.deepSleepDurationInSeconds),
    light_sleep_minutes: minutes(s.lightSleepDurationInSeconds),
    rem_sleep_minutes: minutes(s.remSleepInSeconds),
    awake_minutes: minutes(s.awakeDurationInSeconds),
    source_platform: "garmin_api",
    source_platform_id: `sleep-${s.calendarDate}`,
  };
}

export function mapSleepScore(s: GarminSleep, userId: string): MetricRow[] {
  if (!s.calendarDate) return [];
  return metric(userId, "sleep_score", s.overallSleepScore?.value, "score", midday(s.calendarDate), `sleep-score-${s.calendarDate}`);
}
