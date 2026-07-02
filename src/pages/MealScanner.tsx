import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Analytics } from '@/lib/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { recordActiveDay } from '@/lib/activeDay';
import { ArrowLeft, Camera, Scan, Flame, Droplets, Wheat, Check, X, RefreshCw, Image, Plus, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ScanState = 'requirements' | 'scanning' | 'processing' | 'result' | 'error';

type DetectedFoodItem = {
  food_name: string;
  description: string;
  serving_size: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  fiber_grams: number;
  confidence: string;
  servings: number;
  selected: boolean;
};

type AnalysisResult = {
  items: DetectedFoodItem[];
  total_calories: number;
  total_protein_grams: number;
  total_carbs_grams: number;
  total_fat_grams: number;
  total_fiber_grams: number;
  health_notes: string;
  suggestions: string;
};

const MEAL_CATEGORIES = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch', label: '☀️ Lunch' },
  { value: 'dinner', label: '🌙 Dinner' },
  { value: 'snack', label: '🍿 Snack' },
];

export default function MealScanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // streamRef (not useState) — attaching srcObject inside startCamera removes
  // the render-gap that caused intermittent black-screen on iOS WKWebView.
  const streamRef = useRef<MediaStream | null>(null);

  const [scanState, setScanState] = useState<ScanState>('requirements');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mealCategory, setMealCategory] = useState('snack');
  const [isSaving, setIsSaving] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return stopCamera;
  }, []);

  // Auto-start the camera on mount so the user goes straight to scanning.
  // If permission is denied, scanState stays at 'requirements' and the
  // denied fallback UI is shown instead.
  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach the stream when the video element mounts (it's conditionally
  // rendered only while scanState === 'scanning'). Without this, navigating
  // between states could leave the element with a torn-down srcObject.
  useEffect(() => {
    if (scanState !== 'scanning') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: 'Camera could not start. Try again or upload from gallery.',
      });
      setCameraDenied(true);
      setScanState('requirements');
    });
  }, [scanState, toast]);

  const startCamera = async () => {
    try {
      setCameraDenied(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      });
      streamRef.current = mediaStream;
      setScanState('scanning');
      // The effect above attaches srcObject + calls play() once the
      // <video> element mounts as part of the 'scanning' render.
    } catch {
      setCameraDenied(true);
      toast({ variant: 'destructive', title: 'Camera unavailable', description: 'Allow camera access in Settings, or upload from your gallery.' });
    }
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();
    analyzeImage(imageData);
  };

  const analyzeImage = async (imageData: string) => {
    setScanState('processing');
    setIsAnalyzing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast({ variant: 'destructive', title: 'Auth Error', description: 'Please sign in first' });
        setScanState('error');
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) throw new Error('Failed to analyze food');
      const result = await response.json();

      if (!result.success || result.error) {
        setScanState('error');
      } else {
        const items: DetectedFoodItem[] = (result.items || []).map((item: any) => ({
          ...item,
          servings: 1,
          selected: true,
        }));
        setAnalysisResult({
          items,
          total_calories: result.total_calories || 0,
          total_protein_grams: result.total_protein_grams || 0,
          total_carbs_grams: result.total_carbs_grams || 0,
          total_fat_grams: result.total_fat_grams || 0,
          total_fiber_grams: result.total_fiber_grams || 0,
          health_notes: result.health_notes || '',
          suggestions: result.suggestions || '',
        });
        setScanState('result');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setScanState('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateServings = (index: number, delta: number) => {
    if (!analysisResult) return;
    setAnalysisResult(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index], servings: Math.max(0.5, items[index].servings + delta) };
      return { ...prev, items };
    });
  };

  const toggleItem = (index: number) => {
    if (!analysisResult) return;
    setAnalysisResult(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index], selected: !items[index].selected };
      return { ...prev, items };
    });
  };

  const getSelectedTotals = () => {
    if (!analysisResult) return { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
    return analysisResult.items
      .filter(i => i.selected)
      .reduce((acc, i) => ({
        calories: acc.calories + Math.round(i.calories * i.servings),
        protein: acc.protein + Math.round(i.protein_grams * i.servings),
        fat: acc.fat + Math.round(i.fat_grams * i.servings),
        carbs: acc.carbs + Math.round(i.carbs_grams * i.servings),
        fiber: acc.fiber + Math.round(i.fiber_grams * i.servings),
      }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });
  };

  const handleAddFood = async () => {
    if (!user || !analysisResult) return;
    const selected = analysisResult.items.filter(i => i.selected);
    if (selected.length === 0) {
      toast({ variant: 'destructive', title: 'No items selected' });
      return;
    }
    setIsSaving(true);
    try {
      for (const item of selected) {
        const { error } = await supabase.from('meal_logs').insert({
          user_id: user.id,
          custom_name: item.food_name,
          category: mealCategory,
          calories: Math.round(item.calories * item.servings),
          protein_grams: Math.round(item.protein_grams * item.servings),
          fat_grams: Math.round(item.fat_grams * item.servings),
          carbs_grams: Math.round(item.carbs_grams * item.servings),
          fiber_grams: Math.round(item.fiber_grams * item.servings),
          servings: item.servings,
          image_url: capturedImage,
        });
        if (error) throw error;
      }
      recordActiveDay(supabase, user.id).catch(() => {})
      Analytics.mealLogged('scanner');
      toast({ title: 'Food logged!', description: `${selected.length} item(s) added to ${mealCategory}.` });
      navigate('/nutrition-dashboard');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add food' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    startCamera();
  };

  const totals = getSelectedTotals();

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header
        className="flex items-center gap-3 px-4 pb-3 border-b border-border bg-background shrink-0"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {scanState === 'result' ? 'Meal Result' : 'Scan Meal with AI'}
        </h1>
      </header>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelected} className="hidden" />

      <div className={cn(
        "flex-1 flex flex-col min-h-0",
        scanState === 'scanning' ? "" : "overflow-y-auto p-4",
      )}>
        {/* Initial / camera-denied fallback */}
        {scanState === 'requirements' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            {cameraDenied ? (
              <>
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                  <Camera className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold mb-2">Camera unavailable</h2>
                <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
                  Allow camera access in Settings, or upload a photo from your gallery instead.
                </p>
                <div className="w-full space-y-3">
                  <Button onClick={startCamera} className="w-full h-12 rounded-2xl gap-2">
                    <Camera className="w-4 h-4" /> Try Camera Again
                  </Button>
                  <Button onClick={handleGalleryUpload} variant="outline" className="w-full h-12 rounded-2xl gap-2">
                    <Image className="w-4 h-4" /> Upload from Gallery
                  </Button>
                  <Button variant="link" className="w-full text-primary" onClick={() => navigate('/log-meal')}>
                    Log food manually
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Scan className="w-6 h-6 text-primary animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Scanning State — full-bleed, no inner padding */}
        {scanState === 'scanning' && (
          <div className="flex-1 relative bg-black">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-primary rounded-2xl relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
              </div>
            </div>
            <div
              className="absolute left-0 right-0 flex items-center justify-center gap-6"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            >
              <button
                onClick={handleGalleryUpload}
                className="w-12 h-12 rounded-full bg-foreground/40 backdrop-blur-md flex items-center justify-center active:opacity-70"
                aria-label="Upload from gallery"
              >
                <Image className="w-5 h-5 text-white" />
              </button>
              <Button size="lg" className="rounded-full w-16 h-16 bg-primary" onClick={captureAndAnalyze}>
                <Camera className="w-6 h-6" />
              </Button>
              <div className="w-12 h-12" />
            </div>
            <div
              className="absolute left-0 right-0 text-center"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)" }}
            >
              <p className="text-sm bg-foreground/80 text-background px-4 py-2 rounded-full inline-flex items-center gap-2">
                <Scan className="w-4 h-4" /> Tap to capture your meal
              </p>
            </div>
          </div>
        )}

        {/* Processing State */}
        {scanState === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
              <Scan className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Detecting food items...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Result State */}
        {scanState === 'result' && analysisResult && (
          <div className="flex-1 flex flex-col gap-4">
            {/* Captured image */}
            <div className="aspect-video rounded-2xl overflow-hidden bg-secondary">
              {capturedImage && <img src={capturedImage} alt="Captured food" className="w-full h-full object-cover" />}
            </div>

            {/* Meal Category Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Log as:</span>
              <Select value={mealCategory} onValueChange={setMealCategory}>
                <SelectTrigger className="w-40 h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detected Food Items */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Detected Items ({analysisResult.items.length})
              </h3>
              {analysisResult.items.map((item, index) => (
                <Card key={index} className={`rounded-2xl transition-opacity ${!item.selected ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleItem(index)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          item.selected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                        }`}
                      >
                        {item.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm truncate">{item.food_name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary ml-2">
                            {item.confidence}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.serving_size}</p>

                        {/* Portion Size Selector */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Servings:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateServings(index, -0.5)}
                              className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-8 text-center">{item.servings}</span>
                            <button
                              onClick={() => updateServings(index, 0.5)}
                              className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Macros row */}
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="text-primary font-medium">{Math.round(item.calories * item.servings)} kcal</span>
                          <span>{Math.round(item.protein_grams * item.servings)}g P</span>
                          <span>{Math.round(item.carbs_grams * item.servings)}g C</span>
                          <span>{Math.round(item.fat_grams * item.servings)}g F</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Totals Summary */}
            <Card className="rounded-2xl bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Selected Total</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                      <Flame className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-bold text-sm">{totals.calories}</p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mx-auto mb-1">
                      <Wheat className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-sm">{totals.protein}g</p>
                    <p className="text-[10px] text-muted-foreground">protein</p>
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mx-auto mb-1">
                      <Droplets className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-sm">{totals.carbs}g</p>
                    <p className="text-[10px] text-muted-foreground">carbs</p>
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mx-auto mb-1">
                      <Droplets className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-sm">{totals.fat}g</p>
                    <p className="text-[10px] text-muted-foreground">fat</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health notes */}
            {analysisResult.health_notes && (
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{analysisResult.health_notes}</p>
                  {analysisResult.suggestions && (
                    <p className="text-xs text-primary mt-2">💡 {analysisResult.suggestions}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions — pinned to the bottom of the viewport, above the home indicator */}
            <div
              className="sticky bottom-0 -mx-4 px-4 pt-3 bg-background/95 backdrop-blur-sm border-t border-border/40 space-y-3 mt-auto"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
            >
              <Button onClick={handleAddFood} disabled={isSaving} className="w-full h-12 rounded-2xl gap-2">
                {isSaving ? 'Saving...' : `Log ${analysisResult.items.filter(i => i.selected).length} Item(s)`}
              </Button>
              <Button variant="outline" onClick={handleRetry} className="w-full h-12 rounded-2xl gap-2">
                <RefreshCw className="w-4 h-4" /> Scan Again
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {scanState === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            {capturedImage && (
              <div className="w-32 h-32 rounded-2xl overflow-hidden mb-6 relative">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            <h2 className="text-xl font-bold mb-2">Couldn't detect the food</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Make sure your room is well-lit and the food is clearly visible. Or try again.
            </p>
            <div className="w-full space-y-3">
              <Button onClick={handleRetry} className="w-full h-12 rounded-2xl gap-2">
                Retry <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-2xl" onClick={() => navigate('/log-meal')}>
                Or add manually
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
