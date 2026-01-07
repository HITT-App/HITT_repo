import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface BirthDateStepProps {
  value: { month: string; day: string; year: string };
  onChange: (value: { month: string; day: string; year: string }) => void;
  onContinue: () => void;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 80 }, (_, i) => String(currentYear - 18 - i));

interface WheelPickerProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

const WheelPicker = ({ items, value, onChange }: WheelPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;

  useEffect(() => {
    if (containerRef.current) {
      const index = items.indexOf(value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [value, items]);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const newValue = items[Math.min(Math.max(0, index), items.length - 1)];
      if (newValue !== value) {
        onChange(newValue);
      }
    }
  };

  return (
    <div className="relative h-[220px] overflow-hidden">
      {/* Selection Highlight */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 bg-primary rounded-lg pointer-events-none z-10" />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory", paddingTop: "88px", paddingBottom: "88px" }}
      >
        {items.map((item) => (
          <div
            key={item}
            className={`h-11 flex items-center justify-center text-lg font-medium snap-center transition-colors ${
              item === value ? "text-white" : "text-muted-foreground"
            }`}
            style={{ scrollSnapAlign: "center" }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export const BirthDateStep = ({ value, onChange, onContinue }: BirthDateStepProps) => {
  const isComplete = value.month && value.day && value.year;

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          When were you born?
        </h1>

        <div className="grid grid-cols-3 gap-4">
          <WheelPicker
            items={months}
            value={value.month || "Jan"}
            onChange={(month) => onChange({ ...value, month })}
          />
          <WheelPicker
            items={days}
            value={value.day || "01"}
            onChange={(day) => onChange({ ...value, day })}
          />
          <WheelPicker
            items={years}
            value={value.year || "2000"}
            onChange={(year) => onChange({ ...value, year })}
          />
        </div>

        <p className="text-sm text-muted-foreground text-center mt-4">
          I'm 18 years of age
        </p>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={!isComplete}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
