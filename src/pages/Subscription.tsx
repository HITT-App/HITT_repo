import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Crown, Zap, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  crown: Crown,
  zap: Zap,
};

interface Plan {
  id: string;
  name: string;
  price_amount: number;
  period: string;
  icon: string;
  is_popular: boolean;
  features: string[];
  limitations: string[];
  sort_order: number;
}

export default function Subscription() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (data && data.length > 0) {
        setPlans(data as Plan[]);
        const popular = data.find((p: any) => p.is_popular);
        setSelectedPlan(popular?.id || data[0].id);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handleSubscribe = () => {
    console.log('Subscribing to:', selectedPlan);
  };

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Free';
    return `£${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Choose Your Plan</h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold mb-2">Unlock Your Full Potential</h2>
          <p className="text-muted-foreground text-sm">
            Choose the plan that fits your fitness journey
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const IconComp = ICON_MAP[plan.icon] || Star;
              return (
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
                  {plan.is_popular && (
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
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-2xl font-bold">
                          {formatPrice(plan.price_amount)}
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
              );
            })}
          </div>
        )}

        <Button
          onClick={handleSubscribe}
          className="w-full h-14 rounded-2xl text-lg font-semibold"
          disabled={loading || !selectedPlan}
        >
          {plans.find((p) => p.id === selectedPlan)?.price_amount === 0
            ? "Continue with Basic"
            : "Subscribe Now"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Cancel anytime.
        </p>
      </div>
    </div>
  );
}
