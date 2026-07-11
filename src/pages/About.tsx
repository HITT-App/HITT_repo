import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Globe, FileText, Shield, Copy, Check,
  ExternalLink, Building2, Star, Share2, ChevronRight,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Share } from '@capacitor/share'
import { toast } from 'sonner'
import hiitLogo from '@/assets/hiit-logo.webp'

const CONTACT_EMAIL = 'casey@hiituk.com'
const WEBSITE = 'https://www.hiituk.com'
const BUILDER_URL = 'https://shamalama.co.uk'
const PLAY_APP_URL = 'https://play.google.com/store/apps/details?id=com.hiitfitness.app'
const APP_STORE_URL = 'https://apps.apple.com/app/hiit-fitness/id0000000000' // update with real ID once assigned

export default function About() {
  const navigate = useNavigate()
  const [appVersion, setAppVersion] = useState<string>('1.0.2')
  const [appBuild, setAppBuild] = useState<string>('—')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Read the native build number for support context. Falls back to
    // package.json / env vars on non-native (web) where App.getInfo()
    // isn't implemented.
    if (!Capacitor.isNativePlatform()) return
    CapApp.getInfo()
      .then((info) => {
        setAppVersion(info.version || '1.0.1')
        setAppBuild(info.build || '—')
      })
      .catch(() => { /* leave defaults */ })
  }, [])

  const versionLine = `${appVersion} · Build ${appBuild}`

  const copyVersion = async () => {
    try {
      await navigator.clipboard.writeText(`HIIT Fitness ${versionLine}`)
      setCopied(true)
      toast.success('Copied — paste into your support message')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Some WebViews don't expose clipboard write. Non-fatal.
    }
  }

  const openExternal = async (url: string) => {
    try { await CapApp.openUrl({ url }) } catch { window.open(url, '_blank') }
  }

  const emailSupport = () => {
    // Pre-fill subject and body with app + version so triage is easier.
    const subject = encodeURIComponent(`HIIT Fitness ${versionLine} — support`)
    const body = encodeURIComponent(
      `Hi Casey,\n\n\n\n— Sent from HIIT Fitness ${versionLine}`,
    )
    openExternal(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`)
  }

  const rateApp = () => {
    const platform = Capacitor.getPlatform()
    if (platform === 'android') return openExternal(PLAY_APP_URL)
    if (platform === 'ios') return openExternal(APP_STORE_URL)
    openExternal(WEBSITE)
  }

  const shareApp = async () => {
    const platform = Capacitor.getPlatform()
    const url = platform === 'android' ? PLAY_APP_URL : APP_STORE_URL
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: 'HIIT Fitness',
          text: 'Try HIIT Fitness — HIIT workouts, meals, sleep and community, coached by AI.',
          url,
          dialogTitle: 'Share HIIT',
        })
      } catch { /* user cancelled */ }
    } else if (navigator.share) {
      navigator.share({ title: 'HIIT Fitness', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
      toast.success('Link copied')
    }
  }

  const Row = ({
    icon: Icon, label, value, onClick, external,
  }: {
    icon: React.ElementType
    label: string
    value?: string
    onClick: () => void
    external?: boolean
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-secondary rounded-xl active:opacity-70 transition-opacity"
    >
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {value && <p className="text-xs text-muted-foreground truncate">{value}</p>}
      </div>
      {external
        ? <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
        : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </button>
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header
        className="sticky top-0 z-20 shrink-0 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)' }}
      >
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">About HIIT Fitness</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
          {/* Brand + version */}
          <div className="flex flex-col items-center text-center gap-3">
            <img src={hiitLogo} alt="HIIT Fitness" className="w-20 h-20 rounded-2xl" />
            <div>
              <h2 className="text-lg font-bold">HIIT Fitness</h2>
              <button
                onClick={copyVersion}
                className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy version and build number"
              >
                <span>{versionLine}</span>
                {copied
                  ? <Check className="w-3 h-3" />
                  : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Contact */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Contact</h3>
            <Row icon={Mail}   label="Email"   value={CONTACT_EMAIL}  onClick={emailSupport}                external />
            <Row icon={Globe}  label="Website" value="hiituk.com"     onClick={() => openExternal(WEBSITE)} external />
          </section>

          {/* Legal */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Legal</h3>
            <Row icon={FileText} label="Terms of Service" onClick={() => navigate('/terms')} />
            <Row icon={Shield}   label="Privacy Policy"   onClick={() => navigate('/privacy')} />
          </section>

          {/* Company */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Company</h3>
            <div className="p-4 bg-secondary rounded-xl flex items-start gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium">HIITFITNESS LTD</p>
                <p className="text-xs text-muted-foreground">Registered in England &amp; Wales</p>
                <p className="text-xs text-muted-foreground">Company number 16893850</p>
              </div>
            </div>
          </section>

          {/* Rate + Share */}
          <section className="grid grid-cols-2 gap-2">
            <button
              onClick={rateApp}
              className="flex flex-col items-center justify-center gap-1 p-4 bg-secondary rounded-xl active:opacity-70 transition-opacity"
            >
              <Star className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Rate HIIT</span>
            </button>
            <button
              onClick={shareApp}
              className="flex flex-col items-center justify-center gap-1 p-4 bg-secondary rounded-xl active:opacity-70 transition-opacity"
            >
              <Share2 className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium">Share HIIT</span>
            </button>
          </section>

          {/* Built by */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Built by</h3>
            <button
              onClick={() => openExternal(BUILDER_URL)}
              className="w-full flex items-center gap-3 p-4 bg-secondary rounded-xl active:opacity-70 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">S</div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Shamalama</p>
                <p className="text-xs text-muted-foreground">shamalama.co.uk</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
          </section>

          <p className="text-center text-xs text-muted-foreground pb-8">
            © {new Date().getFullYear()} HIITFITNESS LTD. Made with love in the United Kingdom.
          </p>
        </div>
      </div>
    </div>
  )
}
