import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, Scan, Flame, Droplets, Wheat, Check, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanState = 'requirements' | 'scanning' | 'processing' | 'result' | 'error';

type DetectedFood = {
  name: string;
  description: string;
  calories: number;
  fat_grams: number;
  protein_grams: number;
  fiber_grams?: number;
  vitamin_b?: number;
  vitamin_a?: number;
  servings: number;
};

export default function MealScanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [scanState, setScanState] = useState<ScanState>('requirements');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectedFood, setDetectedFood] = useState<DetectedFood | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const requirements = [
    { label: 'Camera Quality', value: '720p', ok: true },
    { label: 'Internet Speed', value: '10mbps', ok: true },
    { label: 'Well Lit Room', value: 'True', ok: true },
  ];

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setScanState('scanning');
    } catch (error) {
      console.error('Camera error:', error);
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera' });
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    setScanState('processing');
    setIsAnalyzing(true);

    // Stop camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      // Get user's auth token for authenticated API call
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please sign in to use food scanner' });
        setScanState('error');
        setIsAnalyzing(false);
        return;
      }

      // Call AI to analyze the food with authenticated request
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze food');
      }

      const result = await response.json();
      
      if (!result.success || result.error) {
        setScanState('error');
      } else {
        setDetectedFood({
          name: result.food_name,
          description: result.description,
          calories: result.calories,
          fat_grams: result.fat_grams,
          protein_grams: result.protein_grams,
          fiber_grams: result.fiber_grams,
          servings: 1,
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

  const handleAddFood = async () => {
    if (!user || !detectedFood) return;

    try {
      const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        custom_name: detectedFood.name,
        category: 'snack',
        calories: detectedFood.calories,
        protein_grams: detectedFood.protein_grams,
        fat_grams: detectedFood.fat_grams,
        carbs_grams: 0,
        fiber_grams: detectedFood.fiber_grams || 0,
        servings: detectedFood.servings,
        image_url: capturedImage,
      });

      if (error) throw error;

      toast({ title: 'Food added!', description: `${detectedFood.name} has been logged.` });
      navigate('/nutrition');
    } catch (error) {
      console.error('Error adding food:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add food' });
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setDetectedFood(null);
    setScanState('requirements');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {scanState === 'result' ? 'Meal Result' : 'Scan Meal with AI'}
        </h1>
      </header>

      <div className="flex-1 flex flex-col p-4">
        {/* Requirements State */}
        {scanState === 'requirements' && (
          <div className="flex-1 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 mt-8">
              <Scan className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Scan Meal with AI</h2>
            <p className="text-muted-foreground text-center mb-8">Please ensure to following</p>

            <div className="w-full space-y-4 mb-auto">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                  <span className="text-sm">{req.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{req.value}</span>
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full space-y-3 mt-6">
              <Button onClick={startCamera} className="w-full h-12 rounded-2xl gap-2">
                Got it, let's scan! <Scan className="w-4 h-4" />
              </Button>
              <Button variant="link" className="w-full text-primary" onClick={() => navigate('/log-meal')}>
                Log food manually
              </Button>
            </div>
          </div>
        )}

        {/* Scanning State */}
        {scanState === 'scanning' && (
          <div className="flex-1 flex flex-col relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-primary rounded-2xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
              </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <Button
                size="lg"
                className="rounded-full w-16 h-16 bg-primary"
                onClick={captureAndAnalyze}
              >
                <Camera className="w-6 h-6" />
              </Button>
            </div>

            <div className="absolute bottom-24 left-0 right-0 text-center">
              <p className="text-sm bg-foreground/80 text-background px-4 py-2 rounded-full inline-flex items-center gap-2">
                <Scan className="w-4 h-4" /> Tap below to start scanning
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
            <p className="text-muted-foreground">Getting our AI LLMs ready...</p>
          </div>
        )}

        {/* Result State */}
        {scanState === 'result' && detectedFood && (
          <div className="flex-1 flex flex-col">
            {/* Food Image */}
            <div className="aspect-square rounded-2xl overflow-hidden mb-6 bg-secondary">
              {capturedImage && (
                <img src={capturedImage} alt="Captured food" className="w-full h-full object-cover" />
              )}
            </div>

            {/* Food Info */}
            <h2 className="text-xl font-bold text-center mb-1">{detectedFood.name}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{detectedFood.description}</p>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <p className="font-bold">{detectedFood.calories}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                  <Droplets className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-bold">{detectedFood.fat_grams}g</p>
                <p className="text-xs text-muted-foreground">fat</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                  <Wheat className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-bold">{detectedFood.protein_grams}g</p>
                <p className="text-xs text-muted-foreground">protein</p>
              </div>
            </div>

            {/* Additional Info */}
            <Card className="border-border/50 mb-6">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serving</span>
                  <span>{detectedFood.servings} Plate</span>
                </div>
                {detectedFood.fiber_grams && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fiber</span>
                    <span>{detectedFood.fiber_grams}g</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3 mt-auto">
              <Button variant="outline" className="w-full h-12 rounded-2xl">
                See Details
              </Button>
              <Button onClick={handleAddFood} className="w-full h-12 rounded-2xl gap-2">
                Add Food +
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
            <h2 className="text-xl font-bold mb-2">Whoops! We couldn't detect the food.</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Please make sure your room is well-lit and have a hi-quality camera. Or try again later
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
