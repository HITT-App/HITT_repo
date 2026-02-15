import { cn } from "@/lib/utils";
import hiitLogo from "@/assets/hiit-logo.webp";

interface HIITLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showGlow?: boolean;
  variant?: "default" | "white" | "orange";
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
  "2xl": "w-32 h-32"
};

export const HIITLogo = ({ size = "md", className, showGlow = false, variant = "default" }: HIITLogoProps) => {
  const filterClass = variant === "white" ? "brightness-0 invert" : "";

  return (
    <img
      src={hiitLogo}
      alt="HIIT Logo"
      className={cn(
        "rounded-lg object-contain",
        sizeClasses[size],
        showGlow && "pulse-glow",
        filterClass,
        className
      )}
    />
  );
};
