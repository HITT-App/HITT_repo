import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { BrowserMultiFormatReader as ZXingReader } from "@zxing/browser";
import { ArrowLeft, ScanBarcode, Loader2, X, Plus } from "lucide-react";
import { Analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { recordActiveDay } from "@/lib/activeDay";

interface ProductInfo {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  serving_size: string;
  image_url: string | null;
}

export default function BarcodeScanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zxingReaderRef = useRef<ZXingReader | null>(null);

  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [servings, setServings] = useState(1);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      toast.error("Camera access denied. Use manual entry instead.");
      setShowManual(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
  }, []);

  const lookupBarcode = async (code: string) => {
    setLoading(true);
    setScanning(false);
    stopCamera();

    try {
      const { data, error } = await supabase.functions.invoke("lookup-barcode", {
        body: { barcode: code },
      });
      if (error) throw error;
      if (data?.product) {
        setProduct(data.product);
      } else {
        toast.error("Product not found in database. Try another barcode.");
        setScanning(true);
        startCamera();
      }
    } catch {
      toast.error("Failed to look up barcode.");
      setScanning(true);
      startCamera();
    } finally {
      setLoading(false);
    }
  };

  // Initialise ZXing lazily when native BarcodeDetector is unavailable (WKWebView / iOS)
  useEffect(() => {
    if ("BarcodeDetector" in window) return;
    import("@zxing/browser").then(({ BrowserMultiFormatReader }) => {
      zxingReaderRef.current = new BrowserMultiFormatReader();
    });
  }, []);

  useEffect(() => {
    if (!scanning) return;

    startCamera();

    const detectBarcode = async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;

      // Native path (Chrome Android, desktop)
      if ("BarcodeDetector" in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
          });
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            lookupBarcode(barcodes[0].rawValue);
          }
        } catch {}
        return;
      }

      // ZXing fallback — works in WKWebView / iOS where BarcodeDetector is absent
      if (!zxingReaderRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      try {
        const result = zxingReaderRef.current.decodeFromCanvas(canvas);
        lookupBarcode(result.getText());
      } catch {
        // NotFoundException on every empty frame — normal, ignore
      }
    };

    scanIntervalRef.current = setInterval(detectBarcode, 500);

    return () => {
      stopCamera();
    };
  }, [scanning]);

  const handleLogMeal = async (category: string) => {
    if (!user || !product) return;

    try {
      await supabase.from("meal_logs").insert({
        user_id: user.id,
        custom_name: `${product.brand ? product.brand + " " : ""}${product.name}`,
        category,
        calories: Math.round(product.calories * servings),
        protein_grams: Math.round(product.protein * servings),
        fat_grams: Math.round(product.fat * servings),
        carbs_grams: Math.round(product.carbs * servings),
        fiber_grams: Math.round(product.fiber * servings),
        image_url: product.image_url,
        servings,
      });
      recordActiveDay(supabase, user.id).catch(() => {})
      Analytics.mealLogged('barcode');
      toast.success("Meal logged successfully!");
      navigate("/nutrition-dashboard");
    } catch {
      toast.error("Failed to log meal.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border relative z-10">
        <Button variant="ghost" size="icon" onClick={() => { stopCamera(); navigate(-1); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Barcode Scanner</h1>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs"
          onClick={() => { setShowManual(!showManual); }}
        >
          {showManual ? "Use Camera" : "Enter Manually"}
        </Button>
      </header>

      {/* Scanner View */}
      {scanning && !showManual && (
        <div className="relative aspect-[4/3] bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-40 border-2 border-primary rounded-2xl relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-primary/80 animate-pulse top-1/2" />
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm text-white/80 bg-black/50 inline-block px-4 py-2 rounded-full">
              <ScanBarcode className="w-4 h-4 inline mr-2" />
              Point camera at barcode
            </p>
          </div>
        </div>
      )}

      {/* Manual Entry */}
      {showManual && scanning && (
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Enter the barcode number manually:</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 5901234123457"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1"
              inputMode="numeric"
            />
            <Button onClick={() => manualCode && lookupBarcode(manualCode)} disabled={!manualCode || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look Up"}
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Looking up product...</p>
        </div>
      )}

      {/* Product Result */}
      {product && !loading && (
        <div className="p-5 space-y-4">
          <Card className="border-0 bg-card">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="w-20 h-20 rounded-xl object-cover bg-muted" />
                )}
                <div className="flex-1">
                  <h2 className="font-bold text-foreground">{product.name}</h2>
                  {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Serving: {product.serving_size}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setProduct(null); setScanning(true); startCamera(); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Nutrition grid */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Calories", value: Math.round(product.calories * servings), unit: "kcal", color: "text-primary" },
                  { label: "Protein", value: Math.round(product.protein * servings), unit: "g", color: "text-blue-400" },
                  { label: "Carbs", value: Math.round(product.carbs * servings), unit: "g", color: "text-amber-400" },
                  { label: "Fat", value: Math.round(product.fat * servings), unit: "g", color: "text-pink-400" },
                ].map((n) => (
                  <div key={n.label} className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className={`text-lg font-bold ${n.color}`}>{n.value}</p>
                    <p className="text-[10px] text-muted-foreground">{n.unit}</p>
                    <p className="text-[10px] text-muted-foreground">{n.label}</p>
                  </div>
                ))}
              </div>

              {/* Servings */}
              <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                <span className="text-sm text-foreground font-medium">Servings</span>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setServings(Math.max(0.5, servings - 0.5))}>-</Button>
                  <span className="text-foreground font-bold w-8 text-center">{servings}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setServings(servings + 0.5)}>+</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log buttons */}
          <div className="grid grid-cols-2 gap-3">
            {["breakfast", "lunch", "dinner", "snack"].map((cat) => (
              <Button
                key={cat}
                variant="outline"
                className="capitalize h-12"
                onClick={() => handleLogMeal(cat)}
              >
                <Plus className="w-4 h-4 mr-1" />
                {cat}
              </Button>
            ))}
          </div>

          <Button variant="ghost" className="w-full" onClick={() => { setProduct(null); setScanning(true); startCamera(); }}>
            Scan Another
          </Button>
        </div>
      )}
    </div>
  );
}
