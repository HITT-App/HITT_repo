import { X, Heart, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageAnalysisPreviewProps {
  imageUrl: string;
  onRemove: () => void;
  analysis?: {
    match: number;
    category: string;
  } | null;
  isAnalyzing?: boolean;
}

export function ImageAnalysisPreview({ 
  imageUrl, 
  onRemove, 
  analysis,
  isAnalyzing 
}: ImageAnalysisPreviewProps) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-secondary border border-border animate-scale-in">
      <img 
        src={imageUrl} 
        alt="Upload preview" 
        className="w-full h-48 object-cover"
      />
      
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
      >
        <X className="w-4 h-4 text-foreground" />
      </button>

      {/* Analysis overlay */}
      {(analysis || isAnalyzing) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm">Analyzing...</span>
            </div>
          ) : analysis && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Percent className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <span className="text-white text-lg font-bold">{analysis.match}%</span>
                    <span className="text-white/70 text-xs block">Light</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-white text-lg font-bold">{Math.round(analysis.match * 0.53)}%</span>
                    <span className="text-white/70 text-xs block">match</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
