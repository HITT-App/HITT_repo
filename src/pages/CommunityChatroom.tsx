import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, ChevronDown, MessageCircle, Users,
  Plus, Image as ImageIcon, Smile, X, Reply, Play, Pause,
  Shield, Trash2, Pin, MoreVertical, PinOff, Settings, Megaphone,
  Paintbrush, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
  is_pinned?: boolean;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface BroadcastNotice {
  text: string;
  sender: string;
  timestamp: number;
}

const REACTIONS = ["🔥", "💪", "❤️", "😂", "👏"];

const BACKGROUND_PRESETS = [
  { id: "none", label: "Default", value: "", preview: "bg-background" },
  { id: "gradient-sunset", label: "Sunset", value: "linear-gradient(135deg, hsl(20 80% 12%), hsl(340 60% 15%))", preview: "bg-gradient-to-br from-orange-950 to-rose-950" },
  { id: "gradient-ocean", label: "Ocean", value: "linear-gradient(135deg, hsl(200 70% 10%), hsl(220 60% 18%))", preview: "bg-gradient-to-br from-cyan-950 to-blue-950" },
  { id: "gradient-forest", label: "Forest", value: "linear-gradient(135deg, hsl(140 50% 10%), hsl(160 40% 15%))", preview: "bg-gradient-to-br from-green-950 to-emerald-950" },
  { id: "gradient-midnight", label: "Midnight", value: "linear-gradient(135deg, hsl(250 40% 10%), hsl(280 50% 14%))", preview: "bg-gradient-to-br from-indigo-950 to-purple-950" },
  { id: "gradient-ember", label: "Ember", value: "linear-gradient(135deg, hsl(0 60% 12%), hsl(30 50% 10%))", preview: "bg-gradient-to-br from-red-950 to-amber-950" },
  { id: "gradient-slate", label: "Slate", value: "linear-gradient(135deg, hsl(210 20% 12%), hsl(220 15% 18%))", preview: "bg-gradient-to-br from-slate-900 to-slate-800" },
];

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  let label = format(d, "MMMM d, yyyy");
  if (isToday(d)) label = "Today";
  else if (isYesterday(d)) label = "Yesterday";

  return (
    <div className="flex items-center justify-center py-3">
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
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
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
  const { isAdmin } = useAdminRole();
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
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [chatBackground, setChatBackground] = useState("");
  const [noticeText, setNoticeText] = useState("");
  const [sendingNotice, setSendingNotice] = useState(false);
  const [activeNotice, setActiveNotice] = useState<BroadcastNotice | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";

  const pinnedMessage = messages.find((m) => m.is_pinned);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 2000);
    }
  }, []);

  // Load chatroom background from app_settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "chatroom_background")
        .maybeSingle();
      if (data?.value) {
        setChatBackground(data.value);
      }
    };
    loadSettings();
  }, []);

  // Fetch admin user IDs for badge display
  useEffect(() => {
    const fetchAdminIds = async () => {
      const { data } = await supabase
        .from("user_roles" as any)
        .select("user_id")
        .eq("role", "admin");
      if (data) {
        setAdminUserIds(new Set((data as any[]).map((r: any) => r.user_id)));
      }
    };
    fetchAdminIds();
  }, []);

  // Fetch profiles for all unique user_ids in messages
  const fetchUserProfiles = useCallback(async (userIds: string[]) => {
    const newIds = userIds.filter((id) => !userProfiles[id]);
    if (newIds.length === 0) return;

    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", newIds);

    if (data) {
      const profileMap: Record<string, UserProfile> = {};
      data.forEach((p) => { profileMap[p.user_id] = p; });
      setUserProfiles((prev) => ({ ...prev, ...profileMap }));
    }
  }, [userProfiles]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chatroom_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) {
        const msgs = data as unknown as ChatMessage[];
        setMessages(msgs);
        const userIds = [...new Set(msgs.map((m) => m.user_id))];
        fetchUserProfiles(userIds);
      }
      setLoading(false);
    };
    fetchMessages();

    const channel = supabase
      .channel("chatroom")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chatroom_messages" }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages((prev) => [...prev, newMsg]);
        fetchUserProfiles([newMsg.user_id]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chatroom_messages" }, (payload) => {
        const deletedId = (payload.old as any).id;
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chatroom_messages" }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast channel for admin notices
  useEffect(() => {
    const broadcastChannel = supabase.channel("chatroom-broadcast");

    broadcastChannel
      .on("broadcast", { event: "admin_notice" }, (payload) => {
        const notice = payload.payload as BroadcastNotice;
        setActiveNotice(notice);
        setNoticeDismissed(false);
        // Auto-dismiss after 30 seconds
        setTimeout(() => setActiveNotice(null), 30000);
      })
      .subscribe();

    return () => { supabase.removeChannel(broadcastChannel); };
  }, []);

  // Presence for typing + online count
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel("chatroom-presence", {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const keys = Object.keys(state);
        setOnlineCount(keys.length);
        const typing: string[] = [];
        Object.entries(state).forEach(([uid, data]: [string, any]) => {
          if (uid !== user.id && data?.[0]?.typing) {
            typing.push(data[0].name || "Someone");
          }
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ typing: false, name: displayName });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [user, displayName]);

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

  const sendMessage = async (content: string, messageType = "text", mediaUrl?: string) => {
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
    if (url) await sendMessage("", "image", url);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGifSelect = (gifUrl: string) => sendMessage("", "gif", gifUrl);

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
      return existing.includes(emoji)
        ? { ...prev, [msgId]: existing.filter((e) => e !== emoji) }
        : { ...prev, [msgId]: [...existing, emoji] };
    });
    setShowReactionsFor(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getReplyMessage = (replyId?: string) => replyId ? messages.find((m) => m.id === replyId) : null;

  const getUserDisplay = (userId: string, fallbackName?: string) => {
    const p = userProfiles[userId];
    return {
      name: p?.display_name || fallbackName || "User",
      avatar: p?.avatar_url || null,
    };
  };

  // Admin actions
  const handleDeleteMessage = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("chatroom_messages")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete message");
    } else {
      toast.success("Message deleted");
      await supabase.from("moderation_logs").insert({
        moderator_id: user?.id,
        action_type: "delete_message",
        target_type: "chatroom_message",
        target_id: deleteTarget.id,
        reason: "Admin moderation",
      } as any);
    }
    setDeleteTarget(null);
  };

  const handleTogglePin = async (msg: ChatMessage) => {
    const newPinState = !msg.is_pinned;
    if (newPinState) {
      await supabase
        .from("chatroom_messages")
        .update({ is_pinned: false } as any)
        .eq("is_pinned", true);
    }
    const { error } = await supabase
      .from("chatroom_messages")
      .update({ is_pinned: newPinState } as any)
      .eq("id", msg.id);
    if (error) {
      toast.error("Failed to update pin");
    } else {
      toast.success(newPinState ? "Message pinned" : "Message unpinned");
    }
  };

  const handleSetBackground = async (bgValue: string) => {
    setChatBackground(bgValue);
    // Upsert to app_settings
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", "chatroom_background")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("app_settings")
        .update({ value: bgValue, updated_by: user?.id, updated_at: new Date().toISOString() } as any)
        .eq("key", "chatroom_background");
    } else {
      await supabase
        .from("app_settings")
        .insert({ key: "chatroom_background", value: bgValue, updated_by: user?.id } as any);
    }
    toast.success("Background updated");
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBg(true);
    const url = await uploadImage(file, "app-assets");
    if (url) {
      const bgValue = `url(${url}) center/cover no-repeat`;
      await handleSetBackground(bgValue);
    } else {
      toast.error("Failed to upload image");
    }
    setUploadingBg(false);
    if (bgFileInputRef.current) bgFileInputRef.current.value = "";
  };

  const isCustomImageBg = chatBackground.startsWith("url(");
  const isVideoBg = chatBackground.startsWith("video:");
  const isCustomBg = isCustomImageBg || isVideoBg;

  const handleSendNotice = async () => {
    if (!noticeText.trim()) return;
    setSendingNotice(true);

    const notice: BroadcastNotice = {
      text: noticeText.trim(),
      sender: displayName,
      timestamp: Date.now(),
    };

    // Broadcast to all connected users
    const broadcastChannel = supabase.channel("chatroom-broadcast");
    await broadcastChannel.subscribe();
    await broadcastChannel.send({
      type: "broadcast",
      event: "admin_notice",
      payload: notice,
    });

    // Also show it locally
    setActiveNotice(notice);
    setNoticeDismissed(false);
    setTimeout(() => setActiveNotice(null), 30000);

    setNoticeText("");
    setSendingNotice(false);
    toast.success("Notice sent to all users");
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const type = msg.message_type || "text";
    switch (type) {
      case "image":
        return (
          <button onClick={() => setLightboxSrc(msg.media_url || "")} className="block">
            <img src={msg.media_url} alt="Shared image" className="rounded-xl max-w-[220px] max-h-[220px] object-cover" loading="lazy" />
          </button>
        );
      case "gif":
        return <img src={msg.media_url} alt="GIF" className="rounded-xl max-w-[220px] max-h-[200px] object-cover" loading="lazy" />;
      case "voice":
        return <VoicePlayer src={msg.media_url || ""} />;
      default:
        return <span>{msg.content}</span>;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-card/80 backdrop-blur-xl z-10 shrink-0">
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
            <span className="text-[11px] text-muted-foreground">
              {onlineCount} online · {messages.length} messages
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setShowAdminPanel(true)}
              >
                <Settings className="h-4 w-4 text-primary" />
              </Button>
              <div className="h-6 px-2 rounded-full bg-primary/10 flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary">Mod</span>
              </div>
            </>
          )}
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Active broadcast notice */}
      {activeNotice && !noticeDismissed && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-primary/10 border-b border-primary/20 shrink-0 animate-in slide-in-from-top-2 duration-300">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Admin Notice</p>
              <span className="text-[9px] text-muted-foreground">from {activeNotice.sender}</span>
            </div>
            <p className="text-[13px] text-foreground mt-0.5 leading-snug">{activeNotice.text}</p>
          </div>
          <button
            onClick={() => setNoticeDismissed(true)}
            className="h-6 w-6 rounded-full bg-secondary/80 flex items-center justify-center shrink-0"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Pinned message banner */}
      {pinnedMessage && (
        <button
          onClick={() => scrollToMessage(pinnedMessage.id)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10 shrink-0 text-left hover:bg-primary/10 transition-colors"
        >
          <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-primary">Pinned Message</p>
            <p className="text-[12px] text-foreground/70 truncate">
              {pinnedMessage.message_type !== "text"
                ? `📎 ${pinnedMessage.message_type}`
                : pinnedMessage.content.slice(0, 80)}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(pinnedMessage);
              }}
              className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0"
            >
              <PinOff className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </button>
      )}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 scroll-smooth"
        style={chatBackground ? { background: chatBackground } : undefined}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
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
              const { name: senderName, avatar: senderAvatar } = getUserDisplay(msg.user_id, msg.display_name);
              const initials = senderName.slice(0, 2).toUpperCase();
              const replyMsg = getReplyMessage(msg.reply_to_id);
              const msgReactions = reactions[msg.id] || [];
              const isSenderAdmin = adminUserIds.has(msg.user_id);

              return (
                <div key={msg.id} id={`msg-${msg.id}`} className="transition-all duration-300 rounded-lg">
                  {isNewDay && <DateSeparator date={msg.created_at} />}

                  <div className={`flex gap-2.5 ${isConsecutive ? "mt-0.5" : "mt-4"}`}>
                    {/* Avatar */}
                    <div className="w-9 shrink-0 self-end">
                      {!isConsecutive && (
                        <Avatar className="h-9 w-9 ring-2 ring-border/30">
                          {senderAvatar && <AvatarImage src={senderAvatar} alt={senderName} />}
                          <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>

                    <div className="max-w-[75%] items-start flex flex-col">
                      {/* Sender name + admin badge */}
                      {!isConsecutive && (
                        <div className="flex items-center gap-1.5 mb-1 px-1.5">
                          <p className="text-[12px] font-semibold text-foreground/80">
                            {isOwn ? "You" : senderName}
                          </p>
                          {isSenderAdmin && (
                            <div className="flex items-center gap-0.5 bg-primary/10 rounded-full px-1.5 py-0.5">
                              <Shield className="h-2.5 w-2.5 text-primary" />
                              <span className="text-[9px] font-bold text-primary">ADMIN</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reply quote */}
                      {replyMsg && (
                        <div className="px-2.5 py-1.5 mb-0.5 rounded-lg bg-muted/50 border-l-2 border-primary/50 max-w-full">
                          <p className="text-[10px] font-semibold text-primary truncate">
                            {getUserDisplay(replyMsg.user_id, replyMsg.display_name).name}
                          </p>
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
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tl-md"
                            : "bg-secondary text-foreground rounded-2xl rounded-tl-md"
                        } ${msg.is_pinned ? "ring-1 ring-primary/30" : ""}`}
                        onDoubleClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                        onClick={() => {
                          if (showReactionsFor && showReactionsFor !== msg.id) setShowReactionsFor(null);
                        }}
                      >
                        {renderMessageContent(msg)}

                        {/* Pin indicator on message */}
                        {msg.is_pinned && (
                          <Pin className="absolute -top-1.5 -right-1.5 h-3 w-3 text-primary" />
                        )}

                        {/* Action buttons */}
                        <div className={`absolute -right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }}
                            className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center"
                          >
                            <Reply className="h-3 w-3 text-muted-foreground" />
                          </button>
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                                  <MoreVertical className="h-3 w-3 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[140px]">
                                <DropdownMenuItem onClick={() => handleTogglePin(msg)}>
                                  {msg.is_pinned ? (
                                    <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</>
                                  ) : (
                                    <><Pin className="h-3.5 w-3.5 mr-2" /> Pin message</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(msg)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
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
                        <div className="flex gap-1 mt-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-10">
                          {REACTIONS.map((emoji) => (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="text-base hover:scale-125 transition-transform active:scale-95">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      {(!messages[i + 1] || messages[i + 1]?.user_id !== msg.user_id) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 px-1.5">
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
          className="absolute bottom-28 right-4 h-9 w-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center z-20 transition-all active:scale-95"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Admin Panel Dialog */}
      <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Admin Controls
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Background Picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Paintbrush className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Chat Background</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isActive = !isCustomImageBg && chatBackground === preset.value;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSetBackground(preset.value)}
                      className={`relative flex flex-col items-center gap-1.5 p-1.5 rounded-xl border-2 transition-all ${
                        isActive
                          ? "border-primary shadow-md"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <div className={`h-10 w-full rounded-lg ${preset.preview} ${!preset.value ? "border border-border/60" : ""}`} />
                      <span className="text-[10px] font-medium text-muted-foreground">{preset.label}</span>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
                {/* Custom image upload tile */}
                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={uploadingBg}
                  className={`relative flex flex-col items-center gap-1.5 p-1.5 rounded-xl border-2 transition-all ${
                    isCustomImageBg
                      ? "border-primary shadow-md"
                      : "border-dashed border-border/50 hover:border-border"
                  }`}
                >
                  {isCustomImageBg ? (
                    <div
                      className="h-10 w-full rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: chatBackground.match(/url\(([^)]+)\)/)?.[0] || "" }}
                    />
                  ) : (
                    <div className="h-10 w-full rounded-lg bg-secondary/60 flex items-center justify-center">
                      {uploadingBg ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-muted-foreground">Custom</span>
                  {isCustomImageBg && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              </div>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleBgImageUpload}
              />
            </div>

            {/* Broadcast Notice */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Broadcast Notice</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Send a pop-up notice visible to all users currently in the chatroom.
              </p>
              <textarea
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder="Type your announcement..."
                className="w-full h-20 px-3 py-2 rounded-xl bg-secondary/60 border border-border/50 text-sm resize-none outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 transition-colors"
                maxLength={280}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">{noticeText.length}/280</span>
                <Button
                  size="sm"
                  onClick={handleSendNotice}
                  disabled={!noticeText.trim() || sendingNotice}
                  className="rounded-full h-8 px-4 text-xs gap-1.5"
                >
                  {sendingNotice ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Megaphone className="h-3 w-3" />
                  )}
                  Send Notice
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this message for everyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* GIF Picker */}
      <GifPicker open={showGifPicker} onClose={() => setShowGifPicker(false)} onSelect={handleGifSelect} />

      {/* Reply preview */}
      {replyTo && <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />}

      {/* Attachment options */}
      {showAttachments && (
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 border-t border-border/40 shrink-0">
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-secondary transition-colors">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">Photo</span>
          </button>
          <button onClick={() => { setShowGifPicker(true); setShowAttachments(false); }} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-secondary transition-colors">
            <div className="h-10 w-10 rounded-full bg-accent/30 flex items-center justify-center">
              <Smile className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">GIF</span>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />

      {/* Input bar */}
      <div className="border-t border-border/60 bg-card/80 backdrop-blur-xl px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shrink-0">
        <div className="flex items-center gap-2">
          {!recording && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0" onClick={() => setShowAttachments(!showAttachments)}>
              {showAttachments ? <X className="h-4 w-4 text-muted-foreground" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
            </Button>
          )}

          {recording ? (
            <VoiceRecorder recording={recording} onStartRecording={() => setRecording(true)} onStopRecording={() => setRecording(false)} onRecordComplete={handleVoiceComplete} />
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
                <Button size="icon" className="h-9 w-9 rounded-full shrink-0" onClick={handleSend} disabled={sending || uploading}>
                  {sending || uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              ) : (
                <VoiceRecorder recording={recording} onStartRecording={() => setRecording(true)} onStopRecording={() => setRecording(false)} onRecordComplete={handleVoiceComplete} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
