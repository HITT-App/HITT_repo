import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, MessageSquare, Trash2, Plus, Bot, Sparkles, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
  message_count?: number;
  model?: string;
};

const MODEL_ICONS: Record<string, typeof Bot> = {
  gpt: Bot,
  gemini: Sparkles,
  perplexity: BarChart3,
  deepseek: BarChart3,
};

export default function MyConversations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: sortOrder === 'oldest' });

    if (error) {
      console.error('Failed to fetch conversations:', error);
      return;
    }

    // Add mock data for display
    const enriched = (data || []).map((conv, idx) => ({
      ...conv,
      message_count: Math.floor(Math.random() * 100) + 10,
      model: ['gpt', 'gemini', 'perplexity', 'deepseek'][idx % 4],
    }));

    setConversations(enriched);
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationToDelete.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete conversation' });
      return;
    }

    setConversations(prev => prev.filter(c => c.id !== conversationToDelete.id));
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
    toast({ title: 'Conversation deleted', description: "Don't worry, mate! You still have 30 days to restore it from your archive." });
  };

  const groupConversationsByDate = (convs: Conversation[]) => {
    const groups: Record<string, Conversation[]> = {};
    
    convs.forEach(conv => {
      const date = parseISO(conv.updated_at);
      let key: string;
      
      if (isToday(date)) {
        key = 'Today';
      } else if (isYesterday(date)) {
        key = 'Yesterday';
      } else {
        key = format(date, 'MMM dd, yyyy');
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(conv);
    });
    
    return groups;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = groupConversationsByDate(filteredConversations);

  const openDeleteDialog = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(conv);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-semibold">My Conversations</h1>
          <p className="text-xs text-muted-foreground">Customize your AI setting here</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-4">
        {/* Filters */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            All Conversations ({conversations.length})
          </p>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for a conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1">
          <div className="space-y-4 pb-20">
            {Object.entries(groupedConversations).map(([date, convs]) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
                  <span className="text-xs text-muted-foreground">{convs.length} Total</span>
                </div>
                <div className="space-y-2">
                  {convs.map((conv) => {
                    const ModelIcon = MODEL_ICONS[conv.model || 'gpt'] || Bot;
                    return (
                      <div
                        key={conv.id}
                        className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/ai-coach?conversation=${conv.id}`)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                          <ModelIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conv.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              {conv.model?.toUpperCase() || 'GPT'}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {conv.message_count} Total
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={(e) => openDeleteDialog(conv, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Add New Conversation Button */}
        <Button
          className="w-full h-12 rounded-2xl"
          onClick={() => navigate('/ai-coach')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Conversation
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <DialogTitle className="text-xl">Delete Conversation?</DialogTitle>
            <DialogDescription className="text-center">
              Don't worry, mate! You still have 30 days to restore it from your archive. 🙌
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            <Button
              variant="destructive"
              className="w-full h-12 rounded-2xl"
              onClick={handleDeleteConversation}
            >
              Yes, Clear All
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(false)}
            >
              <span className="mr-2">×</span> No, nevermind
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
