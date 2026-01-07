import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Crown, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    period: '',
    icon: Zap,
    popular: false,
    features: [
      'Basic workout plans',
      'Progress tracking',
      'Community access',
      'Limited AI coach',
    ],
    limitations: [
      'No personalized plans',
      'Limited exercises',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$9.99',
    period: '/month',
    icon: Star,
    popular: true,
    features: [
      'Everything in Basic',
      'Personalized workouts',
      'Nutrition tracking',
      'Full AI coach access',
      'Progress analytics',
    ],
    limitations: [],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$19.99',
    period: '/month',
    icon: Crown,
    popular: false,
    features: [
      'Everything in Standard',
      '1-on-1 coaching calls',
      'Custom meal plans',
      'Priority support',
      'Exclusive content',
      'Family sharing (up to 5)',
    ],
    limitations: [],
  },
];

export default function Subscription() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('standard');

  const handleSubscribe = () => {
    // Handle subscription logic
    console.log('Subscribing to:', selectedPlan);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Choose Your Plan</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Hero */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold mb-2">Unlock Your Full Potential</h2>
          <p className="text-muted-foreground text-sm">
            Choose the plan that fits your fitness journey
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "w-full p-5 rounded-2xl border-2 text-left transition-all relative",
                selectedPlan === plan.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    selectedPlan === plan.id ? "bg-primary text-primary-foreground" : "bg-secondary"
                  )}>
                    <plan.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-2xl font-bold">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        {plan.period}
                      </span>
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedPlan === plan.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}>
                  {selectedPlan === plan.id && (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-4 h-4 shrink-0 text-center">×</span>
                    <span>{limitation}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Subscribe Button */}
        <Button
          onClick={handleSubscribe}
          className="w-full h-14 rounded-2xl text-lg font-semibold"
        >
          {selectedPlan === 'basic' ? 'Continue with Basic' : 'Subscribe Now'}
        </Button>

        {/* Terms */}
        <p className="text-xs text-center text-muted-foreground">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Cancel anytime.
        </p>
      </div>
    </div>
  );
}
