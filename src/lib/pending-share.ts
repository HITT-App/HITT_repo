/**
 * Task #111 — remember an in-flight external share so we can pick the user back up.
 *
 * When someone shares a workout out to Instagram/WhatsApp, two things can happen on
 * the way back:
 *
 *   Warm return — the WebView survived. React state and the router are intact.
 *   Cold return — iOS reclaimed the WebView (likely; a 1080×1080 PNG handed to
 *                 Instagram is memory-heavy). Capacitor reloads from the root URL
 *                 and BrowserRouter starts at "/", so the user lands on the home
 *                 screen having lost their place.
 *
 * A record written BEFORE the share call covers both: on the cold path there is no
 * "after" to write in. On return we restore the route and offer to post to the feed.
 *
 * Metadata goes in localStorage (survives the kill/relaunch cycle — the auth session
 * relies on the same property). The share-card PNG goes in IndexedDB, which takes a
 * Blob directly and isn't bound by localStorage's ~5MB string budget.
 */

const META_KEY = 'hitt:pending_share';
const DB_NAME = 'hitt-pending-share';
const STORE = 'blobs';
const BLOB_KEY = 'card';

/** Past this, the user has moved on and an unprompted dialog is worse than nothing. */
export const PENDING_SHARE_TTL_MS = 10 * 60 * 1000;

export type PendingShare = {
  /** Where the user was when they hit share, e.g. "/activity/123". */
  returnRoute: string;
  activityTitle: string;
  /** Pre-filled caption for the feed post. */
  shareText: string;
  activityType?: string;
  /** Only set when a card image was generated and stashed in IndexedDB. */
  hasImage: boolean;
  createdAt: number;
};

// ── IndexedDB (blob) ────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function putBlob(blob: Blob): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, BLOB_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function getBlob(): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(BLOB_KEY);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function deleteBlob(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(BLOB_KEY);
  } catch {
    // Nothing to clean up.
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Call immediately BEFORE invoking the system share sheet — never after. On the cold
 * path the WebView may not survive long enough to run anything that follows the share.
 *
 * Failures here are swallowed: not being able to offer a feed post later must never
 * break the share the user actually asked for.
 */
export async function recordPendingShare(
  input: Omit<PendingShare, 'createdAt' | 'hasImage' | 'returnRoute'> & {
    returnRoute?: string;
    image?: Blob | null;
  },
): Promise<void> {
  try {
    const { image, returnRoute, ...rest } = input;
    const stored = image ? await putBlob(image) : false;
    const record: PendingShare = {
      ...rest,
      returnRoute: returnRoute ?? window.location.pathname + window.location.search,
      hasImage: stored,
      createdAt: Date.now(),
    };
    localStorage.setItem(META_KEY, JSON.stringify(record));
  } catch {
    // Best-effort only.
  }
}

/** Returns the live record, or null if absent, malformed or expired (clearing as it goes). */
export function readPendingShare(): PendingShare | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(META_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let record: PendingShare;
  try {
    record = JSON.parse(raw) as PendingShare;
  } catch {
    void clearPendingShare();
    return null;
  }

  if (typeof record?.createdAt !== 'number' || !record.returnRoute) {
    void clearPendingShare();
    return null;
  }
  if (Date.now() - record.createdAt > PENDING_SHARE_TTL_MS) {
    void clearPendingShare();
    return null;
  }
  return record;
}

export async function readPendingShareImage(): Promise<Blob | null> {
  return getBlob();
}

export async function clearPendingShare(): Promise<void> {
  try {
    localStorage.removeItem(META_KEY);
  } catch {
    // Ignore.
  }
  await deleteBlob();
}
