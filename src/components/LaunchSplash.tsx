import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import heroClip from '@/assets/hiit-hero-clip.mp4'

// Full-bleed launch splash — the very first thing an unauthed new user sees
// before hitting sign-in / sign-up. Mirrors the "New User Splash A" design
// from claude_design (project 019e018c…). The hero clip loops behind a scrim
// with brand mark, headline, primary CTA (create account), and secondary
// sign-in text. All copy pins to the "free while we're new" positioning.

const HIIT_ORANGE = 'hsl(24 95% 54%)'
const HIIT_ORANGE_2 = 'hsl(15 90% 49%)'

export function LaunchSplash() {
  const navigate = useNavigate()

  const goSignup = () => {
    localStorage.setItem('hiit_onboarding_complete', 'true')
    navigate('/auth?view=signup')
  }
  const goSignin = () => {
    localStorage.setItem('hiit_onboarding_complete', 'true')
    navigate('/auth?view=signin')
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: '#0c0b0a', color: '#fafafa',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Hero video — full bleed, slowed to 0.5x for a moodier feel */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        ref={(el) => { if (el) el.playbackRate = 0.5 }}
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: 'translateY(-20%)',
          background: '#14110e',
        }}
      >
        <source src={heroClip} type="video/mp4" />
      </video>

      {/* Bottom scrim — fades video to background so the copy stays legible */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3,
          height: '78%',
          background: 'linear-gradient(180deg, transparent, hsl(0 0% 3% / 0.55) 38%, #0a0908 86%)',
          pointerEvents: 'none',
        }}
      />

      {/* Brand row — top-left, respects the notch safe-area */}
      <div
        style={{
          position: 'relative', zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/hiit-logo-orange.png"
            alt="HIIT"
            style={{
              width: 40, height: 40, objectFit: 'contain',
              filter: 'drop-shadow(0 0 20px hsl(24 95% 50% / 0.5))',
            }}
          />
          <div style={{
            fontSize: 17, fontWeight: 800, letterSpacing: '-0.4px', color: '#fff',
          }}>HIIT</div>
        </div>
      </div>

      {/* Content — pinned to the bottom above the safe-area home indicator */}
      <div
        style={{
          position: 'relative', zIndex: 5,
          marginTop: 'auto',
          padding: '0 24px',
          paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 30px)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: HIIT_ORANGE,
        }}>
          Your summer starts now
        </div>
        <h1 style={{
          fontSize: 40, lineHeight: 1.02, fontWeight: 800,
          letterSpacing: '-1.4px', color: '#fff',
          margin: '16px 0 0',
        }}>
          Built &amp; ready.<br />
          Free <em style={{ fontStyle: 'normal', color: HIIT_ORANGE }}>while we're new.</em>
        </h1>
        <p style={{
          fontSize: 14.5, lineHeight: 1.5, color: 'hsl(0 0% 100% / 0.68)',
          marginTop: 14, fontWeight: 400, maxWidth: 320,
        }}>
          The whole app is live — we're just bringing on our first users. Every
          premium feature is free while we're new. Jump in, train, and help us shape it.
        </p>

        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            onClick={goSignup}
            style={{
              width: '100%', height: 54, border: 0, borderRadius: 15,
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${HIIT_ORANGE}, ${HIIT_ORANGE_2})`,
              color: '#fff', fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 10px 30px -8px hsl(24 95% 50% / 0.6)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ArrowRight size={17} strokeWidth={2.4} />
            Create your free account
          </button>
          <button
            onClick={goSignin}
            style={{
              background: 'transparent', border: 0, padding: 0,
              cursor: 'pointer',
              textAlign: 'center', fontSize: 13.5, color: 'hsl(0 0% 100% / 0.58)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Already in? <b style={{ color: '#fff', fontWeight: 700 }}>Sign in</b>
          </button>
          <div style={{
            fontSize: 11, lineHeight: 1.5, color: 'hsl(0 0% 100% / 0.42)', textAlign: 'center',
          }}>
            Free while we're new · no card required
          </div>
        </div>
      </div>
    </div>
  )
}
