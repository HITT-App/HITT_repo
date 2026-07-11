import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Loader2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages, useDirectMessageActions, useConversations } from "@/hooks/useDirectMessages";
import { useCommunityProfile } from "@/hooks/useCommunity";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday } from "date-fns";
import { ReportSheet } from "@/components/community/ReportSheet";

const CommunityChat = () => {
  const navigate = useNavigate();
  const { conversationId, userId } = useParams();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId || null);
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ contentId: string; reportedUserId: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, loading: messagesLoading } = useMessages(activeConversationId);
  const { getOrCreateConversation, sendMessage } = useDirectMessageActions();
  const { conversations } = useConversations();
  
  // Get the other user's profile
  const otherUserId = userId || (() => {
    if (!activeConversationId || !user) return undefined;
    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv) return undefined;
    return conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
  })();
  
  const { profile: otherUserProfile, loading: profileLoading } = useCommunityProfile(otherUserId);

  // If we have a userId but no conversationId, get or create the conversation
  useEffect(() => {
    const initConversation = async () => {
      if (userId && !conversationId && user) {
        const convId = await getOrCreateConversation(userId);
        if (convId) {
          setActiveConversationId(convId);
        }
      }
    };
    initConversation();
  }, [userId, conversationId, user, getOrCreateConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversationId || sending) return;
    
    setSending(true);
    await sendMessage(activeConversationId, newMessage.trim());
    setNewMessage("");
    setSending(false);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "HH:mm");
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  const isLoading = messagesLoading || profileLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/90 backdrop-blur-sm border-b border-border/40"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar 
          className="w-10 h-10 cursor-pointer" 
          onClick={() => otherUserId && navigate(`/community/user/${otherUserId}`)}
        >
          <AvatarImage src={otherUserProfile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(otherUserProfile?.display_name || otherUserProfile?.username)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {otherUserProfile?.display_name || otherUserProfile?.username || "Loading..."}
          </p>
          {otherUserProfile?.username && (
            <p className="text-xs text-muted-foreground">@{otherUserProfile.username}</p>
          )}
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={otherUserProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials(otherUserProfile?.display_name || otherUserProfile?.username)}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">
              {otherUserProfile?.display_name || otherUserProfile?.username}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                <div className="space-y-3">
                  {dateMessages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex items-center gap-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-[10px] mt-1 ${
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {formatMessageTime(message.created_at)}
                            {isOwn && (message.is_read ? " ✓✓" : " ✓")}
                          </p>
                        </div>
                        {!isOwn && (
                          <button
                            className="shrink-0 p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                            aria-label="Report message"
                            onClick={() => setReportTarget({ contentId: message.id, reportedUserId: message.sender_id })}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="pr-10"
            />
            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          <Button 
            size="icon" 
            className="bg-primary hover:bg-primary/90 rounded-full"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Report message dialog */}
      {reportTarget && (
        <ReportSheet
          open={!!reportTarget}
          onOpenChange={(o) => { if (!o) setReportTarget(null); }}
          contentType="dm"
          contentId={reportTarget.contentId}
          reportedUserId={reportTarget.reportedUserId}
        />
      )}
    </div>
  );
};

export default CommunityChat;
