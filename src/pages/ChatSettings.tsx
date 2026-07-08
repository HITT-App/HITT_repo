import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const INSIGHT_SUGGESTIONS = [
  { id: 'health_recommendations', label: 'Health Recommendations', enabled: true },
  { id: 'health_metrics', label: 'Health Metrics', enabled: true },
  { id: 'activity_suggestion', label: 'Activity Suggestion', enabled: true },
  { id: 'nutrition_insight', label: 'Nutrition Insight', enabled: true },
  { id: 'sleep_monitoring', label: 'Sleep Monitoring', enabled: true },
];

export default function ChatSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  const [customResponse, setCustomResponse] = useState(() => localStorage.getItem('hiit-ai-custom-response') ?? '');
  // Explicit, opt-in consent to send Apple Health / HealthKit data to the AI
  // provider for coaching (App Store 5.1.3). Loaded from and saved to the DB.
  const [aiHealthConsent, setAiHealthConsent] = useState(false);
  const [customMemory, setCustomMemory] = useState(() => localStorage.getItem('hiit-ai-custom-memory') ?? '');
  const [insightSuggestions, setInsightSuggestions] = useState(INSIGHT_SUGGESTIONS);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('ai_health_consent').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setAiHealthConsent((data as any)?.ai_health_consent === true));
  }, [user]);

  const handleHealthConsentChange = async (val: boolean) => {
    if (!user) return;
    setAiHealthConsent(val);
    const { error } = await supabase.from('profiles').update({ ai_health_consent: val }).eq('user_id', user.id);
    if (error) {
      setAiHealthConsent(!val);
      toast({ title: "Couldn't update", description: 'Please try again.', variant: 'destructive' });
    } else {
      toast({ title: val ? 'Health data sharing on' : 'Health data sharing off', description: val ? 'Your Apple Health data will personalise AI coaching.' : 'Apple Health data will no longer be sent to the AI.' });
    }
  };

  const handleSave = () => {
    localStorage.setItem('hiit-ai-custom-response', customResponse.trim());
    localStorage.setItem('hiit-ai-custom-memory', customMemory.trim());
    toast({ title: 'Settings saved', description: 'Your AI preferences have been updated.' });
  };

  const handleClearHistory = async () => {
    if (!user) return;

    // 1. Find ALL Jarvis conversations (history may have multiple if older
    //    deletes only nuked messages without the row). Delete messages, then
    //    the conversation rows themselves so useAI creates a fresh one.
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('title', 'Jarvis');
    if (convs && convs.length > 0) {
      const ids = convs.map(c => c.id);
      await supabase.from('messages').delete().in('conversation_id', ids);
      await supabase.from('conversations').delete().in('id', ids);
    }

    // 2. Clear the saved meal plan so it doesn't reappear on next Jarvis open
    localStorage.removeItem(`hitt_meal_plan_${user.id}`);

    // 3. Clear Jarvis onboarding skip flags so wizard cards behave like a fresh user
    for (const key of ['goal', 'plan', 'diet']) {
      localStorage.removeItem(`jarvis_skip_${key}_${user.id}`);
    }
    sessionStorage.removeItem('jarvis_onboarding_suppressed');
    sessionStorage.removeItem('jarvis_last_greeted');

    toast({
      title: 'Chat history cleared',
      description: 'All messages and saved plans deleted. Reloading…',
    });
    // Use replace + cache-bust query param so the service worker doesn't serve
    // a stale shell and React Router fully remounts. The bust param is harmless
    // and ignored by all routes.
    setTimeout(() => {
      window.location.replace(`/ai?cleared=${Date.now()}`);
    }, 600);
  };

  const handleDeleteMemory = () => {
    localStorage.removeItem('hiit-ai-custom-memory');
    localStorage.removeItem('hiit-ai-custom-response');
    setCustomMemory('');
    setCustomResponse('');
    toast({ title: 'Memory deleted', description: 'Your AI coach will start fresh.' });
  };

  const toggleInsight = (id: string) => {
    setInsightSuggestions(prev =>
      prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header
        className="sticky top-0 z-20 bg-background border-b border-border/60 flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: '12px' }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-semibold">Chat Settings</h1>
          <p className="text-xs text-muted-foreground">Customize your AI setting here</p>
        </div>
      </header>

      <div className="p-4 pb-28">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">General Settings</h2>
              </div>

              {/* Custom Response */}
              <div className="space-y-2">
                <Label>Response Style</Label>
                <Textarea
                  placeholder={'Tell the AI how you want it to respond. For example:\n"Always give me short bullet points"\n"Be tough and push me hard"\n"Explain things simply, I\'m a beginner"'}
                  value={customResponse}
                  onChange={(e) => setCustomResponse(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{customResponse.length}/300 — this is added to every conversation with your AI coach</p>
              </div>

              {/* Apple Health → AI consent (App Store 5.1.3) */}
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="space-y-1">
                  <Label>Use my health data for AI coaching</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow HIIT to send your activity, heart rate, and sleep — including data from Apple Health — to our AI provider (Google) to personalise your coaching. It is never used to train their models or for advertising. Off by default; you can turn it off anytime.
                  </p>
                </div>
                <Switch checked={aiHealthConsent} onCheckedChange={handleHealthConsentChange} />
              </div>

              {/* Custom Memory */}
              <div className="space-y-2">
                <Label>About Me</Label>
                <Textarea
                  placeholder={'Add personal context for your AI coach. For example:\n"I have a bad knee, avoid high-impact moves"\n"I train at 5am before work, keep it time-efficient"\n"I\'m vegetarian and lactose intolerant"'}
                  value={customMemory}
                  onChange={(e) => setCustomMemory(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{customMemory.length}/500 — your coach will always remember this about you</p>
              </div>

              {/* Insight Suggestion */}
              <div className="space-y-3">
                <Label>Insight Suggestion</Label>
                <div className="space-y-2">
                  {insightSuggestions.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          item.enabled
                            ? "border-destructive bg-destructive"
                            : "border-muted-foreground"
                        )}
                        onClick={() => toggleInsight(item.id)}
                      >
                        {item.enabled && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full h-12 rounded-2xl">
              Save Settings
            </Button>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">Privacy & Data</h2>
              </div>

              {/* Clear Chat History */}
              <div className="space-y-2">
                <Label>Clear chat history</Label>
                <p className="text-xs text-muted-foreground">
                  This will delete all previous conversations, memory appearance and other things.
                </p>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={handleClearHistory}
                >
                  Clear All
                </Button>
              </div>

              {/* Delete Assistant Memory */}
              <div className="space-y-2">
                <Label>Delete Assistant Memory</Label>
                <p className="text-xs text-muted-foreground">
                  This will delete all assistant data, including memory and custom response.
                </p>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={handleDeleteMemory}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full h-12 rounded-2xl">
              Save Settings
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
