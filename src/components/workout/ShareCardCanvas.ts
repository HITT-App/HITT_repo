import hiitWatermark from '@/assets/hiit-watermark.png';

const SIZE = 1080;

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
    const emoji = typeIcons[activityType?.toLowerCase()] || '💪';
    ctx.font = '120px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, SIZE / 2, SIZE / 2 - 40);

    // "COMPLETED" label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '600 28px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('COMPLETED', SIZE / 2, SIZE / 2 + 40);
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
