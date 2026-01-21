import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, AlertTriangle, BookOpen, Brain, MessageSquare, Sparkles, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachOnboardingProps {
  onComplete: (mode: 'chatbot' | 'immersive') => void;
}

export function CoachOnboarding({ onComplete }: CoachOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'precautions' | 'mode'>('welcome');
  const [selectedMode, setSelectedMode] = useState<'chatbot' | 'immersive'>('chatbot');

  const precautions = [
    {
      icon: AlertTriangle,
      title: 'Not a Fitness Advice',
      description: 'Not a substitute for professional medical or fitness advice',
    },
    {
      icon: BookOpen,
      title: 'Limited Knowledge',
      description: 'May not account for personal health conditions or injuries',
    },
    {
      icon: Brain,
      title: 'Based on General Knowledge',
      description: 'Responses are based on general knowledge, not diagnostics',
    },
  ];

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center animate-fade-up">
      <div className="relative mb-8">
        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
          <Bot className="w-20 h-20 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
          Get Up Now!
        </div>
        <div className="absolute bottom-4 -left-4 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
          Do 588 Reps!
        </div>
        <div className="absolute top-1/2 -right-6 bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded-full">
          Wrong Form!
        </div>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">
        Meet Your Favorite AI<br />Fitness Coach.
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        The age of fitness 2.0 is over. Welcoming<br />fitness 3.0 with AI/ML.
      </p>

      <Button 
        className="w-full max-w-xs btn-primary gap-2"
        onClick={() => setStep('precautions')}
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderPrecautions = () => (
    <div className="flex flex-col h-full px-6 py-8 animate-fade-up">
      <div className="flex-1 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-8">
          Precautions &<br />Limitations
        </h1>

        <div className="w-full space-y-4">
          {precautions.map((item, index) => (
            <div 
              key={index}
              className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="w-2 h-2 rounded-full bg-muted" />
          <div className="w-2 h-2 rounded-full bg-muted" />
        </div>
      </div>

      <Button 
        className="w-full btn-primary gap-2 mt-6"
        onClick={() => setStep('mode')}
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderModeSelection = () => (
    <div className="flex flex-col h-full px-6 py-8 animate-fade-up">
      <div className="flex-1 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-8">
          How would you like to<br />interact?
        </h1>

        <div className="w-full space-y-3">
          <button
            onClick={() => setSelectedMode('chatbot')}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
              selectedMode === 'chatbot' 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground text-sm">Chatbot Mode</h3>
              <p className="text-muted-foreground text-xs">
                Engage in quick and easy text-based conversations.
              </p>
            </div>
            {selectedMode === 'chatbot' && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>

          <button
            onClick={() => setSelectedMode('immersive')}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
              selectedMode === 'immersive' 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground text-sm">Immersive Mode</h3>
              <p className="text-muted-foreground text-xs">
                Dive deeper with interactive visuals and real-time response!
              </p>
            </div>
            {selectedMode === 'immersive' && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>
        </div>
      </div>

      <Button 
        className="w-full btn-primary gap-2 mt-6"
        onClick={() => onComplete(selectedMode)}
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="h-full bg-background">
      {step === 'welcome' && renderWelcome()}
      {step === 'precautions' && renderPrecautions()}
      {step === 'mode' && renderModeSelection()}
    </div>
  );
}
