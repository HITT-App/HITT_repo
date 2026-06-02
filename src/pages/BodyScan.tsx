import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Camera, Upload, Ruler, TrendingUp, Loader2, X, RotateCcw, Sparkles, ChevronRight, User, SwitchCamera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type MetricType } from "@/hooks/useHealthMetrics";
import { useAuth } from "@/hooks/useAuth";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

interface BodyAnalysis {
  estimatedBodyFat: number;
  bodyType: string;
  muscleDevelopment: {
    upper_body: string;
    core: string;
    lower_body: string;
  };
  visibleMuscleGroups: string[];
  bodySymmetry: string;
  posture: string;
  keyObservations: string[];
  recommendations: string[];
  confidenceLevel: string;
}

const MEASUREMENT_FIELDS = [
  { key: "chest", label: "Chest", unit: "cm", icon: "💪" },
  { key: "waist", label: "Waist", unit: "cm", icon: "📏" },
  { key: "hips", label: "Hips", unit: "cm", icon: "📐" },
  { key: "bicep_left", label: "Left Bicep", unit: "cm", icon: "💪" },
  { key: "bicep_right", label: "Right Bicep", unit: "cm", icon: "💪" },
  { key: "thigh_left", label: "Left Thigh", unit: "cm", icon: "🦵" },
  { key: "thigh_right", label: "Right Thigh", unit: "cm", icon: "🦵" },
  { key: "neck", label: "Neck", unit: "cm", icon: "📏" },
];

const POSE_GUIDES = [
  { label: "Front", instruction: "Stand facing the camera, arms slightly away from body" },
  { label: "Side", instruction: "Stand sideways, arms relaxed at your side" },
  { label: "Back", instruction: "Stand with back to camera, arms slightly away" },
];

