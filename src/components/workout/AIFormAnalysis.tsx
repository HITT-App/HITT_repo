import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormAnalysisResult {
  overallScore: number;
  formRating: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  posture: {
    head: string;
    shoulders: string;
    back: string;
    hips: string;
    knees: string;
    feet: string;
  };
  keyPoints: string[];
  safetyWarnings: string[];
  encouragement: string;
}

interface AIFormAnalysisProps {
  exerciseName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIFormAnalysis({ exerciseName, isOpen, onClose }: AIFormAnalysisProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FormAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeForm = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-form', {
        body: { 
          imageBase64: capturedImage,
          exerciseName 
        }
      });

      if (fnError) throw fnError;
      setResult(data);
    } catch (err) {
      console.error('Form analysis error:', err);
      setError('Failed to analyze form. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRatingBadge = (rating: string) => {
    const styles: Record<string, string> = {
      excellent: 'bg-green-500/20 text-green-500 border-green-500/30',
      good: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      fair: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      needs_improvement: 'bg-red-500/20 text-red-500 border-red-500/30',
    };
    return styles[rating] || styles.fair;
  };

  const getPostureIcon = (status: string) => {
    if (status === 'correct') return <Check className="w-3 h-3 text-green-500" />;
    return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            AI Form Analysis
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {!capturedImage ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Capture or upload an image of yourself performing <strong>{exerciseName}</strong> to get AI-powered form feedback.
              </p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[4/3] rounded-2xl bg-secondary border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-secondary/80 transition-colors"
              >
                <Camera className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Tap to capture or upload</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCapture}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                <img 
                  src={capturedImage} 
                  alt="Captured form" 
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full"
                  onClick={resetAnalysis}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {!result && !isAnalyzing && (
                <Button 
                  onClick={analyzeForm} 
                  className="w-full h-12 rounded-2xl"
                >
                  Analyze My Form
                </Button>
              )}

              {isAnalyzing && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyzing your form...</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Score */}
                  <div className="text-center p-6 rounded-2xl bg-secondary">
                    <p className={cn("text-5xl font-bold", getScoreColor(result.overallScore))}>
                      {result.overallScore}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Form Score</p>
                    <Badge className={cn("mt-2", getRatingBadge(result.formRating))}>
                      {result.formRating.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Posture Breakdown */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Posture Breakdown</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.posture).map(([part, status]) => (
                        <div key={part} className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
                          {getPostureIcon(status)}
                          <span className="capitalize text-sm">{part}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Points */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Key Feedback</h3>
                    <ul className="space-y-2">
                      {result.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Safety Warnings */}
                  {result.safetyWarnings.length > 0 && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <h3 className="font-semibold text-yellow-500 flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Safety Notes
                      </h3>
                      <ul className="text-sm space-y-1">
                        {result.safetyWarnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Encouragement */}
                  <div className="p-4 rounded-xl bg-primary/10 text-center">
                    <p className="text-sm">{result.encouragement}</p>
                  </div>

                  <Button variant="outline" onClick={resetAnalysis} className="w-full">
                    Analyze Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
