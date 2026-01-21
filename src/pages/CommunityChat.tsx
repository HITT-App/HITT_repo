import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Settings, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  sender: "user" | "other";
  timestamp: string;
}

const CommunityChat = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", content: "Hey Julia! Nice profile! Let's get fit and healthy together.", sender: "other", timestamp: "11:25" },
    { id: "2", content: "Thanks a lot Makise! 😊 11:35 ✓✓", sender: "user", timestamp: "11:35" },
  ]);

  const otherUser = {
    name: "Julia F. Smith",
    title: "Community User",
    avatar: ""
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        content: newMessage,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUser.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {otherUser.name.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm">{otherUser.name}</p>
          <p className="text-xs text-muted-foreground">{otherUser.title}</p>
        </div>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-[10px] mt-1 ${
                  message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}>
                  {message.timestamp} {message.sender === "user" && "✓✓"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Type to start chatting..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommunityChat;