const BodyScan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logMetric } = useHealthMetrics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");
  const [poseIndex, setPoseIndex] = useState(0);

  // Progress data
  const [progressData, setProgressData] = useState<any[]>([]);
  const [previousScans, setPreviousScans] = useState<any[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompare, setSelectedCompare] = useState<string | null>(null);

  // Load historical body fat data for trends
  useEffect(() => {
    if (!user) return;
    const loadProgress = async () => {
      const { data } = await supabase
        .from("health_metrics")
        .select("value, recorded_at, notes")
        .eq("user_id", user.id)
        .eq("metric_type", "body_fat")
        .order("recorded_at", { ascending: true })
        .limit(30);
      if (data) {
        setProgressData(data.map(d => ({
          date: format(new Date(d.recorded_at), "MMM d"),
          bodyFat: d.value,
          notes: d.notes,
        })));
        setPreviousScans(data);
      }
    };
    loadProgress();
  }, [user]);

  // Wire stream to video element whenever the stream changes — avoids
  // setTimeout races where the video element isn't ready at the arbitrary delay.
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const openCamera = useCallback(async (mode?: "user" | "environment") => {
    const selectedMode = mode ?? facingMode;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: selectedMode, width: { ideal: 1280 }, height: { ideal: 1920 } }
      });
      setCameraReady(false);
      setIsCameraOpen(true);
      setStream(mediaStream);
    } catch {
      toast.error("Could not access camera. Please check permissions.");
    }
  }, [facingMode]);

  const flipCamera = useCallback(async () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    setCameraReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 1280 }, height: { ideal: 1920 } }
      });
      setStream(mediaStream);
    } catch {
      toast.error("Could not switch camera.");
    }
  }, [facingMode, stream]);

  const resizeToDataUrl = (srcCanvas: HTMLCanvasElement, maxPx = 900): string => {
    const { width, height } = srcCanvas;
    const scale = Math.min(1, maxPx / Math.max(width, height));
    const out = document.createElement("canvas");
    out.width = Math.round(width * scale);
    out.height = Math.round(height * scale);
    out.getContext("2d")?.drawImage(srcCanvas, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", 0.8);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      toast.error("Camera not ready yet — wait a moment and try again.");
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setImagePreview(resizeToDataUrl(canvas));
    closeCamera();
  }, []);

  const closeCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  }, [stream]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        setImagePreview(resizeToDataUrl(canvas));
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => toast.error("Failed to read image file.");
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const analyzeBody = async () => {
    if (!imagePreview || !user) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      // Fetch last 30 days of scheduled workouts and summarise by category
      const since = subDays(new Date(), 30).toISOString();
      const { data: workoutRows } = await supabase
        .from("scheduled_workouts")
        .select("workout_category")
        .eq("user_id", user.id)
        .gte("scheduled_date", since);

      let workoutSummary = "No workout data available.";
      if (workoutRows && workoutRows.length > 0) {
        const counts: Record<string, number> = {};
        for (const row of workoutRows) {
          const cat = (row.workout_category || "uncategorised").toLowerCase();
          counts[cat] = (counts[cat] ?? 0) + 1;
        }
        const parts = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, n]) => `${n} ${cat} session${n !== 1 ? "s" : ""}`);
        workoutSummary = `In the last 30 days: ${parts.join(", ")}.`;
      }

      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data?.session?.access_token;
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-body`;
      const rawRes = await fetch(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: imagePreview, workoutSummary }),
      });
      let json: any;
      try {
        json = await rawRes.json();
      } catch {
        throw new Error(`Analysis failed (${rawRes.status}) — try again`);
      }
      if (!rawRes.ok) throw new Error(json?.error || `Analysis failed (${rawRes.status})`);
      setAnalysis(json);
      // Persist a summary so the AI coach can reference scan results
      const summary = [
        json.bodyType ? `Body type: ${json.bodyType}` : '',
        json.estimatedBodyFat ? `Estimated body fat: ${json.estimatedBodyFat}%` : '',
        json.muscleDevelopment ? `Muscle development — upper: ${json.muscleDevelopment.upper_body}, core: ${json.muscleDevelopment.core}, lower: ${json.muscleDevelopment.lower_body}` : '',
        ...(json.keyObservations ?? []).slice(0, 2),
        ...(json.recommendations ?? []).slice(0, 2),
      ].filter(Boolean).join('\n');
      localStorage.setItem('hiit-body-scan-summary', summary);
      localStorage.setItem('hiit-body-scan-at', Date.now().toString());
      // Invalidate health profile cache so next AI message picks up the scan
      localStorage.removeItem('hiit-health-profile-at');
      toast.success("Body analysis complete!");
    } catch (err: any) {
      toast.error(err.message || "Analysis failed. Try a clearer photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveMeasurements = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const entries = Object.entries(measurements).filter(([, v]) => v && parseFloat(v) > 0);
      if (entries.length === 0 && !analysis?.estimatedBodyFat) {
        toast.error("Please enter at least one measurement or run a scan.");
        setIsSaving(false);
        return;
      }
      for (const [key, value] of entries) {
        await logMetric.mutateAsync({
          metric_type: `body_${key}` as MetricType,
          value: parseFloat(value),
          unit: "cm",
        });
      }
      if (analysis?.estimatedBodyFat) {
        await logMetric.mutateAsync({
          metric_type: "body_fat",
          value: analysis.estimatedBodyFat,
          unit: "%",
          notes: `AI estimate (${analysis.confidenceLevel} confidence)`,
        });
      }
      if (analysis) {
        const { error: scanError } = await (supabase as any).from("body_scans").insert({
          user_id: user.id,
          estimated_body_fat: analysis.estimatedBodyFat ?? null,
          confidence_level: analysis.confidenceLevel,
          analysis,
        });
        if (scanError) throw scanError;
      }
      toast.success("Measurements saved!");
      setMeasurements({});
    } catch {
      toast.error("Failed to save measurements.");
    } finally {
      setIsSaving(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setAnalysis(null);
  };

  const devLabel = (val: string) =>
    val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Body Scan</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan" className="gap-1 text-xs">
              <Camera className="w-3.5 h-3.5" /> AI Scan
            </TabsTrigger>
            <TabsTrigger value="measurements" className="gap-1 text-xs">
              <Ruler className="w-3.5 h-3.5" /> Measure
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-1 text-xs">
              <TrendingUp className="w-3.5 h-3.5" /> Progress
            </TabsTrigger>
          </TabsList>

          {/* AI Scan Tab */}
          <TabsContent value="scan" className="space-y-4 mt-4">
            {isCameraOpen ? (
              <Card className="relative overflow-hidden rounded-2xl bg-black">
                <video ref={videoRef} autoPlay playsInline muted onCanPlay={() => setCameraReady(true)}
                  className={`w-full aspect-[3/4] object-cover${facingMode === "user" ? " scale-x-[-1]" : ""}`} />
                <canvas ref={canvasRef} className="hidden" />

                {/* Pose Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Body silhouette guide */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-72 border-2 border-dashed border-white/40 rounded-[40%_40%_30%_30%]" />
                  </div>
                  {/* Pose instruction */}
                  <div className="absolute top-4 inset-x-4">
                    <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                      <p className="text-white text-xs font-medium">{POSE_GUIDES[poseIndex].label} Pose</p>
                      <p className="text-white/70 text-[10px] mt-0.5">{POSE_GUIDES[poseIndex].instruction}</p>
                    </div>
                  </div>
                  {/* Pose dots */}
                  <div className="absolute top-20 inset-x-0 flex justify-center gap-2">
                    {POSE_GUIDES.map((_, i) => (
                      <button
                        key={i}
                        className={`w-2 h-2 rounded-full pointer-events-auto ${i === poseIndex ? 'bg-primary' : 'bg-white/40'}`}
                        onClick={() => setPoseIndex(i)}
                      />
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={closeCamera} className="rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <X className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={flipCamera} className="rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <SwitchCamera className="w-5 h-5" />
                  </Button>
                  <button onClick={capturePhoto} disabled={!cameraReady} className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="w-12 h-12 rounded-full bg-white" />
                  </button>
                  <Button variant="outline" size="icon" onClick={() => setPoseIndex((poseIndex + 1) % POSE_GUIDES.length)} className="rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ) : imagePreview ? (
              <Card className="relative overflow-hidden rounded-2xl">
                <img src={imagePreview} alt="Body scan" className="w-full aspect-[3/4] object-cover" />
                <button onClick={clearImage} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </Card>
            ) : (
              <Card className="rounded-2xl border-dashed border-2 border-muted-foreground/30 bg-secondary/50">
                <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Take or upload a body photo</p>
                    <p className="text-sm text-muted-foreground mt-1">AI will estimate body composition and provide feedback</p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <Button onClick={openCamera} className="flex-1 gap-2" variant="default">
                      <Camera className="w-4 h-4" /> Camera
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2" variant="outline">
                      <Upload className="w-4 h-4" /> Gallery
                    </Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </div>
              </Card>
            )}

            {imagePreview && !analysis && (
              <Button onClick={analyzeBody} disabled={isAnalyzing} className="w-full gap-2 h-12 text-base">
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Analyze Body Composition</>
                )}
              </Button>
            )}

            {/* Analysis Results */}
            {analysis && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">Estimated Body Fat</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {analysis.confidenceLevel} confidence
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-foreground">{analysis.estimatedBodyFat}%</span>
                    <span className="text-muted-foreground text-sm mb-1">body fat</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(analysis.estimatedBodyFat * 2, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Athletic</span><span>Average</span><span>High</span>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 rounded-2xl text-center">
                    <p className="text-xs text-muted-foreground mb-1">Body Type</p>
                    <p className="font-semibold text-foreground capitalize">{analysis.bodyType}</p>
                  </Card>
                  <Card className="p-4 rounded-2xl text-center">
                    <p className="text-xs text-muted-foreground mb-1">Posture</p>
                    <p className="font-semibold text-foreground capitalize">{devLabel(analysis.posture)}</p>
                  </Card>
                </div>

                <Card className="p-5 rounded-2xl">
                  <h3 className="font-semibold text-foreground mb-3">Muscle Development</h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.muscleDevelopment).map(([area, level]) => (
                      <div key={area} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{area.replace(/_/g, " ")}</span>
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                          level === "well_developed" ? "bg-green-500/10 text-green-600" :
                          level === "developed" ? "bg-blue-500/10 text-blue-600" :
                          level === "average" ? "bg-yellow-500/10 text-yellow-600" :
                          "bg-red-500/10 text-red-600"
                        }`}>{devLabel(level)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 rounded-2xl">
                  <h3 className="font-semibold text-foreground mb-3">🎯 AI Recommendations</h3>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 rounded-2xl">
                  <h3 className="font-semibold text-foreground mb-3">Key Observations</h3>
                  <ul className="space-y-2">
                    {analysis.keyObservations.map((obs, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>{obs}
                      </li>
                    ))}
                  </ul>
                </Card>

                <Button onClick={saveMeasurements} disabled={isSaving} className="w-full gap-2 h-12">
                  {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : "Save Scan Results"}
                </Button>

                <div className="pb-24 pt-1">
                  <p className="text-xs text-center text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2">
                    ⚠️ AI estimates are approximations, not medical assessments.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Measurements Tab */}
          <TabsContent value="measurements" className="space-y-4 mt-4">
            <Card className="p-5 rounded-2xl">
              <h3 className="font-semibold text-foreground mb-1">Body Measurements</h3>
              <p className="text-sm text-muted-foreground mb-4">Track your measurements over time</p>
              <div className="grid grid-cols-2 gap-4">
                {MEASUREMENT_FIELDS.map(field => (
                  <div key={field.key}>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{field.icon}</span> {field.label} ({field.unit})
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={measurements[field.key] || ""}
                      onChange={e => setMeasurements(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </Card>
            <Button onClick={saveMeasurements} disabled={isSaving} className="w-full gap-2 h-12 text-base">
              {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : "Save Measurements"}
            </Button>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4 mt-4">
            {/* Body Fat Trend Chart */}
            <Card className="p-5 rounded-2xl">
              <h3 className="font-semibold text-foreground mb-1">Body Fat % Trend</h3>
              <p className="text-xs text-muted-foreground mb-4">Your body fat over time</p>
              {progressData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="bodyFat" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Complete at least 2 scans to see trends</p>
                  <Button variant="link" className="mt-2" onClick={() => setActiveTab("scan")}>
                    Start a scan →
                  </Button>
                </div>
              )}
            </Card>

            {/* Before/After Comparison */}
            <Card className="p-5 rounded-2xl">
              <h3 className="font-semibold text-foreground mb-1">Progress Comparison</h3>
              <p className="text-xs text-muted-foreground mb-4">Compare your scans side by side</p>
              {previousScans.length >= 2 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">First Scan</p>
                      <div className="bg-secondary rounded-xl p-3">
                        <p className="text-2xl font-bold text-foreground">{previousScans[0].value}%</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(previousScans[0].recorded_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Latest Scan</p>
                      <div className="bg-primary/10 rounded-xl p-3">
                        <p className="text-2xl font-bold text-foreground">{previousScans[previousScans.length - 1].value}%</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(previousScans[previousScans.length - 1].recorded_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const diff = previousScans[previousScans.length - 1].value - previousScans[0].value;
                    return (
                      <div className={`text-center p-2 rounded-xl ${diff < 0 ? 'bg-green-500/10' : diff > 0 ? 'bg-red-500/10' : 'bg-secondary'}`}>
                        <p className={`text-sm font-semibold ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {diff < 0 ? `↓ ${Math.abs(diff).toFixed(1)}% decrease` : diff > 0 ? `↑ ${diff.toFixed(1)}% increase` : 'No change'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <User className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Need at least 2 scans to compare</p>
                </div>
              )}
            </Card>

            {/* Scan History */}
            {previousScans.length > 0 && (
              <Card className="p-5 rounded-2xl">
                <h3 className="font-semibold text-foreground mb-3">Scan History</h3>
                <div className="space-y-2">
                  {[...previousScans].reverse().slice(0, 10).map((scan, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-secondary/50">
                      <div>
                        <p className="text-sm font-medium">{scan.value}% body fat</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(scan.recorded_at), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      {scan.notes && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{scan.notes.includes('AI') ? 'AI' : 'Manual'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BodyScan;
