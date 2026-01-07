import { cn } from "@/lib/utils";
import hiitLogo from "@/assets/hiit-logo.jpg";

interface HIITLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showGlow?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export const HIITLogo = ({ size = "md", className, showGlow = false }: HIITLogoProps) => {
  return (
    <img
      src={hiitLogo}
      alt="HIIT Logo"
      className={cn(
        "rounded-full object-cover",
        sizeClasses[size],
        showGlow && "pulse-glow",
        className
      )}
    />
  );
};
