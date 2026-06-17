import * as React from "react";

import { cn } from "@/lib/utils";

// Native <input type="range"> — matches the Radix Slider API.
// Radix's pointer-event-based slider breaks on iOS WKWebView inside scroll
// containers; a native range input has first-class iOS touch support.
const Slider = React.forwardRef<
  HTMLInputElement,
  {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    className?: string;
  }
>(({ value, defaultValue, onValueChange, min = 0, max = 100, step = 1, disabled, className }, ref) => {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;
  const pct = max === min ? 0 : ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div className="absolute h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:pointer-events-none"
        style={{ touchAction: "none" }}
      />
      {/* Visible thumb */}
      <div
        className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-primary bg-background shadow ring-offset-background"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider };
