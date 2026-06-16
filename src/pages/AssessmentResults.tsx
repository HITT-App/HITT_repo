import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, Flame, Droplets, Heart, Activity, Moon, Scale, Ruler } from 'lucide-react';

const bodyMetrics = [
  { label: 'Weight', value: '75', unit: 'kg', icon: Scale, color: 'text-blue-500' },
  { label: 'Height', value: '178', unit: 'cm', icon: Ruler, color: 'text-green-500' },
  { label: 'BMI', value: '23.7', unit: '', icon: Activity, color: 'text-primary' },
  { label: 'Body Fat', value: '18', unit: '%', icon: Droplets, color: 'text-purple-500' },
];

const healthMetrics = [
  { label: 'Resting Heart Rate', value: 68, max: 100, unit: 'bpm', icon: Heart, color: 'bg-red-500' },
  { label: 'Sleep Quality', value: 85, max: 100, unit: '%', icon: Moon, color: 'bg-indigo-500' },
  { label: 'Activity Level', value: 72, max: 100, unit: '%', icon: Activity, color: 'bg-green-500' },
  { label: 'Calories Burned', value: 65, max: 100, unit: '%', icon: Flame, color: 'bg-orange-500' },
];

const recommendations = [
  { title: 'Increase cardio', description: 'Add 2 more sessions per week', priority: 'high' },
  { title: 'Hydration', description: 'Drink at least 3L of water daily', priority: 'medium' },
  { title: 'Sleep schedule', description: 'Aim for 7-8 hours consistently', priority: 'high' },
];

export default function AssessmentResults() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Assessment Results</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6 pb-28">
        {/* Overall Score */}
        <div className="text-center py-6">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-secondary"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${78 * 3.51} 351`}
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold">78</span>
              <span className="text-xs text-muted-foreground">Overall Score</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Great progress! You're above average for your age group.
          </p>
        </div>

        {/* Body Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Body Composition
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {bodyMetrics.map((metric) => (
              <div
                key={metric.label}
                className="p-4 rounded-2xl bg-card border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className="text-2xl font-bold">
                  {metric.value}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {metric.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Health Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Health Metrics</h2>
          <div className="space-y-4">
            {healthMetrics.map((metric) => (
              <div key={metric.label} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${metric.color} flex items-center justify-center`}>
                      <metric.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium">{metric.label}</span>
                  </div>
                  <span className="font-semibold">
                    {metric.value}{metric.unit}
                  </span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recommendations</h2>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-card border border-border flex items-start gap-3"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  rec.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <p className="font-medium">{rec.title}</p>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => navigate('/')}
          className="w-full h-14 rounded-2xl text-lg font-semibold"
        >
          Continue to Dashboard
        </Button>
      </div>
      </div>
    </div>
  );
}
