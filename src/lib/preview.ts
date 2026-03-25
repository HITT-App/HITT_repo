export const SW_REFRESH_FLAG = "sw-refresh-pending";
export const PREVIEW_LAST_HIDDEN_AT = "preview-last-hidden-at";
export const PREVIEW_SW_RESET_FLAG = "preview-sw-reset-done";
export const PREVIEW_RESUME_REFRESH_FLAG = "preview-resume-refresh";
export const CACHE_VERSION_KEY = "app_cache_version";

const PREVIEW_BUSTER_PARAM = "__preview_ts";
const PREVIEW_BOOT_ATTR = "data-preview-boot";
const PREVIEW_BOOT_STYLE_ID = "preview-boot-guard";
const PREVIEW_MAX_AGE_MS = 45_000;

export const isEmbeddedPreview =
  typeof window !== "undefined" && window.self !== window.top;

export const isLovablePreviewHost =
  typeof window !== "undefined" &&
  (() => {
    const hostname = window.location.hostname;

    return (
      hostname.includes("preview--") ||
      hostname === "lovableproject.com" ||
      hostname.endsWith(".lovableproject.com") ||
      (hostname.endsWith(".lovable.app") &&
        (hostname.includes("preview--") || isEmbeddedPreview))
    );
  })();

function ensurePreviewBootStyle() {
  if (!isLovablePreviewHost || typeof document === "undefined") return;
  if (document.getElementById(PREVIEW_BOOT_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = PREVIEW_BOOT_STYLE_ID;
  style.textContent = `
    html[${PREVIEW_BOOT_ATTR}="pending"],
    html[${PREVIEW_BOOT_ATTR}="pending"] body {
      background: hsl(0 0% 4%) !important;
    }

    html[${PREVIEW_BOOT_ATTR}="pending"] #root {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;

  document.head.appendChild(style);
}

export function installPreviewBootGuard() {
  if (!isLovablePreviewHost || typeof document === "undefined") return;

  ensurePreviewBootStyle();
  document.documentElement.setAttribute(PREVIEW_BOOT_ATTR, "pending");
  document.getElementById("root")?.replaceChildren();
}

export function releasePreviewBootGuard() {
  if (!isLovablePreviewHost || typeof document === "undefined") return;
  document.documentElement.removeAttribute(PREVIEW_BOOT_ATTR);
}

export function freezePreviewSnapshot() {
  if (!isLovablePreviewHost || typeof document === "undefined") return;
  installPreviewBootGuard();
}

export function shouldRefreshPreviewOnLoad() {
  if (!isLovablePreviewHost) return false;

  const url = new URL(window.location.href);
  const rawTimestamp = url.searchParams.get(PREVIEW_BUSTER_PARAM);
  const timestamp = rawTimestamp ? Number(rawTimestamp) : Number.NaN;

  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp > PREVIEW_MAX_AGE_MS;
}

function buildPreviewBustedUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(PREVIEW_BUSTER_PARAM, `${Date.now()}`);
  return nextUrl.toString();
}

export function refreshPreviewNow() {
  if (!isLovablePreviewHost) return;
  window.location.replace(buildPreviewBustedUrl());
}

export function markPreviewForRefreshOnResume() {
  if (!isLovablePreviewHost) return;
  sessionStorage.setItem(PREVIEW_RESUME_REFRESH_FLAG, "1");
}

export function consumePreviewRefreshOnResume() {
  if (!isLovablePreviewHost) return false;

  const shouldRefresh = sessionStorage.getItem(PREVIEW_RESUME_REFRESH_FLAG) === "1";
  if (shouldRefresh) {
    sessionStorage.removeItem(PREVIEW_RESUME_REFRESH_FLAG);
  }

  return shouldRefresh;
}

let previewBootPrimed = false;

export function primePreviewBoot() {
  if (!isLovablePreviewHost || previewBootPrimed) return;

  previewBootPrimed = true;
  installPreviewBootGuard();
}