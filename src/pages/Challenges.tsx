import { ArrowLeft, ChevronRight, Calendar, Target, Plus } from "lucide-react";
import { HEmoji } from "@/components/HEmoji";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const featuredChallenge = {
  id: 'featured',
  title: 'Lose 15kg in one month',
  subtitle: 'MULTIPLE REWARDS',
  daysLeft: 15,
  icon: '🏆',
};

const challenges = [
  {
    id: '1',
    title: '10K Challenge',
    description: 'Run 10 kilometers this week',
    daysRemaining: 3,
    icon: '🏃',
    iconBg: 'bg-orange-100',
  },
  {
    id: '2',
    title: 'Muscle Gain Challenge',
    description: 'Run 10 kilometers this week',
    daysRemaining: 3,
    icon: '💪',
    iconBg: 'bg-red-100',
  },
  {
    id: '3',
    title: '5K Challenge',
    description: 'Run 10 kilometers this week',
    daysRemaining: 3,
    icon: '🏃',
    iconBg: 'bg-blue-100',
  },
  {
    id: '4',
    title: '2K Challenge',
    description: 'Run 10 kilometers this week',
    daysRemaining: 3,
    icon: '🏃',
    iconBg: 'bg-green-100',
  },
  {
    id: '5',
    title: 'Yoga Challenge',
    description: 'Run 10 kilometers this week',
    daysRemaining: 3,
    icon: '🧘',
    iconBg: 'bg-purple-100',
  },
  {
    id: '6',
    title: 'Nutrition Challenge',
    description: 'Run 10 kilometers this week',
    daysRemaining: 3,
    icon: '🥗',
    iconBg: 'bg-yellow-100',
  },
];

const Challenges = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-bold text-foreground">Browse Challenges</h1>
          <p className="text-xs text-muted-foreground">Supporting Text</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 space-y-6 pb-28">
        {/* Featured Challenge */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Featured Challenge</h2>
          <Card 
            className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 cursor-pointer"
            onClick={() => navigate(`/challenge/${featuredChallenge.id}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase opacity-80 tracking-wide">
                  {featuredChallenge.subtitle}
                </span>
                <h3 className="text-xl font-bold mt-1">{featuredChallenge.title}</h3>
                <Button 
                  variant="link" 
                  className="text-primary-foreground p-0 h-auto mt-3"
                >
                  View Details <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="text-6xl font-black opacity-90">
                {featuredChallenge.daysLeft}
              </div>
            </div>
            {/* Decorative trophy icon */}
            <div className="absolute -bottom-4 -right-4 text-8xl opacity-20">
              <HEmoji name="leaderboard" size={16}/>
            </div>
          </Card>
        </section>

        {/* All Challenges */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">All Challenges</h2>
            <Button variant="link" className="text-primary p-0 h-auto">
              See All
            </Button>
          </div>
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <Card 
                key={challenge.id}
                className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/challenge/${challenge.id}`)}
              >
                <div className={`w-12 h-12 rounded-xl ${challenge.iconBg} flex items-center justify-center text-2xl`}>
                  {challenge.icon === '🏆' ? <HEmoji name="leaderboard" size={20}/> : challenge.icon === '💪' ? <HEmoji name="workouts" size={20}/> : challenge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                  <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{challenge.daysRemaining}d remaining</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Card>
            ))}
          </div>
        </section>

        {/* Load More */}
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Load More
        </Button>
      </div>
      </div>
    </div>
  );
};

export default Challenges;
