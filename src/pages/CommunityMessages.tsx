import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConversations } from "@/hooks/useDirectMessages";
import { formatDistanceToNow } from "date-fns";

const CommunityMessages = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { conversations, loading: isLoading } = useConversations();

  const filteredConversations = conversations?.filter((conv) =>
    conv.other_user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="shrink-0 bg-background border-b border-border/60">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold">Messages</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "No conversations found" : "No messages yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a conversation from someone's profile
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => navigate(`/community/chat/${conversation.other_user?.user_id}`)}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
                <AvatarFallback>
                  {conversation.other_user?.display_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">
                    {conversation.other_user?.display_name || "Unknown User"}
                  </span>
                  {conversation.last_message_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  @{conversation.other_user?.username || "unknown"}
                </p>
              </div>
              {conversation.unread_count > 0 && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-medium">
                    {conversation.unread_count}
                  </span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default CommunityMessages;
