import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspectRatio?: number; // width / height (1 for square avatar, 3 for banner)
  onCropComplete: (croppedBlob: Blob) => void;
  title?: string;
}

const ImageCropperDialog = ({
  open,
  onOpenChange,
  imageSrc,
  aspectRatio = 1,
  onCropComplete,
  title = "Crop Image",
}: ImageCropperDialogProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    
    // Set canvas size based on aspect ratio
    const outputWidth = aspectRatio >= 1 ? 800 : 400;
    const outputHeight = outputWidth / aspectRatio;
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Calculate the visible area dimensions
    const containerWidth = 300;
    const containerHeight = containerWidth / aspectRatio;

    // Calculate image dimensions as displayed
    const imgDisplayWidth = img.naturalWidth * scale;
    const imgDisplayHeight = img.naturalHeight * scale;

    // Calculate the crop area in the original image
    const cropX = (containerWidth / 2 - position.x - imgDisplayWidth / 2) / scale;
    const cropY = (containerHeight / 2 - position.y - imgDisplayHeight / 2) / scale;
    const cropWidth = containerWidth / scale;
    const cropHeight = containerHeight / scale;

    // Draw the cropped image
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        }
      },
      "image/jpeg",
      0.9
    );
  }, [aspectRatio, scale, position, onCropComplete, onOpenChange]);

  const containerHeight = aspectRatio >= 1 ? 300 / aspectRatio : 300;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Area */}
          <div
            className="relative mx-auto overflow-hidden bg-black/90 rounded-lg"
            style={{ 
              width: 300, 
              height: containerHeight,
              cursor: isDragging ? "grabbing" : "grab"
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>
            </div>

            {/* Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="absolute select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                left: "50%",
                top: "50%",
                marginLeft: "-50%",
                marginTop: "-50%",
                maxWidth: "none",
                transformOrigin: "center center",
              }}
              draggable={false}
            />

            {/* Circular mask for avatars */}
            {aspectRatio === 1 && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  borderRadius: "50%",
                }}
              />
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-3 px-2">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="ml-2"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Drag to reposition • Use slider to zoom
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCrop}>
            Apply Crop
          </Button>
        </DialogFooter>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperDialog;
