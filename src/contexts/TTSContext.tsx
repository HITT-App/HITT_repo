import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const VOICE_ENABLED_KEY = 'hiit-ai-voice-enabled'
const VOICE_ID_KEY = 'hiit-ai-voice-id'
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'

type SpeakOptions = { once?: string }

type TTSContextValue = {
  speak: (text: string, options?: SpeakOptions) => Promise<void>
  // Prefetch-then-play: starts the fetch immediately, defers audio.play() to the next
  // user gesture if iOS rejects the immediate attempt. Use for auto-triggered greetings.
  // Returns a cleanup function for useEffect return.
  prepareAndPlay: (text: string, options?: SpeakOptions) => () => void
  cancel: () => void
  isSpeaking: boolean
  enabled: boolean
  sessionMuted: boolean
  setSessionMuted: (muted: boolean) => void
  effectivelyEnabled: boolean
}

const TTSContext = createContext<TTSContextValue | null>(null)

export function TTSProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const playedKeysRef = useRef<Set<string>>(new Set())

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sessionMuted, setSessionMuted] = useState(false)
  const [enabled, setEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(VOICE_ENABLED_KEY)
    return stored === null ? true : stored === 'true'
  })

  const effectivelyEnabled = enabled && !sessionMuted

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VOICE_ENABLED_KEY) setEnabled(e.newValue === 'true')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setIsSpeaking(false)
  }, [])

  // Stop audio if voice is disabled or muted mid-speech
  useEffect(() => {
    if (!effectivelyEnabled && isSpeaking) cancel()
  }, [effectivelyEnabled, isSpeaking, cancel])

  // iOS WKWebView audio context unlock — runs on mount within the app shell render
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    el.play().catch(() => {})
  }, [])

  // Normalise text before sending to TTS — HIIT reads as individual letters otherwise
  const normaliseTTSText = (text: string) =>
    text
      .replace(/\bHIIT\b/g, 'hit')
      .replace(/\bOk HIIT\b/gi, 'ok hit')
      .replace(/\bOkay HIIT\b/gi, 'okay hit')
      .substring(0, 500)

  // speak() — for user-triggered calls (Jarvis replies, greetings after a tap).
  // The `once` key is consumed ONLY after audio.play() resolves successfully,
  // so failures don't permanently block the next launch from retrying.
  const speak = useCallback(async (text: string, options?: SpeakOptions) => {
    if (options?.once && playedKeysRef.current.has(options.once)) return

    if (!effectivelyEnabled) return

    cancel()

    const abortController = new AbortController()
    abortRef.current = abortController

    setIsSpeaking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        toast.warning('Voice unavailable — please sign in again', { id: 'tts-auth' })
        setIsSpeaking(false)
        return
      }

      const voiceId = localStorage.getItem(VOICE_ID_KEY) || DEFAULT_VOICE_ID
      const ttsText = normaliseTTSText(text)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ text: ttsText, voiceId }),
          signal: abortController.signal,
        }
      )

      if (!res.ok) {
        toast.error('Voice unavailable right now', { id: 'tts-error' })
        setIsSpeaking(false)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = audioRef.current
      if (!audio) { setIsSpeaking(false); return }

      audio.src = url
      audio.load()

      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (abortRef.current === abortController) abortRef.current = null
        setIsSpeaking(false)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setIsSpeaking(false)
      }

      await audio.play()
      // Mark key consumed only after play() resolves — failures won't block future retries
      if (options?.once) playedKeysRef.current.add(options.once)
    } catch (err) {
      if ((err as Error).name === 'AbortError') { setIsSpeaking(false); return }
      console.error('[TTS] Unexpected error:', err)
      toast.error('Voice unavailable right now', { id: 'tts-error' })
      setIsSpeaking(false)
    }
  }, [effectivelyEnabled, cancel])

  // prepareAndPlay() — for auto-triggered greetings where we can't guarantee a fresh
  // gesture window. Starts the fetch immediately; if audio.play() is blocked by iOS
  // autoplay policy (NotAllowedError), registers a one-shot click/touchstart listener
  // so the cached blob plays on the user's next tap. Returns a cleanup function.
  const prepareAndPlay = useCallback((text: string, options?: SpeakOptions): () => void => {
    if (options?.once && playedKeysRef.current.has(options.once)) {
      return () => {}
    }

    if (!effectivelyEnabled) {
      return () => {}
    }

    let cancelled = false
    let pendingBlobUrl: string | null = null
    let gestureListener: (() => void) | null = null

    const cleanup = () => {
      cancelled = true
      if (pendingBlobUrl) {
        URL.revokeObjectURL(pendingBlobUrl)
        pendingBlobUrl = null
      }
      if (gestureListener) {
        document.removeEventListener('click', gestureListener)
        document.removeEventListener('touchstart', gestureListener)
        gestureListener = null
      }
    };

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token
        if (!accessToken || cancelled) return

        const voiceId = localStorage.getItem(VOICE_ID_KEY) || DEFAULT_VOICE_ID
        const ttsText = normaliseTTSText(text)

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ text: ttsText, voiceId }),
          }
        )

        if (cancelled || !res.ok) return

        const blob = await res.blob()
        if (cancelled) return

        pendingBlobUrl = URL.createObjectURL(blob)

        const audio = audioRef.current
        if (!audio || cancelled) return

        audio.src = pendingBlobUrl
        audio.load()

        try {
          await audio.play()
          // Immediate play succeeded (gesture window was still open)
          if (options?.once) playedKeysRef.current.add(options.once)
          setIsSpeaking(true)
          audio.onended = () => {
            if (pendingBlobUrl) { URL.revokeObjectURL(pendingBlobUrl); pendingBlobUrl = null }
            setIsSpeaking(false)
          }
        } catch (playErr) {
          // Gesture window has expired — defer to next user interaction
          if ((playErr as Error).name !== 'NotAllowedError') {
            console.error('[TTS] prepareAndPlay immediate play failed:', playErr)
            if (pendingBlobUrl) { URL.revokeObjectURL(pendingBlobUrl); pendingBlobUrl = null }
            return
          }

          gestureListener = () => {
            if (cancelled || !pendingBlobUrl) return
            const blobUrl = pendingBlobUrl
            audio.src = blobUrl
            audio.load()
            audio.play().then(() => {
              if (options?.once) playedKeysRef.current.add(options.once)
              setIsSpeaking(true)
              audio.onended = () => {
                URL.revokeObjectURL(blobUrl)
                pendingBlobUrl = null
                setIsSpeaking(false)
              }
            }).catch((deferredErr) => {
              console.error('[TTS] prepareAndPlay deferred play failed:', deferredErr)
              URL.revokeObjectURL(blobUrl)
              pendingBlobUrl = null
            })
            document.removeEventListener('click', gestureListener!)
            document.removeEventListener('touchstart', gestureListener!)
            gestureListener = null
          }

          document.addEventListener('click', gestureListener, { once: true })
          document.addEventListener('touchstart', gestureListener, { once: true })
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        console.error('[TTS] prepareAndPlay fetch error:', err)
      }
    })()

    return cleanup
  }, [effectivelyEnabled])

  return (
    <TTSContext.Provider value={{
      speak,
      prepareAndPlay,
      cancel,
      isSpeaking,
      enabled,
      sessionMuted,
      setSessionMuted,
      effectivelyEnabled,
    }}>
      {children}
      {/* Single audio element for the entire app — attached to DOM for iOS WKWebView compatibility */}
      <audio ref={audioRef} style={{ display: 'none' }} playsInline />
    </TTSContext.Provider>
  )
}

export function useTTS(): TTSContextValue {
  const ctx = useContext(TTSContext)
  if (!ctx) throw new Error('useTTS must be used inside TTSProvider')
  return ctx
}
