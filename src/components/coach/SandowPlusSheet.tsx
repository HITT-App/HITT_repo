import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, Lock, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SandowPlusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: (plan: 'free' | 'plus') => void;
}

export function SandowPlusSheet({ open, onOpenChange, onSubscribe }: SandowPlusSheetProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'plus'>('plus');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <div className="flex flex-col h-full">
          {/* Hero Image */}
          <div className="relative h-36 -mx-6 -mt-6 mb-4 bg-gradient-to-br from-primary/20 to-secondary overflow-hidden rounded-t-3xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10" />
            </div>
            {/* Plus Badge */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">plus</span>
              </div>
            </div>
          </div>

          <SheetHeader className="text-center mb-4">
            <SheetTitle className="flex items-center justify-center gap-2 text-xl">
              sandow Plus
              <span className="text-xl">🌟</span>
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Explore sandow plus and its benefits here.
            </p>
          </SheetHeader>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={cn("text-sm", billingPeriod === 'monthly' && "font-medium")}>
              Monthly
            </span>
            <Switch
              checked={billingPeriod === 'annually'}
              onCheckedChange={(checked) => setBillingPeriod(checked ? 'annually' : 'monthly')}
            />
            <span className={cn("text-sm", billingPeriod === 'annually' && "font-medium")}>
              Annually
            </span>
          </div>

          {/* Plans */}
          <div className="space-y-3 flex-1">
            {/* Free Plan */}
            <button
              onClick={() => setSelectedPlan('free')}
              className={cn(
                "w-full p-4 rounded-2xl border-2 text-left transition-all",
                selectedPlan === 'free'
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">FREE PLAN</p>
                  <p className="text-2xl font-bold">$0 USD<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-sm text-muted-foreground mt-1">Limited features and functionality</p>
                  <Button variant="link" className="p-0 h-auto text-primary text-sm">Learn More</Button>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  selectedPlan === 'free' ? "border-primary bg-primary" : "border-muted-foreground"
                )}>
                  {selectedPlan === 'free' && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </div>
            </button>

            {/* Plus Plan */}
            <button
              onClick={() => setSelectedPlan('plus')}
              className={cn(
                "w-full p-4 rounded-2xl border-2 text-left transition-all relative",
                selectedPlan === 'plus'
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              {/* Discount Badge */}
              <div className="absolute -top-2 right-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded">
                50% OFF
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">PLUS PLAN</p>
                  <p className="text-2xl font-bold">$8.99 USD<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-sm text-muted-foreground mt-1">AI features and functionality</p>
                  <Button variant="link" className="p-0 h-auto text-primary text-sm">Learn More</Button>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  selectedPlan === 'plus' ? "border-primary bg-primary" : "border-muted-foreground"
                )}>
                  {selectedPlan === 'plus' && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="pt-4 space-y-3">
            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Transaction is secured with 256bit.</span>
            </div>

            {/* Subscribe Button */}
            <Button
              className="w-full h-12 rounded-2xl gap-2"
              onClick={() => {
                onSubscribe(selectedPlan);
                onOpenChange(false);
              }}
            >
              Subscribe to plus
              <Sparkles className="w-4 h-4" />
            </Button>

            {/* Terms */}
            <div className="flex items-center justify-center gap-2 text-xs">
              <Button variant="link" className="p-0 h-auto text-primary text-xs">Terms & Conditions</Button>
              <span className="text-muted-foreground">•</span>
              <Button variant="link" className="p-0 h-auto text-primary text-xs">Privacy Policy</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
