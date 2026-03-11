import { useState, useRef, useCallback, useEffect } from "react";
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
  aspectRatio?: number;
  onCropComplete: (croppedBlob: Blob) => void;
  title?: string;
}

const CONTAINER_WIDTH = 300;

const ImageCropperDialog = ({
  open,
  onOpenChange,
  imageSrc,
  aspectRatio = 1,
  onCropComplete,
  title = "Crop Image",
}: ImageCropperDialogProps) => {
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.5);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const containerHeight = CONTAINER_WIDTH / aspectRatio;

  // When image loads, fit it to cover the crop area
  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const scaleX = CONTAINER_WIDTH / img.naturalWidth;
    const scaleY = containerHeight / img.naturalHeight;
    const fitScale = Math.max(scaleX, scaleY);

    setMinScale(fitScale * 0.5);
    setScale(fitScale);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(true);
  }, [containerHeight]);

  // Reset state when dialog opens with new image
  useEffect(() => {
    if (open) {
      setImageLoaded(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const handleReset = () => {
    if (imageRef.current) {
      const scaleX = CONTAINER_WIDTH / imageRef.current.naturalWidth;
      const scaleY = containerHeight / imageRef.current.naturalHeight;
      setScale(Math.max(scaleX, scaleY));
    }
    setPosition({ x: 0, y: 0 });
  };

  const handleCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputWidth = aspectRatio >= 1 ? 800 : 400;
    const outputHeight = outputWidth / aspectRatio;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const imgW = img.naturalWidth * scale;
    const imgH = img.naturalHeight * scale;

    // Image center in container coords
    const imgCenterX = CONTAINER_WIDTH / 2 + position.x;
    const imgCenterY = containerHeight / 2 + position.y;

    // Top-left of image in container coords
    const imgLeft = imgCenterX - imgW / 2;
    const imgTop = imgCenterY - imgH / 2;

    // Crop region in original image pixels
    const cropX = -imgLeft / scale;
    const cropY = -imgTop / scale;
    const cropW = CONTAINER_WIDTH / scale;
    const cropH = containerHeight / scale;

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outputWidth, outputHeight);

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
  }, [aspectRatio, scale, position, containerHeight, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Area */}
          <div
            className="relative mx-auto overflow-hidden rounded-xl border border-border"
            style={{
              width: CONTAINER_WIDTH,
              height: containerHeight,
              cursor: isDragging ? "grabbing" : "grab",
              background: "hsl(var(--muted))",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="absolute select-none pointer-events-none"
              onLoad={handleImageLoad}
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                maxWidth: "none",
                transformOrigin: "center center",
                opacity: imageLoaded ? 1 : 0,
                transition: imageLoaded ? "none" : "opacity 0.2s",
              }}
              draggable={false}
            />

            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/15" />
              ))}
            </div>

            {/* Circular mask for avatars */}
            {aspectRatio === 1 && (
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                  borderRadius: "50%",
                }}
              />
            )}

            {/* Loading state */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-3 px-2">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[scale]}
              onValueChange={(v) => setScale(v[0])}
              min={minScale}
              max={minScale * 5}
              step={0.01}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
            <Button variant="ghost" size="icon" onClick={handleReset} className="ml-1 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Drag to reposition • Pinch or slide to zoom
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleCrop} className="w-full" disabled={!imageLoaded}>
            Apply Crop
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancel
          </Button>
        </DialogFooter>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperDialog;
