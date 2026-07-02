import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Ruler, Heart, Zap, MapPin, FileText, Calendar, Share, Square, Smartphone, Moon, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { generateActivityShareCardBlob } from "@/lib/generate-activity-share-card";
import { ActivityShareCard } from "@/components/workout/ActivityShareCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSportConfig } from "@/lib/sports";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

const C = {
  bg:      '#0a0a0a',
  card:    '#141414',
  line:    '#262626',
  line2:   '#333333',
  fg:      '#fafafa',
  dim:     '#9a9a9a',
  dim2:    '#6f6f6f',
  primary: '#f97316',
  mono:    "'SFMono-Regular',ui-monospace,Menlo,monospace" as const,
};

interface ActivityLog {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  distance_km: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  intensity_level: number | null;
  route_start_address: string | null;
  route_end_address: string | null;
  notes: string | null;
  score_impact: number | null;
  status: string | null;
  source_platform: string | null;
  total_volume_kg: number | null;
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, 'h:mm a')}`;
  return format(d, 'EEE d MMM · h:mm a');
}

function fmtActivityType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

function intensityLabel(level: number): string {
  if (level <= 2) return 'Light';
  if (level <= 4) return 'Moderate';
  if (level <= 6) return 'Vigorous';
  return 'Maximum';
}

function intensityColor(level: number): string {
  if (level <= 2) return '#4ade80';
  if (level <= 4) return '#facc15';
  if (level <= 6) return '#f97316';
  return '#ef4444';
}

// ── Building blocks ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.fg, fontFamily: C.mono, letterSpacing: -0.3 }}>{value}</span>
          {unit && <span style={{ fontSize: 10, fontWeight: 600, color: C.dim2 }}>{unit}</span>}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.dim2, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function Segment({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
        borderRadius: 999, border: 'none', cursor: 'pointer',
        background: active ? '#2a2a2a' : 'transparent',
        color: active ? C.fg : C.dim, fontWeight: 600, fontSize: 13,
        WebkitTapHighlightColor: 'transparent', transition: 'background .15s, color .15s',
        whiteSpace: 'nowrap',
      }}
    >
      {icon} {label}
    </button>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [log, setLog] = useState<ActivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Composer state
  const [cardFormat, setCardFormat] = useState<'square' | 'story'>('square');
  const [cardBg, setCardBg] = useState<'white' | 'photo'>('white');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('activity_logs')
      .select('id, activity_type, started_at, ended_at, duration_seconds, distance_km, calories_burned, avg_heart_rate, intensity_level, route_start_address, route_end_address, notes, score_impact, status, source_platform, total_volume_kg')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        setLog(data as ActivityLog);
        setLoading(false);
      });
  }, [id, user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (!log || isSharing) return;
    if (cardBg === 'photo' && !photoDataUrl) {
      toast.error('Add a photo first');
      return;
    }
    setIsSharing(true);
    const name = fmtActivityType(log.activity_type);
    try {
      const blob = await generateActivityShareCardBlob({
        data: {
          activityType: log.activity_type,
          durationSeconds: log.duration_seconds ?? 0,
          calories: log.calories_burned ?? null,
          distanceKm: log.distance_km ?? null,
          avgHR: log.avg_heart_rate ?? null,
          volumeKg: log.total_volume_kg ?? null,
        },
        format: cardFormat,
        dateISO: log.started_at ?? undefined,
        bg: cardBg,
        photoDataUrl,
      });
      const fileName = `hiit-${(log.activity_type ?? 'workout').replace(/\s+/g, '-')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      const shareData: ShareData = {
        title: name,
        text: `Just finished ${name} on HIIT`,
        files: [file],
      };
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        await navigator.share({ title: name, text: shareData.text });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[ActivityDetail] share failed:', err);
        toast.error('Could not create share image — try again in a moment.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.primary}`, borderTopColor: 'transparent', borderRadius: 99 }} className="animate-spin" />
      </div>
    );
  }

  if (notFound || !log) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: C.fg }}>
        <p style={{ fontSize: 15, color: C.dim }}>Activity not found</p>
        <button onClick={() => navigate(-1)} style={{ background: C.primary, border: 'none', borderRadius: 12, padding: '10px 24px', color: '#0a0a0a', fontWeight: 700, cursor: 'pointer' }}>
          Go back
        </button>
      </div>
    );
  }

  const sport = getSportConfig(log.activity_type);
  const SportIcon = sport?.icon;
  const activityName = fmtActivityType(log.activity_type);
  const hasStats = log.duration_seconds || log.distance_km || log.calories_burned || log.avg_heart_rate;
  const hasRoute = log.route_start_address || log.route_end_address;

  // Preview at ~35–40% scale so it fits mobile without dominating.
  const BASE_W = 1080;
  const BASE_H = cardFormat === 'square' ? 1080 : 1920;
  const previewW = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.78, 340) : 340;
  const scale = previewW / BASE_W;
  const previewH = BASE_H * scale;

  const shareData = {
    activityType: log.activity_type,
    durationSeconds: log.duration_seconds ?? 0,
    calories: log.calories_burned ?? null,
    distanceKm: log.distance_km ?? null,
    avgHR: log.avg_heart_rate ?? null,
    volumeKg: log.total_volume_kg ?? null,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, color: C.fg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 12px',
        paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)', flexShrink: 0,
        borderBottom: `1px solid ${C.line}`,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft size={18} color={C.fg} strokeWidth={2.2} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: C.fg, flex: 1 }}>Share workout</h1>
        {log.score_impact != null && log.score_impact > 0 && (
          <div style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: C.primary }}>
            +{log.score_impact} pts
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Controls row — format + background toggles */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 2, padding: 3, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999 }}>
              <Segment
                active={cardFormat === 'square'}
                onClick={() => setCardFormat('square')}
                icon={<Square size={14} color={cardFormat === 'square' ? C.fg : C.dim} strokeWidth={2.1} />}
                label="Square"
              />
              <Segment
                active={cardFormat === 'story'}
                onClick={() => setCardFormat('story')}
                icon={<Smartphone size={14} color={cardFormat === 'story' ? C.fg : C.dim} strokeWidth={2.1} />}
                label="Story"
              />
            </div>
            <div style={{ display: 'flex', gap: 2, padding: 3, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999 }}>
              <Segment
                active={cardBg === 'white'}
                onClick={() => setCardBg('white')}
                icon={<Moon size={14} color={cardBg === 'white' ? C.fg : C.dim} strokeWidth={2.1} />}
                label="Clean"
              />
              <Segment
                active={cardBg === 'photo'}
                onClick={() => setCardBg('photo')}
                icon={<ImageIcon size={14} color={cardBg === 'photo' ? C.fg : C.dim} strokeWidth={2.1} />}
                label="Photo"
              />
            </div>
          </div>

          {/* Photo picker — only when Photo is on */}
          {cardBg === 'photo' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 16px',
                  borderRadius: 10, border: `1px solid ${C.line}`, cursor: 'pointer',
                  background: C.card, fontSize: 13, fontWeight: 600, color: C.dim,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <ImageIcon size={14} color={C.dim} strokeWidth={2} />
                {photoDataUrl ? 'Change photo' : 'Add your photo'}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </div>
          )}

          {/* Preview — same source as what handleShare snapshots */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: previewW, height: previewH, borderRadius: 20, overflow: 'hidden', position: 'relative',
              boxShadow: '0 22px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
              transition: 'width .3s cubic-bezier(.4,0,.2,1), height .3s cubic-bezier(.4,0,.2,1)',
              // If photo bg is selected but no photo picked, show a hint tile.
              background: cardBg === 'photo' && !photoDataUrl
                ? 'repeating-linear-gradient(45deg, #1a1a1a 0 12px, #141414 12px 24px)'
                : '#000',
            }}>
              <div style={{
                width: BASE_W, height: BASE_H,
                transform: `scale(${scale})`, transformOrigin: 'top left',
              }}>
                <ActivityShareCard
                  data={shareData}
                  format={cardFormat}
                  dateISO={log.started_at ?? undefined}
                  bg={cardBg}
                  photoDataUrl={photoDataUrl}
                />
              </div>
            </div>
            <span style={{ fontSize: 12, color: C.dim2, letterSpacing: '0.04em' }}>
              {cardFormat === 'square' ? '1080 × 1080 · Feed post' : '1080 × 1920 · Story'}
            </span>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            style={{
              width: '100%', height: 54, borderRadius: 16, border: 'none',
              cursor: isSharing ? 'default' : 'pointer', marginTop: 4,
              background: isSharing ? '#3a3a3a' : `linear-gradient(135deg, ${C.primary}, #ea580c)`,
              color: '#1a0d04', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Share size={17} strokeWidth={2.2} />
            {isSharing ? 'Preparing…' : 'Share'}
          </button>

          {/* Expandable details — old ActivityDetail content lives here */}
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', marginTop: 14,
              background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
              cursor: 'pointer', color: C.fg, fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>Activity details</span>
            {detailsOpen
              ? <ChevronUp size={17} color={C.dim} strokeWidth={2.2} />
              : <ChevronDown size={17} color={C.dim} strokeWidth={2.2} />}
          </button>

          {detailsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Hero — sport icon + date */}
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {SportIcon
                    ? <SportIcon size={26} color={C.primary} strokeWidth={1.8} />
                    : <Zap size={26} color={C.primary} strokeWidth={1.8} />}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 750, color: C.fg, marginBottom: 4 }}>{activityName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.dim }}>
                    <Calendar size={13} color={C.dim2} strokeWidth={2} />
                    {fmtDate(log.started_at)}
                  </div>
                  {log.ended_at && log.duration_seconds == null && (
                    <div style={{ fontSize: 12, color: C.dim2, marginTop: 2 }}>
                      Ended {format(new Date(log.ended_at), 'h:mm a')}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              {hasStats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {log.duration_seconds != null && (
                    <div style={{ background: `linear-gradient(180deg, rgba(249,115,22,0.10), rgba(249,115,22,0.03))`, border: '1px solid rgba(249,115,22,0.28)', borderRadius: 18, padding: '18px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 750, letterSpacing: 1.6, color: C.primary, fontFamily: C.mono, marginBottom: 4 }}>DURATION</div>
                      <div style={{ fontSize: 48, fontWeight: 800, fontFamily: C.mono, color: C.fg, letterSpacing: -1.5, lineHeight: 1 }}>
                        {fmtDuration(log.duration_seconds)}
                      </div>
                    </div>
                  )}
                  {(log.distance_km != null || log.calories_burned != null || log.avg_heart_rate != null || log.intensity_level != null) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {log.distance_km != null && (
                        <StatCard
                          icon={<Ruler size={15} color={C.primary} strokeWidth={2} />}
                          label="Distance"
                          value={Number(log.distance_km).toFixed(2)}
                          unit="km"
                        />
                      )}
                      {log.calories_burned != null && (
                        <StatCard
                          icon={<Flame size={15} color={C.primary} strokeWidth={2} />}
                          label="Calories"
                          value={log.calories_burned.toLocaleString()}
                          unit="kcal"
                        />
                      )}
                      {log.avg_heart_rate != null && (
                        <StatCard
                          icon={<Heart size={15} color={C.primary} strokeWidth={2} />}
                          label="Avg HR"
                          value={log.avg_heart_rate.toString()}
                          unit="bpm"
                        />
                      )}
                      {log.intensity_level != null && (
                        <StatCard
                          icon={<Zap size={15} color={intensityColor(log.intensity_level)} strokeWidth={2} />}
                          label="Intensity"
                          value={intensityLabel(log.intensity_level)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Route addresses */}
              {hasRoute && (
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>
                  {log.route_start_address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: log.route_end_address ? `1px solid ${C.line}` : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 99, background: C.primary, flexShrink: 0, marginTop: 5 }} />
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.dim2, marginBottom: 2 }}>Start</div>
                        <div style={{ fontSize: 13, color: C.fg }}>{log.route_start_address}</div>
                      </div>
                    </div>
                  )}
                  {log.route_end_address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
                      <MapPin size={8} color={C.dim2} strokeWidth={2.5} style={{ marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.dim2, marginBottom: 2 }}>End</div>
                        <div style={{ fontSize: 13, color: C.fg }}>{log.route_end_address}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {log.notes && (
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <FileText size={14} color={C.dim2} strokeWidth={2} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.dim2 }}>Notes</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.5 }}>{log.notes}</p>
                </div>
              )}

              {/* Source */}
              {log.source_platform && (
                <p style={{ fontSize: 11, color: C.dim2, textAlign: 'center' }}>
                  Synced from {log.source_platform.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
