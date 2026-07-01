import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Clock, Ruler, Heart, Zap, MapPin, FileText, Calendar, Share } from "lucide-react";
import { toast } from "sonner";
import { generateActivityShareCardBlob } from "@/lib/generate-activity-share-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSportConfig } from "@/lib/sports";
import { format, isToday, isYesterday } from "date-fns";

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

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [log, setLog] = useState<ActivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!log || isSharing) return;
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
        format: 'story',
        dateISO: log.started_at ?? undefined,
      });
      const fileName = `hiit-${(log.activity_type ?? 'workout').replace(/\s+/g, '-')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      const shareData: ShareData = {
        title: name,
        text: `Just finished ${name} on HIIT`,
        files: [file],
      };
      if (navigator.share && navigator.canShare?.(shareData)) {
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

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('activity_logs')
      .select('id, activity_type, started_at, ended_at, duration_seconds, distance_km, calories_burned, avg_heart_rate, intensity_level, route_start_address, route_end_address, notes, score_impact, status, source_platform, total_volume_kg')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else { setLog(data as ActivityLog); }
        setLoading(false);
      });
  }, [user, id]);

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, color: C.fg, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 12px',
        paddingTop: 12, flexShrink: 0, borderBottom: `1px solid ${C.line}`,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft size={18} color={C.fg} strokeWidth={2.2} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: C.fg, flex: 1 }}>{activityName}</h1>
        {log.score_impact != null && log.score_impact > 0 && (
          <div style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: C.primary }}>
            +{log.score_impact} pts
          </div>
        )}
        <button
          onClick={handleShare}
          disabled={isSharing}
          aria-label="Share activity"
          style={{
            width: 38, height: 38, borderRadius: 99,
            border: `1px solid ${C.line}`, background: C.card,
            cursor: isSharing ? 'default' : 'pointer', opacity: isSharing ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Share size={17} color={C.fg} strokeWidth={2.1} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 40 }}>

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
            {/* Duration — full width hero if present */}
            {log.duration_seconds != null && (
              <div style={{ background: `linear-gradient(180deg, rgba(249,115,22,0.10), rgba(249,115,22,0.03))`, border: '1px solid rgba(249,115,22,0.28)', borderRadius: 18, padding: '18px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 750, letterSpacing: 1.6, color: C.primary, fontFamily: C.mono, marginBottom: 4 }}>DURATION</div>
                <div style={{ fontSize: 48, fontWeight: 800, fontFamily: C.mono, color: C.fg, letterSpacing: -1.5, lineHeight: 1 }}>
                  {fmtDuration(log.duration_seconds)}
                </div>
              </div>
            )}

            {/* Secondary stats row */}
            {(log.distance_km != null || log.calories_burned != null || log.avg_heart_rate != null || log.intensity_level != null) && (
              <div style={{ display: 'flex', gap: 10 }}>
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
      </div>
    </div>
  );
};

export default ActivityDetail;
