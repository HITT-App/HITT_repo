import { useState, useRef, useCallback } from "react";
import { ArrowLeft, Camera, Upload, Ruler, TrendingUp, Loader2, X, RotateCcw, Sparkles } from "lucide-react";
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const openCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1920 } }
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error("Could not access camera. Please check permissions.");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setImagePreview(dataUrl);
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
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const analyzeBody = async () => {
    if (!imagePreview || !user) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("analyze-body", {
        body: { imageBase64: imagePreview },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      setAnalysis(res.data);
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
      if (entries.length === 0) {
        toast.error("Please enter at least one measurement.");
        return;
      }
      for (const [key, value] of entries) {
        await logMetric.mutateAsync({
          metric_type: `body_${key}`,
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
      {/* Header */}
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
        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2">
              <Camera className="w-4 h-4" /> AI Scan
            </TabsTrigger>
            <TabsTrigger value="measurements" className="gap-2">
              <Ruler className="w-4 h-4" /> Measurements
            </TabsTrigger>
          </TabsList>

          {/* AI Scan Tab */}
          <TabsContent value="scan" className="space-y-4 mt-4">
            {isCameraOpen ? (
              <Card className="relative overflow-hidden rounded-2xl bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[3/4] object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={closeCamera} className="rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <X className="w-5 h-5" />
                  </Button>
                  <button onClick={capturePhoto} className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white" />
                  </button>
                  <Button variant="outline" size="icon" onClick={() => {}} className="rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30 opacity-0">
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
                      <Camera className="w-4 h-4" /> Take Photo
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2" variant="outline">
                      <Upload className="w-4 h-4" /> Upload
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
                {/* Body Fat Estimate */}
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
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
                      style={{ width: `${Math.min(analysis.estimatedBodyFat * 2, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Athletic</span>
                    <span>Average</span>
                    <span>High</span>
                  </div>
                </Card>

                {/* Body Type & Symmetry */}
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

                {/* Muscle Development */}
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
                        }`}>
                          {devLabel(level)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Key Observations */}
                <Card className="p-5 rounded-2xl">
                  <h3 className="font-semibold text-foreground mb-3">Key Observations</h3>
                  <ul className="space-y-2">
                    {analysis.keyObservations.map((obs, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>
                        {obs}
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Recommendations */}
                <Card className="p-5 rounded-2xl">
                  <h3 className="font-semibold text-foreground mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </Card>

                <p className="text-xs text-center text-muted-foreground">
                  ⚠️ AI estimates are approximations, not medical assessments. For accurate body composition, consult a professional.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Measurements Tab */}
          <TabsContent value="measurements" className="space-y-4 mt-4">
            <Card className="p-5 rounded-2xl">
              <h3 className="font-semibold text-foreground mb-1">Body Measurements</h3>
              <p className="text-sm text-muted-foreground mb-4">Track your measurements over time to see progress</p>
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
              {isSaving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                "Save Measurements"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BodyScan;
