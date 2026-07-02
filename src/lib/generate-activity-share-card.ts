// Renders <ActivityShareCard /> into an off-screen container, snapshots it
// with html2canvas, returns a PNG Blob (or dataURL). Same html2canvas pattern
// as CompletionSummary — just factored out so multiple share entry points
// can reuse the same design.

import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { createElement } from 'react';
import {
  ActivityShareCard,
  type ActivityShareData,
} from '@/components/workout/ActivityShareCard';

interface GenerateOptions {
  data: ActivityShareData;
  format?: 'story' | 'square';
  dateISO?: string;
  bg?: 'white' | 'photo';
  photoDataUrl?: string | null;
}

// Bail if the required web fonts haven't loaded — html2canvas would paint
// whatever the browser has fallen back to, and the card would look wrong.
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    // Preload every font weight the card uses. document.fonts.load is a
    // no-op for fonts that don't need loading, and resolves once each
    // font-face is either loaded or has failed.
    await Promise.all([
      document.fonts.load("700 120px 'Saira Condensed'"),
      document.fonts.load("700 78px 'Saira Condensed'"),
      document.fonts.load("700 62px 'Saira Condensed'"),
      document.fonts.load("700 44px 'Saira Condensed'"),
      document.fonts.load("700 34px 'Saira Condensed'"),
      document.fonts.load("600 42px 'Saira Condensed'"),
      document.fonts.load("600 30px 'Saira Condensed'"),
      document.fonts.load("500 30px 'Inter'"),
    ]);
    await document.fonts.ready;
  } catch {
    // Non-fatal — some browsers/webviews reject unknown font-face specs.
  }
}

async function renderCardToCanvas(opts: GenerateOptions): Promise<HTMLCanvasElement> {
  const { data, format = 'story', dateISO, bg = 'white', photoDataUrl = null } = opts;
  const width = 1080;
  const height = format === 'square' ? 1080 : 1920;

  // On-screen container placed inside a zero-size clipping wrapper. This
  // pattern is important: html2canvas walks computed styles, and some
  // WKWebView builds skip layout/paint for elements positioned at hugely
  // negative offsets (`top: -99999px`) — which produced a blank PNG on
  // real devices. Clipping via `overflow: hidden` on a 0×0 wrapper keeps
  // the child fully participating in layout while staying invisible.
  const clip = document.createElement('div');
  clip.style.position = 'fixed';
  clip.style.top = '0';
  clip.style.left = '0';
  clip.style.width = '0';
  clip.style.height = '0';
  clip.style.overflow = 'hidden';
  clip.style.pointerEvents = 'none';
  clip.setAttribute('aria-hidden', 'true');

  const host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.background = '#ffffff';
  clip.appendChild(host);
  document.body.appendChild(clip);

  const root = createRoot(host);

  try {
    await ensureFonts();

    root.render(
      createElement(ActivityShareCard, { data, format, dateISO, bg, photoDataUrl }),
    );

    // Wait for React commit + at least two paint frames so the layout is
    // real before we snapshot. On iOS WKWebView a single RAF was catching
    // an unpainted tree.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    // Wait for every <img> inside the card to load — the hex logo and the
    // optional photo background must both be pixels-in-DOM before the
    // canvas walk. Bounded so a dead network doesn't hang the share.
    const imgs = host.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map((img) => new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      setTimeout(done, 3500);
    })));

    // Second RAF pair after images resolve, so the newly-loaded pixels are
    // committed before html2canvas walks the tree.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    return await html2canvas(host, {
      width, height, scale: 1,
      useCORS: true,
      // Allow tainted-canvas draws so images that arrive without CORS
      // headers still render (Capacitor's local assets don't set them).
      // Without this the hex logo silently skipped and the whole PNG
      // came out blank on some builds.
      allowTaint: true,
      // null background allows the transparency-under-photo variant to
      // preserve its own layered look. For the white variant the card
      // itself paints the background so this is still correct.
      backgroundColor: bg === 'photo' ? null : '#ffffff',
      logging: false,
    });
  } finally {
    root.unmount();
    clip.remove();
  }
}

export async function generateActivityShareCardBlob(
  opts: GenerateOptions,
): Promise<Blob> {
  const canvas = await renderCardToCanvas(opts);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas.toBlob returned null'));
    }, 'image/png');
  });
}

export async function generateActivityShareCardDataUrl(
  opts: GenerateOptions,
): Promise<string> {
  const canvas = await renderCardToCanvas(opts);
  return canvas.toDataURL('image/png');
}
