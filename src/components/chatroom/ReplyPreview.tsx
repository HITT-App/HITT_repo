import { X, Reply } from "lucide-react";

interface ReplyPreviewProps {
  replyTo: {
    id: string;
    display_name?: string;
    content: string;
    message_type?: string;
  };
  onCancel: () => void;
}

export default function ReplyPreview({ replyTo, onCancel }: ReplyPreviewProps) {
  const previewText =
    replyTo.message_type === "image"
      ? "📷 Photo"
      : replyTo.message_type === "voice"
      ? "🎤 Voice note"
      : replyTo.message_type === "gif"
      ? "GIF"
      : replyTo.content.slice(0, 60) + (replyTo.content.length > 60 ? "..." : "");

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-secondary/40 border-t border-border/40">
      <Reply className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-primary truncate">
          {replyTo.display_name || "User"}
        </p>
        <p className="text-[12px] text-muted-foreground truncate">{previewText}</p>
      </div>
      <button
        onClick={onCancel}
        className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-secondary"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
