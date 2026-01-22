import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  iconClassName?: string;
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  iconClassName,
  loading,
}: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {loading ? "..." : typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {trend && (
              <p className={cn(
                "text-xs",
                trend.value >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            iconClassName || "bg-primary/10"
          )}>
            <Icon className={cn("h-6 w-6", iconClassName?.includes("text-") ? "" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
