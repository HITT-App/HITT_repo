import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-runner.jpg";
import { HEmoji } from "@/components/HEmoji";

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon?: string;
  image?: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: "Welcome to HIIT Fitness",
    description: "Intelligent fitness to enhance and grow your endurance, anytime anywhere.",
    image: heroImage,
  },
  {
    id: 2,
    title: "Personalized Smart Fitness Score",
    description: "Get a fitness score tailored to your unique health and lifestyle.",
    icon: "📊",
  },
  {
    id: 3,
    title: "Daily Activity Recommendations",
    description: "Receive AI-powered suggestions to optimize your daily workouts.",
    icon: "🎯",
  },
  {
    id: 4,
    title: "Fitness Metrics That Understands You",
    description: "Track progress with intelligent insights designed around your body and goals.",
    icon: "⌚",
  },
  {
    id: 5,
    title: "Meet Your Empowering AI Coach Companion",
    description: "Your AI powered coach is here to guide, motivate, and support your journey.",
    icon: "ai",
  },
  {
    id: 6,
    title: "Find Your Perfect Fitness Coach",
    description: "Connect with expert coaches who match your fitness style and goals.",
    icon: "👨‍🏫",
  },
  {
    id: 7,
    title: "Browse Myriads Of Workout Libraries",
    description: "Access a vast collection of workouts suited for all levels and goals.",
    icon: "📚",
  },
  {
    id: 8,
    title: "Nutrition & Meal Management For You",
    description: "Get personalized meal plans and nutrition insights to fuel your progress.",
    icon: "nutrition",
  },
  {
    id: 9,
    title: "Track & Analyze Your Sleep Quality",
    description: "Monitor your sleep patterns and get insights to improve rest and recovery.",
    icon: "😴",
  },
  {
    id: 10,
    title: "Unlock Achievements & Health Challenges",
    description: "Stay motivated with rewards, challenges, and milestone achievements.",
    icon: "leaderboard",
  },
];

export const OnboardingScreen = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const goToNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleGetStarted = () => {
    localStorage.setItem("hiit_onboarding_complete", "true");
    navigate("/auth");
  };

  const slide = slides[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isFirstSlide && slide.image ? (
          // Welcome slide with image
          <div className="flex-1 relative">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div 
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, hsl(30 30% 98%) 20%, transparent 60%)" }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
              <h1 className="text-3xl font-bold text-foreground mb-3 animate-fade-up">
                {slide.title}
              </h1>
              <p className="text-muted-foreground animate-fade-up" style={{ animationDelay: "0.1s" }}>
                {slide.description}
              </p>
            </div>
          </div>
        ) : (
          // Feature slides with icon
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-8 animate-scale-in flex justify-center">
              {slide.icon === 'ai' || slide.icon === 'leaderboard' || slide.icon === 'nutrition'
                ? <HEmoji name={slide.icon as any} size={120}/>
                : <div className="text-8xl">{slide.icon}</div>}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4 animate-fade-up">
              {slide.title}
            </h2>
            <p className="text-muted-foreground max-w-sm animate-fade-up" style={{ animationDelay: "0.1s" }}>
              {slide.description}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-6 pb-10">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? "w-6 bg-primary" 
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrev}
            disabled={isFirstSlide}
            className={`p-3 rounded-full transition-all ${
              isFirstSlide 
                ? "opacity-0 pointer-events-none" 
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {isLastSlide ? (
            <Button 
              onClick={handleGetStarted}
              className="btn-primary flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : isFirstSlide ? (
            <div className="flex flex-col gap-3 flex-1 mx-4">
              <Button 
                onClick={handleGetStarted}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button 
                  onClick={() => navigate("/auth")} 
                  className="text-primary font-medium hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          ) : null}

          <button
            onClick={goToNext}
            disabled={isLastSlide}
            className={`p-3 rounded-full transition-all ${
              isLastSlide 
                ? "opacity-0 pointer-events-none" 
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};