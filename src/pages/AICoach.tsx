import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAIChat } from '@/hooks/useAIChat';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { CoachOnboarding } from '@/components/coach/CoachOnboarding';
import { VoiceMode } from '@/components/coach/VoiceMode';
import { ClearDataDialog } from '@/components/coach/ClearDataDialog';
import { OutOfTokensDialog } from '@/components/coach/OutOfTokensDialog';
import { HIITPlusSheet } from '@/components/coach/SandowPlusSheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, MessageSquare, Trash2, Settings, Mic, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

const ONBOARDING_KEY = 'coach_onboarding_complete';

export default function AICoach() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [showSidebar, setShowSidebar] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showOutOfTokens, setShowOutOfTokens] = useState(false);
  const [showPlusSheet, setShowPlusSheet] = useState(false);

  const { profile: healthProfile } = useHealthProfile();
  const { messages, isLoading, error, sendMessage, loadMessages, setMessages } = useAIChat(currentConversation, healthProfile);

  // Check if onboarding is complete
  useEffect(() => {
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY);
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, []);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (data) setConversations(data);
    };

    fetchConversations();
  }, [user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation);
      setSearchParams({ conversation: currentConversation });
    } else {
      setMessages([]);
      setSearchParams({});
    }
  }, [currentConversation, loadMessages, setMessages, setSearchParams]);

  const handleOnboardingComplete = (_mode: string) => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const createNewConversation = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create conversation' });
      return null;
    }

    setConversations(prev => [data, ...prev]);
    setCurrentConversation(data.id);
    setShowSidebar(false);
    return data.id;
  }, [user, toast]);

  const handleSendMessage = useCallback(async (content: string, imageUrl?: string) => {
    let convId = currentConversation;

    // Create new conversation if none exists
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
    }

    sendMessage(content, convId, imageUrl);

    // Update conversation title with first message
    if (messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', convId);

      setConversations(prev =>
        prev.map(c => (c.id === convId ? { ...c, title } : c))
      );
    }
  }, [currentConversation, createNewConversation, sendMessage, messages.length]);

  const handleVoiceTranscript = (text: string) => {
    setShowVoiceMode(false);
    if (text.trim()) {
      handleSendMessage(text);
    }
  };

  const deleteConversation = async (convId: string) => {
    await supabase.from('conversations').delete().eq('id', convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (currentConversation === convId) {
      setCurrentConversation(null);
    }
    toast({ title: 'Conversation deleted' });
  };

  const handleClearAllData = async () => {
    // Delete all conversations for the user
    if (!user) return;
    await supabase.from('conversations').delete().eq('user_id', user.id);
    setConversations([]);
    setCurrentConversation(null);
    toast({ title: 'All data cleared', description: 'Your chat history and AI memory have been reset.' });
  };

  const handleUpgradeToPro = () => {
    setShowPlusSheet(true);
  };

  const handleSubscribe = (plan: 'free' | 'plus') => {
    toast({ 
      title: plan === 'plus' ? 'Welcome to Plus!' : 'Free plan selected',
      description: plan === 'plus' ? 'You now have access to all AI features.' : 'You can upgrade anytime.'
    });
  };

  // Show onboarding
  if (showOnboarding) {
    return (
      <div className="h-screen bg-background">
        <CoachOnboarding onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // Show voice mode (legacy)
  if (showVoiceMode) {
    return (
      <VoiceMode 
        onTranscript={handleVoiceTranscript}
        onClose={() => setShowVoiceMode(false)}
      />
    );
  }


  return (
    <div
      className="h-[100dvh] flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: 'var(--safe-area-inset-top, 0px)' }}
    >
      {/* AICoach uses h-[100dvh] not `fixed inset-0`, so the global safe-top
          rule doesn't apply here — keep the explicit paddingTop. */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background">
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground truncate">HIIT AI</h1>
            <p className="text-xs text-muted-foreground">241 chats left</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation" onClick={() => navigate('/chat-settings')}>
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation hidden xs:flex" onClick={() => navigate('/my-conversations')}>
            <List className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={createNewConversation}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Dialogs */}
      <ClearDataDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        onConfirm={handleClearAllData}
        totalChats={conversations.length}
      />
      <OutOfTokensDialog
        open={showOutOfTokens}
        onOpenChange={setShowOutOfTokens}
        onUpgrade={handleUpgradeToPro}
      />
      <HIITPlusSheet
        open={showPlusSheet}
        onOpenChange={setShowPlusSheet}
        onSubscribe={handleSubscribe}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation History */}
        <aside
          className={`
            absolute md:relative z-10 h-full w-64 bg-background border-r border-border/60
            transform transition-transform duration-300
            ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="p-3 border-b border-border/60">
            <Button
              onClick={createNewConversation}
              className="w-full justify-start gap-2"
              variant="secondary"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-57px)]">
            <div className="p-2 space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`
                    group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors
                    ${currentConversation === conv.id ? 'bg-secondary' : 'active:bg-secondary/50'}
                  `}
                  onClick={() => {
                    setCurrentConversation(conv.id);
                    setShowSidebar(false);
                  }}
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Overlay for mobile sidebar */}
        {showSidebar && (
          <div
            className="absolute inset-0 bg-background/50 z-0 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onSend={handleSendMessage}
            error={error}
            onVoiceClick={undefined}
          />
        </main>
      </div>
    </div>
  );
}
