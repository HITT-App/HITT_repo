// Global mic-access tracker. Wraps navigator.mediaDevices.getUserMedia and
// window.SpeechRecognition so we can trace which component grabbed the
// microphone, when, and whether it released it cleanly.
//
// Read state from Safari Web Inspector on a running device build:
//
//   window.__hittDebug.mic          → aggregate counters
//   window.__hittDebug.mic.recent   → last 30 accesses with source + timestamp
//
// Motivation: the "mic keeps tinkling after sign-out → sign-in" bug can
// live in ANY mic-touching component — WakeWordListener, JarvisMode,
// VoiceRecorder, or a Capacitor plugin. Component-level counters (like
// WakeWordListener's) catch one source; this global tracker catches all
// of them, so the on-device debug session doesn't miss the culprit even
// if it's somewhere unexpected.
//
// Zero cost in steady state — just increments a couple of counters. The
// wrapper is installed at app startup from main.tsx so it's active
// before any component mounts.

const MAX_RECENT = 30;
const CALLS_PER_MINUTE_WINDOW_MS = 60 * 1000;

interface MicCallEntry {
  at: number;          // epoch ms
  source: 'getUserMedia' | 'SpeechRecognition' | 'MediaRecorder';
  action: 'request' | 'grant' | 'reject' | 'track-stop' | 'start' | 'end' | 'abort';
  callSite: string;    // trimmed stack frame
  detail?: string;     // e.g. error name, constraints hint
}

export interface MicDebugState {
  // getUserMedia
  gumCalls:       number;
  gumGranted:     number;
  gumRejected:    number;
  gumActiveStreams: number;
  gumTracksLive:  number;   // sum of live MediaStreamTracks across all granted streams

  // SpeechRecognition (from any component, not just WakeWordListener)
  srConstructed:  number;
  srStarts:       number;
  srEnds:         number;
  srAborts:       number;
  srActive:       number;

  // MediaRecorder (voice memo path)
  mrConstructed:  number;
  mrActive:       number;

  // Rolling activity
  callsInLastMinute: number;
  recent: MicCallEntry[];

  // Summary helpers
  summary: () => string;
}

declare global {
  interface Window {
    __hittDebug?: {
      wakeWord?: unknown;
      mic?: MicDebugState;
    };
  }
}

function pickCallSite(): string {
  try {
    const stack = new Error().stack ?? '';
    const lines = stack.split('\n').map(s => s.trim());
    // Frame 0 is Error / pickCallSite; frame 1 is our wrapper; frame 2 is
    // the caller. Fall back to the whole tail if the split shape isn't
    // what we expected on this runtime.
    const caller = lines[3] ?? lines[2] ?? lines[lines.length - 1];
    // Strip "at " and long file paths — keep the last ~60 chars so it
    // still fits in the inspector view.
    return caller.replace(/^at\s+/, '').slice(-80);
  } catch {
    return 'unknown';
  }
}

function log(state: MicDebugState, entry: Omit<MicCallEntry, 'at'>): void {
  const now = Date.now();
  state.recent.push({ ...entry, at: now });
  if (state.recent.length > MAX_RECENT) state.recent.shift();
  state.callsInLastMinute = state.recent.filter(
    e => e.action === 'request' || e.action === 'start' || e.action === 'grant',
  ).filter(e => now - e.at < CALLS_PER_MINUTE_WINDOW_MS).length;
}

let installed = false;

