import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings, Bot, Cat, Ghost, Sparkles, Dumbbell, Upload, Smile, Zap, X, Play, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VOICE_FEATURE_ENABLED } from '@/contexts/TTSContext';

// ElevenLabs voice IDs — stock voices available on all plans
const VOICES = [
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian — American Male' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica — American Female' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George — British Male' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Lily — British Female' },
  { id: '9BWtsMINqrJLrRacOk9x', label: 'Aria — American Female' },
  { id: 'iP95p4xoKVk53GoZ742B', label: 'Chris — American Male' },
];


const AVATAR_ICONS = [
  { id: 'bot', icon: Bot },
  { id: 'cat', icon: Cat },
  { id: 'ghost', icon: Ghost },
  { id: 'sparkles', icon: Sparkles },
  { id: 'dumbbell', icon: Dumbbell },
  { id: 'zap', icon: Zap },
];

const RESPONSE_TYPES = [
  { id: 'neutral', label: 'Neutral', icon: null },
  { id: 'motivating', label: 'Motivating', icon: Sparkles },
  { id: 'strict', label: 'Strict', icon: X },
];

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
  const [activeTab, setActiveTab] = useState('general');

  const [customResponse, setCustomResponse] = useState(() => localStorage.getItem('hiit-ai-custom-response') ?? '');
  const [shareData, setShareData] = useState(true);
  const [customMemory, setCustomMemory] = useState(() => localStorage.getItem('hiit-ai-custom-memory') ?? '');
  const [insightSuggestions, setInsightSuggestions] = useState(INSIGHT_SUGGESTIONS);
  const [assistantName, setAssistantName] = useState('HIIT');
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('hiit-ai-voice-enabled') === 'true');
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('hiit-ai-voice-id') ?? 'JBFqnCBsd6RMkjVDRZzb');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const previewAudioRef = { current: null as HTMLAudioElement | null };
  const [selectedAvatar, setSelectedAvatar] = useState('bot');
  const [responseType, setResponseType] = useState('neutral');
  const [dataSharing, setDataSharing] = useState(true);

  const handleSave = () => {
    localStorage.setItem('hiit-ai-custom-response', customResponse.trim());
    localStorage.setItem('hiit-ai-custom-memory', customMemory.trim());
    localStorage.setItem('hiit-ai-voice-enabled', voiceEnabled ? 'true' : 'false');
    localStorage.setItem('hiit-ai-voice-id', selectedVoice);
    toast({ title: 'Settings saved', description: 'Your AI preferences have been updated.' });
  };

  const previewVoice = async (voiceId: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(voiceId);

    // Create and unlock the audio element synchronously in the click handler —
    // iOS WKWebView blocks play() if called after an async gap (lost gesture context)
    const audio = new Audio();
    previewAudioRef.current?.pause();
    previewAudioRef.current = audio;
    // Silent unlock: lets iOS trust this element for future playback
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    audio.volume = 0;
    audio.play().catch(() => {});

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { setPreviewingVoice(null); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: "Hey! Ready to crush today's workout? Let's go!",
          voiceId,
        }),
      });

      if (!res.ok) { setPreviewingVoice(null); return; }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audio.volume = 1;
      audio.src = url;
      audio.onended = () => { URL.revokeObjectURL(url); setPreviewingVoice(null); };
      audio.onerror = () => setPreviewingVoice(null);
      await audio.play().catch(() => setPreviewingVoice(null));
    } catch {
      setPreviewingVoice(null);
    }
  };

  const handleClearHistory = () => {
    toast({ title: 'Chat history cleared', description: 'All previous conversations have been deleted.' });
  };

  const handleDeleteMemory = () => {
    toast({ title: 'Assistant memory deleted', description: 'All assistant data has been cleared.' });
  };

  const handleExportData = () => {
    toast({ title: 'Export started', description: 'Your data will be ready for download shortly.' });
  };

  const toggleInsight = (id: string) => {
    setInsightSuggestions(prev =>
      prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-semibold">Chat Settings</h1>
          <p className="text-xs text-muted-foreground">Customize your AI setting here</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
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

              {/* Share Data Toggle */}
              <div className="flex items-center justify-between py-2">
                <Label>Share data to HIIT</Label>
                <Switch checked={shareData} onCheckedChange={setShareData} />
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

          {/* Customize Tab */}
          <TabsContent value="customize" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">Personalization</h2>
              </div>

              {/* AI Assistant Name */}
              <div className="space-y-2">
                <Label>AI Assistant Name</Label>
                <div className="relative">
                  <Input
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Voice — hidden for v1.0, restored in v1.0.1 when VOICE_FEATURE_ENABLED = true */}
              {VOICE_FEATURE_ENABLED && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Voice Responses</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Coach reads responses aloud</p>
                  </div>
                  <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                </div>
                {voiceEnabled && (
                  <div className="space-y-2 pt-1">
                    {VOICES.map((voice) => (
                      <div
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all',
                          selectedVoice === voice.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-secondary/40 hover:bg-secondary/70'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {selectedVoice === voice.id
                            ? <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            : <div className="w-3.5 h-3.5 shrink-0" />}
                          <span className="text-sm font-medium">{voice.label}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                          onClick={(e) => { e.stopPropagation(); previewVoice(voice.id); }}
                          disabled={previewingVoice !== null}
                        >
                          {previewingVoice === voice.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <><Play className="w-3 h-3" />Preview</>}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Avatar Icon */}
              <div className="space-y-2">
                <Label>Avatar Icon</Label>
                <div className="flex gap-2">
                  {AVATAR_ICONS.map((avatar) => (
                    <Button
                      key={avatar.id}
                      variant={selectedAvatar === avatar.id ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className="rounded-xl"
                    >
                      <avatar.icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Response Type */}
              <div className="space-y-2">
                <Label>Response Type</Label>
                <div className="flex gap-2">
                  {RESPONSE_TYPES.map((type) => (
                    <Button
                      key={type.id}
                      variant={responseType === type.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setResponseType(type.id)}
                      className="rounded-full flex items-center gap-1"
                    >
                      {type.icon && <type.icon className="w-3 h-3" />}
                      {type.label}
                    </Button>
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

              {/* Data Sharing */}
              <div className="space-y-3">
                <Label>Data Sharing</Label>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    Shake your phone to randomize your account balances.
                  </p>
                  <Switch checked={dataSharing} onCheckedChange={setDataSharing} />
                </div>
              </div>

              {/* Export Data */}
              <div className="space-y-2">
                <Label>Export Data</Label>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={handleExportData}
                >
                  <span className="text-sm text-muted-foreground">
                    Export your data and conversations with HIIT
                  </span>
                  <Upload className="w-4 h-4" />
                </Button>
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
    </div>
  );
}
