import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Settings, Bot, Cat, Ghost, Sparkles, Dumbbell, Upload, Smile, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const AI_MODELS = [
  { id: 'gpt', label: 'GPT' },
  { id: 'llama', label: 'LLama' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'gemini', label: 'Gemini' },
];

const VOICES = [
  { id: 'peter', label: 'Caucasian Male (Peter)' },
  { id: 'sarah', label: 'Caucasian Female (Sarah)' },
  { id: 'james', label: 'British Male (James)' },
  { id: 'aisha', label: 'African Female (Aisha)' },
];

const LANGUAGES = [
  { id: 'en-gb', label: 'English (United Kingdom)' },
  { id: 'en-us', label: 'English (United States)' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
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
  { id: 'health_metrics', label: 'Health Metrics', enabled: false },
  { id: 'activity_suggestion', label: 'Activity Suggestion', enabled: true },
  { id: 'nutrition_insight', label: 'Nutrition Insight', enabled: false },
  { id: 'sleep_monitoring', label: 'Sleep Monitoring', enabled: true },
];

export default function ChatSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  // General settings state
  const [selectedModel, setSelectedModel] = useState('gpt');
  const [mode, setMode] = useState<'chatbot' | 'immersive'>('chatbot');
  const [customResponse, setCustomResponse] = useState('');
  const [shareData, setShareData] = useState(true);
  const [customMemory, setCustomMemory] = useState('');
  const [insightSuggestions, setInsightSuggestions] = useState(INSIGHT_SUGGESTIONS);

  // Customize settings state
  const [assistantName, setAssistantName] = useState('sandow AI');
  const [selectedVoice, setSelectedVoice] = useState('peter');
  const [selectedLanguage, setSelectedLanguage] = useState('en-gb');
  const [selectedAvatar, setSelectedAvatar] = useState('bot');
  const [responseType, setResponseType] = useState('neutral');

  // Privacy settings state
  const [dataSharing, setDataSharing] = useState(true);

  const handleSave = () => {
    toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
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
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Chat Settings</h1>
          <p className="text-xs text-muted-foreground">Customize your AI setting here</p>
        </div>
      </header>

      <div className="p-4">
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

              {/* AI Model */}
              <div className="space-y-2">
                <Label>AI Model</Label>
                <div className="flex gap-2">
                  {AI_MODELS.map((model) => (
                    <Button
                      key={model.id}
                      variant={selectedModel === model.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedModel(model.id)}
                      className="rounded-full"
                    >
                      {model.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={mode === 'chatbot' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('chatbot')}
                    className="rounded-full"
                  >
                    Chatbot
                  </Button>
                  <Button
                    variant={mode === 'immersive' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('immersive')}
                    className="rounded-full"
                  >
                    Immersive
                  </Button>
                </div>
              </div>

              {/* Custom Response */}
              <div className="space-y-2">
                <Label>Custom Response</Label>
                <Textarea
                  placeholder="Enter your main text here..."
                  value={customResponse}
                  onChange={(e) => setCustomResponse(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">0/300</p>
              </div>

              {/* Share Data Toggle */}
              <div className="flex items-center justify-between py-2">
                <Label>Share data to sandow</Label>
                <Switch checked={shareData} onCheckedChange={setShareData} />
              </div>

              {/* Custom Memory */}
              <div className="space-y-2">
                <Label>Custom Memory</Label>
                <Textarea
                  placeholder="Enter your main text here..."
                  value={customMemory}
                  onChange={(e) => setCustomMemory(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">0/300</p>
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

              {/* Voice Selection */}
              <div className="space-y-2">
                <Label>Voice Selection</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language Preference */}
              <div className="space-y-2">
                <Label>Language Preference</Label>
                <div className="flex gap-2">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    US
                  </Button>
                </div>
              </div>

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
                    Export your data and conversations with sandow AI
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
  );
}
