import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary",
        sizeClasses[size],
        showGlow && "pulse-glow",
        className
      )}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/5 h-3/5"
      >
        {/* H shape with I in the middle - HIIT logo */}
        <path
          d="M8 8V32M8 20H16M16 8V32"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
        />
        <path
          d="M24 8V32M24 20H32M32 8V32"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground"
        />
      </svg>
    </div>
  );
};
