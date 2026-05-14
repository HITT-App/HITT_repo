import hiitWatermark from '@/assets/hiit-watermark.png';

const SIZE = 1080;

export interface RoutePoint {
  lat: number;
  lng: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawStatsBar(
  ctx: CanvasRenderingContext2D,
  activityTitle: string,
  stats: Array<{ label: string; value: string | number; unit?: string }>,
) {
  const barH = 260;
  const y = SIZE - barH;

  // Dark gradient bar
  const grad = ctx.createLinearGradient(0, y, 0, SIZE);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.3, 'rgba(0,0,0,0.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, SIZE, barH);

  // Activity title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(activityTitle, 48, SIZE - barH + 120);

  // Stats row
  const visibleStats = stats.slice(0, 4);
  const colW = (SIZE - 96) / visibleStats.length;
  visibleStats.forEach((stat, i) => {
    const x = 48 + colW * i;
    const statY = SIZE - 70;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    const valText = `${stat.value}${stat.unit ? ` ${stat.unit}` : ''}`;
    ctx.fillText(valText, x, statY - 30);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '500 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.label.toUpperCase(), x, statY + 6);
  });
}

async function stampWatermark(ctx: CanvasRenderingContext2D) {
  try {
    const wm = await loadImage(hiitWatermark);
    const wmSize = 140;
    ctx.globalAlpha = 0.18;
    ctx.drawImage(wm, SIZE - wmSize - 36, 36, wmSize, wmSize);
    ctx.globalAlpha = 1.0;
  } catch {
    // Watermark not critical
  }
}

/** Stats card — uses map as background when available, otherwise dark gradient */
export async function generateStatsCard(
  activityTitle: string,
  activityType: string,
  stats: Array<{ label: string; value: string | number; unit?: string }>,
  mapElement?: HTMLElement | null,
  pbLabel?: string,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  if (mapElement) {
    // Capture the live map as the background
    const { default: html2canvas } = await import('html2canvas');
    const mapCanvas = await html2canvas(mapElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#1a1a2e',
      width: mapElement.offsetWidth,
      height: mapElement.offsetHeight,
    });
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const scale = Math.max(SIZE / mapCanvas.width, SIZE / mapCanvas.height);
    const w = mapCanvas.width * scale;
    const h = mapCanvas.height * scale;
    ctx.drawImage(mapCanvas, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  } else {
    // Dark gradient background fallback
    const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    bg.addColorStop(0, '#0f0f0f');
    bg.addColorStop(0.5, '#1a1a2e');
    bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Subtle pattern circles
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(SIZE * 0.7, SIZE * 0.3, 120 + i * 80, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Activity type emoji/icon
    const typeIcons: Record<string, string> = {
      running: '🏃', cycling: '🚴', walking: '🚶', swimming: '🏊',
      yoga: '🧘', hiit: '🔥', workout: '💪', gym: '🏋️',
    };
    const emoji = pbLabel ? '🏆' : (typeIcons[activityType?.toLowerCase()] || '💪');
    ctx.font = '120px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, SIZE / 2, SIZE / 2 - 40);

    if (pbLabel) {
      // Gold "NEW PB" banner
      ctx.fillStyle = 'rgba(245,158,11,0.15)';
      ctx.fillRect(0, SIZE / 2 + 10, SIZE, 80);
      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 30px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('NEW PERSONAL BEST', SIZE / 2, SIZE / 2 + 44);
      ctx.fillStyle = 'rgba(245,158,11,0.7)';
      ctx.font = '400 22px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '0px';
      ctx.fillText(pbLabel, SIZE / 2, SIZE / 2 + 76);
    } else {
      // "COMPLETED" label
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '600 28px system-ui, -apple-system, sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('COMPLETED', SIZE / 2, SIZE / 2 + 40);
    }
  }

  await stampWatermark(ctx);
  drawStatsBar(ctx, activityTitle, stats);

  return canvas.toDataURL('image/png');
}

/** Photo card — overlays stats on user photo */
export async function generatePhotoCard(
  photoDataUrl: string,
  activityTitle: string,
  stats: Array<{ label: string; value: string | number; unit?: string }>,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  const img = await loadImage(photoDataUrl);

  // Cover-fit the photo
  const scale = Math.max(SIZE / img.width, SIZE / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

  await stampWatermark(ctx);
  drawStatsBar(ctx, activityTitle, stats);

  return canvas.toDataURL('image/png');
}

/** Route card — draws GPS track directly on canvas (Strava-style, no external deps) */
export async function generateRouteCard(
  positions: RoutePoint[],
  activityTitle: string,
  stats: Array<{ label: string; value: string | number; unit?: string }>,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // Dark background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const mapH = SIZE - 260; // route area height (stats bar takes bottom 260)

  if (positions.length >= 2) {
    const lats = positions.map((p) => p.lat);
    const lngs = positions.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    // Mercator Y so route isn't distorted at high latitudes
    const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const minMerc = mercY(minLat);
    const maxMerc = mercY(maxLat);
    const mercSpan = maxMerc - minMerc || 0.001;

    const pad = 90;
    const scaleX = (SIZE - pad * 2) / lngSpan;
    const scaleY = (mapH - pad * 2) / mercSpan;
    const scale = Math.min(scaleX, scaleY);

    const projW = lngSpan * scale;
    const projH = mercSpan * scale;
    const originX = (SIZE - projW) / 2;
    const originY = (mapH - projH) / 2;

    const toXY = (lat: number, lng: number): [number, number] => [
      originX + (lng - minLng) * scale,
      mapH - (originY + (mercY(lat) - minMerc) * scale),
    ];

    // Subtle grid
    ctx.globalAlpha = 0.035;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo((SIZE * i) / 7, 0); ctx.lineTo((SIZE * i) / 7, mapH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (mapH * i) / 7); ctx.lineTo(SIZE, (mapH * i) / 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Outer glow
    ctx.strokeStyle = 'hsl(24,90%,55%)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 22;
    ctx.beginPath();
    positions.forEach((p, i) => { const [x, y] = toXY(p.lat, p.lng); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();

    // Mid glow
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 12;
    ctx.beginPath();
    positions.forEach((p, i) => { const [x, y] = toXY(p.lat, p.lng); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();

    // Main line
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    positions.forEach((p, i) => { const [x, y] = toXY(p.lat, p.lng); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();

    // Start dot (green)
    const [sx, sy] = toXY(positions[0].lat, positions[0].lng);
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();

    // Finish dot (orange with white ring)
    const last = positions[positions.length - 1];
    const [ex, ey] = toXY(last.lat, last.lng);
    ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(24,90%,55%)'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  } else {
    // No route — placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = '140px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🗺️', SIZE / 2, mapH / 2 + 50);
  }

  await stampWatermark(ctx);
  drawStatsBar(ctx, activityTitle, stats);
  return canvas.toDataURL('image/png');
}

// ── Shared projection helper ────────────────────────────────────────

interface ProjectionContext {
  toXY: (lat: number, lng: number) => [number, number];
  positions: RoutePoint[];
}

function buildProjection(
  positions: RoutePoint[],
  areaX: number, areaY: number, areaW: number, areaH: number,
  pad = 80,
): ProjectionContext {
  const lats = positions.map(p => p.lat);
  const lngs = positions.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const lngSpan = maxLng - minLng || 0.001;

  const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const minMerc = mercY(minLat), maxMerc = mercY(maxLat);
  const mercSpan = maxMerc - minMerc || 0.001;

  const scaleX = (areaW - pad * 2) / lngSpan;
  const scaleY = (areaH - pad * 2) / mercSpan;
  const s = Math.min(scaleX, scaleY);
  const projW = lngSpan * s, projH = mercSpan * s;

  const toXY = (lat: number, lng: number): [number, number] => [
    areaX + (areaW - projW) / 2 + (lng - minLng) * s,
    // Flip Y: minLat → bottom of area, maxLat → top
    areaY + (areaH + projH) / 2 - (mercY(lat) - minMerc) * s,
  ];

  return { toXY, positions };
}

function drawRouteLine(ctx: CanvasRenderingContext2D, proj: ProjectionContext) {
  const { toXY, positions } = proj;
  ctx.strokeStyle = 'hsl(24,90%,55%)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = 0.10; ctx.lineWidth = 22;
  ctx.beginPath();
  positions.forEach((p, i) => { const [x, y] = toXY(p.lat, p.lng); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();

  ctx.globalAlpha = 0.22; ctx.lineWidth = 12;
  ctx.beginPath();
  positions.forEach((p, i) => { const [x, y] = toXY(p.lat, p.lng); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();

  ctx.globalAlpha = 1; ctx.lineWidth = 4.5;
  ctx.beginPath();
  positions.forEach((p, i) => { const [x, y] = toXY(p.lat, p.lng); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();

  const [sx, sy] = toXY(positions[0].lat, positions[0].lng);
  ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e'; ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();

  const last = positions[positions.length - 1];
  const [ex, ey] = toXY(last.lat, last.lng);
  ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'hsl(24,90%,55%)'; ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.globalAlpha = 1;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Transparent card — route + stats on transparent background for Story compositing */
export async function generateTransparentCard(
  positions: RoutePoint[],
  activityTitle: string,
  stats: Array<{ label: string; value: string | number; unit?: string }>,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  // No background fill — canvas is transparent by default

  const mapH = SIZE - 260;

  if (positions.length >= 2) {
    const proj = buildProjection(positions, 0, 0, SIZE, mapH);
    drawRouteLine(ctx, proj);
  } else {
    ctx.globalAlpha = 0.5;
    ctx.font = '140px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🗺️', SIZE / 2, mapH / 2 + 50);
    ctx.globalAlpha = 1;
  }

  await stampWatermark(ctx);

  // Semi-transparent gradient bar — legible on any background colour
  const barH = 260;
  const barY = SIZE - barH;
  const grad = ctx.createLinearGradient(0, barY, 0, SIZE);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.35, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, barY, SIZE, barH);
  drawStatsBar(ctx, activityTitle, stats);

  return canvas.toDataURL('image/png');
}

/** Story card — 1080×1920 portrait template for Instagram/TikTok Stories */
export async function generateStoryCard(
  positions: RoutePoint[],
  activityTitle: string,
  activityType: string,
  stats: Array<{ label: string; value: string | number; unit?: string }>,
): Promise<string> {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, W, H);

  // ── HITT orange diagonal brand stripes ──
  function stripe(tx: number, ty: number, angle: number, w: number, h: number, solid: boolean, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    if (solid) {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'hsl(24,90%,58%)');
      g.addColorStop(1, 'hsl(24,90%,38%)');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = 'rgba(255,110,15,0.7)';
    }
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Top-right
  stripe(W + 30, -30, 0.58, 170, 740, true, 1);
  stripe(W + 30, -30, 0.58, 58, 740, false, 1);
  // Bottom-left
  stripe(-30, H + 30, 0.58, 170, 740, true, 1);
  stripe(-30, H + 30, 0.58, 58, 740, false, 1);

  // ── Route card ──
  const cPad = 56, cW = W - cPad * 2, cH = 680, cX = cPad, cY = 230, r = 32;

  // Card shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#1a1a1a';
  roundRectPath(ctx, cX, cY, cW, cH, r);
  ctx.fill();
  ctx.restore();

  // Clip to card
  ctx.save();
  roundRectPath(ctx, cX, cY, cW, cH, r);
  ctx.clip();

  if (positions.length >= 2) {
    // Subtle grid
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(cX + (cW * i) / 7, cY); ctx.lineTo(cX + (cW * i) / 7, cY + cH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cX, cY + (cH * i) / 7); ctx.lineTo(cX + cW, cY + (cH * i) / 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const proj = buildProjection(positions, cX, cY, cW, cH, 60);
    drawRouteLine(ctx, proj);
  } else {
    const typeIcons: Record<string, string> = {
      running: '🏃', cycling: '🚴', walking: '🚶', swimming: '🏊',
      yoga: '🧘', hiit: '🔥', workout: '💪', gym: '🏋️',
    };
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cX, cY, cW, cH);
    ctx.globalAlpha = 1;
    ctx.font = '170px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(typeIcons[activityType?.toLowerCase()] || '💪', cX + cW / 2, cY + cH / 2 + 65);
  }
  ctx.restore();

  // ── Stats row ──
  const statsY = cY + cH + 72;
  const visStats = stats.slice(0, 3);
  const colW = (W - 80) / visStats.length;

  visStats.forEach((stat, i) => {
    const cx = 40 + colW * i + colW / 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 70px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${stat.value}${stat.unit ? ` ${stat.unit}` : ''}`, cx, statsY + 70);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.label.toUpperCase(), cx, statsY + 114);
  });

  // Separator
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, statsY + 148); ctx.lineTo(W - 80, statsY + 148); ctx.stroke();

  // ── Activity title ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  let title = activityTitle;
  while (ctx.measureText(title).width > W - 140 && title.length > 1) title = title.slice(0, -1);
  if (title !== activityTitle) title = title.trim() + '…';
  ctx.fillText(title, W / 2, statsY + 218);

  // ── HITT branding ──
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '500 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('Check out this activity on', W / 2, H - 178);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
  ctx.fillText('HITT', W / 2, H - 110);

  await stampWatermark(ctx);
  return canvas.toDataURL('image/png');
}

/** Map card — captures a DOM element and overlays stats */
export async function generateMapCard(
  mapElement: HTMLElement,
  activityTitle: string,
  stats: Array<{ label: string; value: string | number; unit?: string }>,
): Promise<string> {
  const { default: html2canvas } = await import('html2canvas');
  const mapCanvas = await html2canvas(mapElement, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#1a1a2e',
    width: mapElement.offsetWidth,
    height: mapElement.offsetHeight,
  });

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // Dark background
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Cover-fit the map screenshot
  const scale = Math.max(SIZE / mapCanvas.width, SIZE / mapCanvas.height);
  const w = mapCanvas.width * scale;
  const h = mapCanvas.height * scale;
  ctx.drawImage(mapCanvas, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

  await stampWatermark(ctx);
  drawStatsBar(ctx, activityTitle, stats);

  return canvas.toDataURL('image/png');
}
