import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const VOICE_ENABLED_KEY = 'hiit-ai-voice-enabled'
const VOICE_ID_KEY = 'hiit-ai-voice-id'
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'

type SpeakOptions = { once?: string }

type TTSContextValue = {
  speak: (text: string, options?: SpeakOptions) => Promise<void>
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

  const speak = useCallback(async (text: string, options?: SpeakOptions) => {
    if (options?.once) {
      if (playedKeysRef.current.has(options.once)) return
      playedKeysRef.current.add(options.once)
    }

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

      // Normalise acronyms that TTS reads as individual letters
      const ttsText = text
        .replace(/\bHIIT\b/g, 'hit')
        .replace(/\bOk HIIT\b/gi, 'ok hit')
        .replace(/\bOkay HIIT\b/gi, 'okay hit')
        .substring(0, 500)

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
    } catch (err) {
      if ((err as Error).name === 'AbortError') { setIsSpeaking(false); return }
      console.error('[TTS] Unexpected error:', err)
      toast.error('Voice unavailable right now', { id: 'tts-error' })
      setIsSpeaking(false)
    }
  }, [effectivelyEnabled, cancel])

  return (
    <TTSContext.Provider value={{
      speak,
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
