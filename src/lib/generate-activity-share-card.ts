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
}

// Bail if the required web fonts haven't loaded — html2canvas would paint
// whatever the browser has fallen back to, and the card would look wrong.
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    // Preload the exact families + weights the card uses. If any are unknown
    // to the font system, the promise still resolves — we just carry on.
    await Promise.all([
      document.fonts.load("700 120px 'Saira Condensed'"),
      document.fonts.load("600 42px 'Saira Condensed'"),
      document.fonts.load("500 30px 'Inter'"),
    ]);
    await document.fonts.ready;
  } catch {
    // Non-fatal — some browsers/webviews reject unknown font-face specs.
  }
}

async function renderCardToCanvas(opts: GenerateOptions): Promise<HTMLCanvasElement> {
  const { data, format = 'story', dateISO } = opts;
  const width = 1080;
  const height = format === 'square' ? 1080 : 1920;

  // Hidden off-screen container. Positioned way outside the viewport with
  // pointer-events off so it never affects the visible page.
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.top = '-99999px';
  host.style.left = '-99999px';
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    await ensureFonts();

    // Mount + wait a frame so the DOM lays out before html2canvas walks it.
    await new Promise<void>((resolve) => {
      root.render(
        createElement(ActivityShareCard, { data, format, dateISO }),
      );
      // Two RAFs for iOS WKWebView layout timing — same technique used
      // elsewhere in the app (CompletionSummary).
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    // Wait for the logo <img> to actually load — html2canvas would otherwise
    // race the fetch and produce a card without the hex logo.
    const imgs = host.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map((img) => new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
      // Bounded — if the network is genuinely dead, don't hang the share.
      setTimeout(() => resolve(), 2500);
    })));

    return await html2canvas(host, {
      width, height, scale: 1,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  } finally {
    root.unmount();
    host.remove();
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
