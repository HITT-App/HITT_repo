import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface HeightStepProps {
  value: number;
  unit: "cm" | "inch";
  onChange: (value: number) => void;
  onUnitChange: (unit: "cm" | "inch") => void;
  onContinue: () => void;
}

export const HeightStep = ({
  value,
  unit,
  onChange,
  onUnitChange,
  onContinue,
}: HeightStepProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 52;

  const minHeight = unit === "cm" ? 100 : 39;
  const maxHeight = unit === "cm" ? 250 : 98;
  const heights = Array.from(
    { length: maxHeight - minHeight + 1 },
    (_, i) => minHeight + i
  );

  const convertHeight = (h: number, from: "cm" | "inch", to: "cm" | "inch") => {
    if (from === to) return h;
    return from === "cm" ? Math.round(h / 2.54) : Math.round(h * 2.54);
  };

  const handleUnitChange = (newUnit: "cm" | "inch") => {
    const newValue = convertHeight(value, unit, newUnit);
    onChange(newValue);
    onUnitChange(newUnit);
  };

  useEffect(() => {
    if (containerRef.current) {
      const index = heights.indexOf(value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [value, heights]);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const newValue = heights[Math.min(Math.max(0, index), heights.length - 1)];
      if (newValue !== value) {
        onChange(newValue);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          What is your height?
        </h1>

        {/* Unit Toggle */}
        <div className="flex bg-muted rounded-lg p-1 mb-8 w-fit">
          <button
            onClick={() => handleUnitChange("cm")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              unit === "cm"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            cm
          </button>
          <button
            onClick={() => handleUnitChange("inch")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              unit === "inch"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            inch
          </button>
        </div>

        {/* Height Picker */}
        <div className="relative h-[260px] overflow-hidden">
          {/* Selection Highlight */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[52px] border-2 border-primary bg-primary/10 rounded-lg pointer-events-none z-10" />

          {/* Gradient Overlays */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />

          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto scrollbar-hide"
            style={{ paddingTop: "104px", paddingBottom: "104px" }}
          >
            {heights.map((h) => (
              <div
                key={h}
                className={`h-[52px] flex items-center justify-center text-2xl font-medium transition-colors ${
                  h === value ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full btn-primary">
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
