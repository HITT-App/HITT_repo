import { ArrowLeft, Dumbbell, Apple, Droplets, Brain, Moon, Activity, Sparkles, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const categories = [
  { id: 'workout', label: 'Workout', icon: Dumbbell, count: 128, color: 'bg-orange-100 text-primary' },
  { id: 'diet', label: 'Diet', icon: Apple, count: 99, color: 'bg-green-100 text-green-600' },
  { id: 'hydration', label: 'Hydration', icon: Droplets, count: 35, color: 'bg-blue-100 text-blue-600' },
  { id: 'mindfulness', label: 'Mindfulness', icon: Brain, count: 115, color: 'bg-purple-100 text-purple-600' },
  { id: 'sleep', label: 'Sleep', icon: Moon, count: 87, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'activity', label: 'Activity', icon: Activity, count: 338, color: 'bg-red-100 text-red-600' },
  { id: 'ai', label: 'AI/ML', icon: Sparkles, count: 728, color: 'bg-yellow-100 text-yellow-600' },
];

const ResourcesCategories = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/resources')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Resources Categories</h1>
          <p className="text-sm text-muted-foreground">Browse different wellness categories.</p>
        </div>
      </header>

      <div className="px-4 space-y-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card 
              key={cat.id}
              className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/resources/browse?category=${cat.id}`)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{cat.label}</h3>
                <p className="text-sm text-muted-foreground">{cat.count} total</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ResourcesCategories;
