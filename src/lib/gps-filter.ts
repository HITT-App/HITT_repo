/**
 * GPS Filter Pipeline
 * - Kalman filter for lat/lng smoothing
 * - Speed-adaptive filtering (walk / run / cycle tiers)
 * - Haversine distance calculation
 */

// ── Types ───────────────────────────────────────────────────────────
export interface GpsPoint {
  lat: number;
  lng: number;
  ts: number;
  alt?: number | null;
}

export interface FilteredResult {
  point: GpsPoint;
  accepted: boolean;
  distanceDelta: number; // metres added
  speed: number;         // km/h instant
}

// ── Speed tiers ─────────────────────────────────────────────────────
type SpeedTier = "walk" | "run" | "cycle";

const TIER_CONFIG: Record<SpeedTier, {
  minMove: number;      // metres – ignore smaller movements
  maxJump: number;      // metres – reject teleports
  accuracy: number;     // metres – reject noisy fixes
}> = {
  walk:  { minMove: 1.5,  maxJump: 200,  accuracy: 25 },
  run:   { minMove: 3,    maxJump: 500,  accuracy: 35 },
  cycle: { minMove: 5,    maxJump: 1000, accuracy: 50 },
};

function getTier(speedKmh: number): SpeedTier {
  if (speedKmh > 20) return "cycle";
  if (speedKmh > 6) return "run";
  return "walk";
}

// ── Haversine ───────────────────────────────────────────────────────
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── 1-D Kalman filter ───────────────────────────────────────────────
class Kalman1D {
  private x: number;   // estimate
  private p: number;   // estimate uncertainty
  private q: number;   // process noise
  private r: number;   // measurement noise

  constructor(initValue: number, q = 0.00001, r = 0.0001) {
    this.x = initValue;
    this.p = 1;
    this.q = q;
    this.r = r;
  }

  update(measurement: number, accuracy?: number): number {
    // Adapt measurement noise from GPS accuracy
    const r = accuracy ? (accuracy / 100_000) ** 2 : this.r;

    // Predict
    this.p += this.q;

    // Update
    const k = this.p / (this.p + r);
    this.x += k * (measurement - this.x);
    this.p *= (1 - k);

    return this.x;
  }

  setProcessNoise(q: number) { this.q = q; }
}

// ── GPS Filter class ────────────────────────────────────────────────
export class GpsFilter {
  private latFilter: Kalman1D | null = null;
  private lngFilter: Kalman1D | null = null;
  private lastPoint: GpsPoint | null = null;
  private speedBuffer: number[] = [];
  private hasInitialLock = false;
  private initialAccuracyThreshold = 60;
  private activeAccuracyThreshold = 30;

  reset() {
    this.latFilter = null;
    this.lngFilter = null;
    this.lastPoint = null;
    this.speedBuffer = [];
    this.hasInitialLock = false;
  }

  /** Average speed over last few samples (km/h) */
  get avgSpeed(): number {
    if (this.speedBuffer.length === 0) return 0;
    return this.speedBuffer.reduce((a, b) => a + b, 0) / this.speedBuffer.length;
  }

  /** Process a raw GPS position. Returns filtered result. */
  process(
    lat: number,
    lng: number,
    ts: number,
    accuracy: number,
    alt?: number | null,
  ): FilteredResult {
    // Accuracy gate
    const accThreshold = this.hasInitialLock
      ? this.activeAccuracyThreshold
      : this.initialAccuracyThreshold;

    if (accuracy > accThreshold) {
      return {
        point: { lat, lng, ts, alt },
        accepted: false,
        distanceDelta: 0,
        speed: this.avgSpeed,
      };
    }

    // Init Kalman on first good fix
    if (!this.latFilter || !this.lngFilter) {
      // Adapt process noise to speed tier
      const q = 0.00001;
      this.latFilter = new Kalman1D(lat, q);
      this.lngFilter = new Kalman1D(lng, q);
      this.lastPoint = { lat, lng, ts, alt };
      this.hasInitialLock = true;
      return {
        point: { lat, lng, ts, alt },
        accepted: true,
        distanceDelta: 0,
        speed: 0,
      };
    }

    // Adapt process noise based on speed tier
    const tier = getTier(this.avgSpeed);
    const qMap: Record<SpeedTier, number> = {
      walk: 0.000005,
      run: 0.00002,
      cycle: 0.00005,
    };
    this.latFilter.setProcessNoise(qMap[tier]);
    this.lngFilter.setProcessNoise(qMap[tier]);

    // Apply Kalman
    const filteredLat = this.latFilter.update(lat, accuracy);
    const filteredLng = this.lngFilter.update(lng, accuracy);

    const config = TIER_CONFIG[tier];
    const last = this.lastPoint!;
    const dist = haversineDistance(last.lat, last.lng, filteredLat, filteredLng);

    // Min-move filter
    if (dist < config.minMove) {
      return {
        point: { lat: filteredLat, lng: filteredLng, ts, alt },
        accepted: false,
        distanceDelta: 0,
        speed: this.avgSpeed,
      };
    }

    // Jump protection
    if (dist > config.maxJump) {
      return {
        point: { lat: filteredLat, lng: filteredLng, ts, alt },
        accepted: false,
        distanceDelta: 0,
        speed: this.avgSpeed,
      };
    }

    // Calculate instant speed
    const dtHours = (ts - last.ts) / 3_600_000;
    const instantSpeed = dtHours > 0 ? (dist / 1000) / dtHours : 0;

    // Update speed buffer (keep last 5)
    this.speedBuffer.push(instantSpeed);
    if (this.speedBuffer.length > 5) this.speedBuffer.shift();

    const point: GpsPoint = { lat: filteredLat, lng: filteredLng, ts, alt };
    this.lastPoint = point;

    return {
      point,
      accepted: true,
      distanceDelta: dist,
      speed: instantSpeed,
    };
  }
}