export function installMicDebug(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const state: MicDebugState = {
    gumCalls: 0, gumGranted: 0, gumRejected: 0, gumActiveStreams: 0, gumTracksLive: 0,
    srConstructed: 0, srStarts: 0, srEnds: 0, srAborts: 0, srActive: 0,
    mrConstructed: 0, mrActive: 0,
    callsInLastMinute: 0,
    recent: [],
    summary: () => '',
  };
  state.summary = () => `gum(calls=${state.gumCalls},granted=${state.gumGranted},active=${state.gumActiveStreams}) sr(built=${state.srConstructed},active=${state.srActive},starts=${state.srStarts},ends=${state.srEnds}) mr(built=${state.mrConstructed},active=${state.mrActive}) lastMin=${state.callsInLastMinute}`;

  // Assign state FIRST + before any wrapping so window.__hittDebug.mic is
  // always readable even if one of the wrappers below throws (WKWebView
  // makes some of these APIs read-only, which trips at assignment time).
  // Also assign globally guarded — some very early access paths can be
  // hit before window is fully populated.
  try {
    window.__hittDebug = window.__hittDebug ?? {};
    window.__hittDebug.mic = state;
    // eslint-disable-next-line no-console
    console.log('[mic-debug] installed', state.summary());
  } catch (e) {
    console.warn('[mic-debug] cannot assign window.__hittDebug.mic', e);
    return;
  }

  // ── getUserMedia ────────────────────────────────────────────────────────
  try {
  const md = navigator.mediaDevices;
  if (md && typeof md.getUserMedia === 'function') {
    const originalGum = md.getUserMedia.bind(md);
    md.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      const callSite = pickCallSite();
      const wantsAudio = !!constraints?.audio;
      state.gumCalls += 1;
      log(state, { source: 'getUserMedia', action: 'request', callSite, detail: wantsAudio ? 'audio' : 'video-only' });
      try {
        const stream = await originalGum(constraints);
        state.gumGranted += 1;
        state.gumActiveStreams += 1;
        // Only count live audio tracks toward the mic accounting — video
        // tracks (camera) don't cause the mic-access chime.
        const audioTracks = stream.getAudioTracks();
        state.gumTracksLive += audioTracks.length;
        log(state, { source: 'getUserMedia', action: 'grant', callSite, detail: `audioTracks=${audioTracks.length}` });

        // Instrument stop() on each audio track so we can see when the
        // component actually released the mic. Some components leak
        // tracks (don't call stop() on unmount), which is a common
        // source of the "mic feels stuck on" symptom.
        for (const track of audioTracks) {
          const originalStop = track.stop.bind(track);
          track.stop = () => {
            state.gumTracksLive = Math.max(0, state.gumTracksLive - 1);
            if (state.gumTracksLive === 0) state.gumActiveStreams = Math.max(0, state.gumActiveStreams - 1);
            log(state, { source: 'getUserMedia', action: 'track-stop', callSite: pickCallSite() });
            return originalStop();
          };
        }
        return stream;
      } catch (err: unknown) {
        state.gumRejected += 1;
        const name = (err instanceof Error) ? err.name : 'unknown';
        log(state, { source: 'getUserMedia', action: 'reject', callSite, detail: name });
        throw err;
      }
    };
  }
  } catch (e) {
    // WKWebView marks getUserMedia read-only on some iOS versions —
    // reassignment throws. Skip the wrapper and keep going; the
    // SpeechRecognition and MediaRecorder wrappers below still work.
    console.warn('[mic-debug] getUserMedia wrap skipped', e);
  }

  // ── SpeechRecognition ───────────────────────────────────────────────────
  // Wrap both the standard and vendor-prefixed constructors so any caller
  // (WakeWordListener, a plugin, or new code we haven't written yet) is
  // counted. WakeWordListener still has its own generation-scoped counter
  // in __hittDebug.wakeWord; this global counter is complementary.
  const wrapSR = (Ctor: typeof SpeechRecognition | undefined): typeof SpeechRecognition | undefined => {
    if (!Ctor) return Ctor;
    const original = Ctor;
    const wrapped = function (this: SpeechRecognition, ...args: unknown[]) {
      const callSite = pickCallSite();
      state.srConstructed += 1;
      log(state, { source: 'SpeechRecognition', action: 'request', callSite });
      const instance = new (original as unknown as { new (...a: unknown[]): SpeechRecognition })(...args);

      const originalStart = instance.start.bind(instance);
      instance.start = () => {
        state.srStarts += 1;
        state.srActive += 1;
        log(state, { source: 'SpeechRecognition', action: 'start', callSite });
        return originalStart();
      };
      const originalAbort = instance.abort.bind(instance);
      instance.abort = () => {
        state.srAborts += 1;
        log(state, { source: 'SpeechRecognition', action: 'abort', callSite });
        return originalAbort();
      };
      // Chain onend so we can decrement active count when it fires. Users
      // of the class overwrite onend later; we preserve their handler.
      let userOnEnd: ((ev: Event) => void) | null = null;
      Object.defineProperty(instance, 'onend', {
        get() { return userOnEnd; },
        set(fn: ((ev: Event) => void) | null) { userOnEnd = fn; },
        configurable: true,
      });
      instance.addEventListener('end', (ev) => {
        state.srEnds += 1;
        state.srActive = Math.max(0, state.srActive - 1);
        log(state, { source: 'SpeechRecognition', action: 'end', callSite });
        if (userOnEnd) try { userOnEnd(ev); } catch { /* swallow */ }
      });
      return instance;
    };
    // Preserve constructor identity for `instanceof` checks in caller code.
    wrapped.prototype = original.prototype;
    return wrapped as unknown as typeof SpeechRecognition;
  };
  try {
    if (window.SpeechRecognition)         window.SpeechRecognition         = wrapSR(window.SpeechRecognition)!;
    if (window.webkitSpeechRecognition)   window.webkitSpeechRecognition   = wrapSR(window.webkitSpeechRecognition)!;
  } catch (e) {
    console.warn('[mic-debug] SpeechRecognition wrap skipped', e);
  }

  // ── MediaRecorder ───────────────────────────────────────────────────────
  // Voice-memo path in the chatroom. Not typically part of a loop, but
  // worth surfacing when we're triaging.
  try {
    if (typeof MediaRecorder !== 'undefined') {
      const originalMR = MediaRecorder;
      const wrapped = function (this: MediaRecorder, ...args: unknown[]) {
        const callSite = pickCallSite();
        state.mrConstructed += 1;
        state.mrActive += 1;
        log(state, { source: 'MediaRecorder', action: 'request', callSite });
        const instance = new (originalMR as unknown as { new (...a: unknown[]): MediaRecorder })(...args);
        const originalStop = instance.stop.bind(instance);
        instance.stop = () => {
          state.mrActive = Math.max(0, state.mrActive - 1);
          log(state, { source: 'MediaRecorder', action: 'end', callSite: pickCallSite() });
          return originalStop();
        };
        return instance;
      };
      wrapped.prototype = originalMR.prototype;
      (window as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder = wrapped as unknown as typeof MediaRecorder;
    }
  } catch (e) {
    console.warn('[mic-debug] MediaRecorder wrap skipped', e);
  }
}
