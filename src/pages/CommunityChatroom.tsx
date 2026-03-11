import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, ChevronDown, MessageCircle, Users,
  Plus, Image as ImageIcon, Smile, X, Reply, Play, Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import GifPicker from "@/components/chatroom/GifPicker";
import VoiceRecorder from "@/components/chatroom/VoiceRecorder";
import ImageLightbox from "@/components/chatroom/ImageLightbox";
import ReplyPreview from "@/components/chatroom/ReplyPreview";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string;
  message_type?: string;
  media_url?: string;
  reply_to_id?: string;
}

const REACTIONS = ["🔥", "💪", "❤️", "😂", "👏"];

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  let label = format(d, "MMMM d, yyyy");
  if (isToday(d)) label = "Today";
  else if (isYesterday(d)) label = "Yesterday";

  return (
    <div className="flex items-center justify-center py-4">
      <span className="text-[11px] font-medium text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

function VoicePlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () =>
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    );
    audio.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    return () => { audio.pause(); audio.src = ""; };
  }, [src]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button onClick={toggle} className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        {playing ? <Pause className="h-3.5 w-3.5 text-primary" /> : <Play className="h-3.5 w-3.5 text-primary ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">{fmt(duration)}</span>
      </div>
    </div>
  );
}

export default function CommunityChatroom() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { uploadImage, uploading } = useImageUpload();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [recording, setRecording] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chatroom_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as ChatMessage[]);
      setLoading(false);
    };
    fetchMessages();

    const channel = supabase
      .channel("chatroom")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chatroom_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Presence for typing
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel("chatroom-presence", {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const typing: string[] = [];
        Object.entries(state).forEach(([uid, data]: [string, any]) => {
          if (uid !== user.id && data?.[0]?.typing) {
            typing.push(data[0].name || "Someone");
          }
        });
        setTypingUsers(typing);
      })
      .subscribe();

    return () => { supabase.removeChannel(presenceChannel); };
  }, [user]);

  useEffect(() => {
    scrollToBottom(!loading);
  }, [messages, loading, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    const channel = supabase.channel("chatroom-presence", {
      config: { presence: { key: user?.id || "" } },
    });
    channel.track({ typing: isTyping, name: displayName });
  }, [user, displayName]);

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const sendMessage = async (
    content: string,
    messageType: string = "text",
    mediaUrl?: string
  ) => {
    if (!user) return;
    setSending(true);
    await supabase.from("chatroom_messages").insert({
      user_id: user.id,
      content,
      display_name: displayName,
      message_type: messageType,
      media_url: mediaUrl || null,
      reply_to_id: replyTo?.id || null,
    } as any);
    setNewMessage("");
    setReplyTo(null);
    setShowAttachments(false);
    setSending(false);
    broadcastTyping(false);
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage(newMessage.trim(), "text");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "community-images");
    if (url) {
      await sendMessage("", "image", url);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGifSelect = (gifUrl: string) => {
    sendMessage("", "gif", gifUrl);
  };

  const handleVoiceComplete = async (blob: Blob) => {
    if (!user) return;
    setSending(true);
    const fileName = `${user.id}/${Date.now()}-voice.webm`;
    const { error } = await supabase.storage
      .from("community-images")
      .upload(fileName, blob, { cacheControl: "3600", contentType: "audio/webm" });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from("community-images")
        .getPublicUrl(fileName);
      await sendMessage("", "voice", publicUrl);
    }
    setSending(false);
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => {
      const existing = prev[msgId] || [];
      if (existing.includes(emoji)) {
        return { ...prev, [msgId]: existing.filter((e) => e !== emoji) };
      }
      return { ...prev, [msgId]: [...existing, emoji] };
    });
    setShowReactionsFor(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getReplyMessage = (replyId?: string) => {
    if (!replyId) return null;
    return messages.find((m) => m.id === replyId);
  };

  const renderMessageContent = (msg: ChatMessage, isOwn: boolean) => {
    const type = msg.message_type || "text";

    switch (type) {
      case "image":
        return (
          <button onClick={() => setLightboxSrc(msg.media_url || "")} className="block">
            <img
              src={msg.media_url}
              alt="Shared image"
              className="rounded-xl max-w-[220px] max-h-[220px] object-cover"
              loading="lazy"
            />
          </button>
        );
      case "gif":
        return (
          <img
            src={msg.media_url}
            alt="GIF"
            className="rounded-xl max-w-[220px] max-h-[200px] object-cover"
            loading="lazy"
          />
        );
      case "voice":
        return <VoicePlayer src={msg.media_url || ""} />;
      default:
        return <span>{msg.content}</span>;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate("/community")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-[15px] tracking-tight">Community Chat</h1>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[11px] text-muted-foreground">{messages.length} messages</span>
          </div>
        </div>
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth"
      >
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to say hello!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg, i) => {
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const isOwn = msg.user_id === user?.id;
              const isNewDay = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));
              const isConsecutive = !isNewDay && prevMsg?.user_id === msg.user_id;
              const initials = (msg.display_name || "U").slice(0, 2).toUpperCase();
              const replyMsg = getReplyMessage(msg.reply_to_id);
              const msgReactions = reactions[msg.id] || [];

              return (
                <div key={msg.id}>
                  {isNewDay && <DateSeparator date={msg.created_at} />}

                  <div
                    className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""} ${isConsecutive ? "mt-0.5" : "mt-3"}`}
                  >
                    {!isOwn && (
                      <div className="w-7 shrink-0">
                        {!isConsecutive && (
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] font-semibold bg-secondary text-muted-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={`max-w-[78%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                      {!isOwn && !isConsecutive && (
                        <p className="text-[11px] font-medium text-muted-foreground mb-0.5 px-1">
                          {msg.display_name}
                        </p>
                      )}

                      {/* Reply quote */}
                      {replyMsg && (
                        <div className="px-2.5 py-1.5 mb-0.5 rounded-lg bg-muted/50 border-l-2 border-primary/50 max-w-full">
                          <p className="text-[10px] font-semibold text-primary truncate">{replyMsg.display_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {replyMsg.message_type === "image" ? "📷 Photo" :
                             replyMsg.message_type === "voice" ? "🎤 Voice" :
                             replyMsg.message_type === "gif" ? "GIF" :
                             replyMsg.content.slice(0, 50)}
                          </p>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`px-3.5 py-2 text-[14px] leading-relaxed relative group ${
                          (msg.message_type === "image" || msg.message_type === "gif")
                            ? "p-1 bg-transparent"
                            : isOwn
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-lg"
                            : "bg-secondary text-foreground rounded-2xl rounded-tl-lg"
                        }`}
                        onDoubleClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                        onClick={() => {
                          if (showReactionsFor && showReactionsFor !== msg.id) setShowReactionsFor(null);
                        }}
                      >
                        {renderMessageContent(msg, isOwn)}

                        {/* Reply button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }}
                          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full bg-secondary flex items-center justify-center"
                        >
                          <Reply className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Reactions display */}
                      {msgReactions.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 px-1">
                          {msgReactions.map((emoji, idx) => (
                            <span key={idx} className="text-xs bg-secondary rounded-full px-1.5 py-0.5">{emoji}</span>
                          ))}
                        </div>
                      )}

                      {/* Reaction picker */}
                      {showReactionsFor === msg.id && (
                        <div className="flex gap-1 mt-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg">
                          {REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="text-base hover:scale-125 transition-transform active:scale-95"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      {(!messages[i + 1] || messages[i + 1]?.user_id !== msg.user_id) && (
                        <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isOwn ? "text-right" : ""}`}>
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-4 h-9 w-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center z-20 transition-all active:scale-95"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* GIF Picker */}
      <GifPicker open={showGifPicker} onClose={() => setShowGifPicker(false)} onSelect={handleGifSelect} />

      {/* Reply preview */}
      {replyTo && <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />}

      {/* Attachment options */}
      {showAttachments && (
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-t border-border/40">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">Photo</span>
          </button>
          <button
            onClick={() => { setShowGifPicker(true); setShowAttachments(false); }}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-accent/30 flex items-center justify-center">
              <Smile className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">GIF</span>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Input */}
      <div className="border-t border-border/60 bg-card/80 backdrop-blur-xl px-3 py-2.5 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          {!recording && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full shrink-0"
              onClick={() => setShowAttachments(!showAttachments)}
            >
              {showAttachments ? (
                <X className="h-4.5 w-4.5 text-muted-foreground" />
              ) : (
                <Plus className="h-4.5 w-4.5 text-muted-foreground" />
              )}
            </Button>
          )}

          {recording ? (
            <VoiceRecorder
              recording={recording}
              onStartRecording={() => setRecording(true)}
              onStopRecording={() => setRecording(false)}
              onRecordComplete={handleVoiceComplete}
            />
          ) : (
            <>
              <div className="flex-1 flex items-center gap-2 bg-secondary/60 rounded-full px-4 py-1 border border-border/40 focus-within:border-primary/30 transition-colors">
                <input
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm py-2.5 outline-none placeholder:text-muted-foreground/60"
                />
              </div>

              {newMessage.trim() ? (
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={handleSend}
                  disabled={sending || uploading}
                >
                  {sending || uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              ) : (
                <VoiceRecorder
                  recording={recording}
                  onStartRecording={() => setRecording(true)}
                  onStopRecording={() => setRecording(false)}
                  onRecordComplete={handleVoiceComplete}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
