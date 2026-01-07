import { ArrowLeft, Heart, Activity, Thermometer, Droplet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const metrics = [
  { label: "Heart Rate", value: "72", unit: "bpm", icon: Heart, color: "text-red-500" },
  { label: "Blood Pressure", value: "120/80", unit: "mmHg", icon: Activity, color: "text-blue-500" },
  { label: "Body Temp", value: "98.6", unit: "°F", icon: Thermometer, color: "text-orange-500" },
  { label: "Blood Oxygen", value: "98", unit: "%", icon: Droplet, color: "text-cyan-500" },
];

const HealthMetrics = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Health Metrics</h1>
      </header>

      <div className="p-4 space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {metric.value} <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                </p>
              </div>
            </Card>
          );
        })}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Connect a wearable device to sync your health data
        </p>
      </div>
    </div>
  );
};

export default HealthMetrics;
