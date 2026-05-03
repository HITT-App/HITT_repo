import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Type, Palette, Send, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStories } from "@/hooks/useStories";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/use-toast";

const BACKGROUND_COLORS = [
  "#1a1a2e", "#16213e", "#0f3460", "#533483",
  "#e94560", "#f38181", "#fce38a", "#95e1d3",
  "#aa96da", "#fcbad3", "#a8d8ea", "#1b262c",
  "#0b0c10", "#1f2833", "#c5c6c7", "#45a29e",
];

const CreateStory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createStory } = useStories();
  const { uploadImage, uploading: imageUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"choose" | "photo" | "text">("choose");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);
  const [isVideo, setIsVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideoFile = file.type.startsWith("video/");
    setIsVideo(isVideoFile);
    setMediaPreview(URL.createObjectURL(file));
    setMode("photo");

    const url = await uploadImage(file, "community-images");
    if (url) {
      setMediaUrl(url);
    } else {
      setMediaPreview(null);
      setMode("choose");
    }
  };

  const handlePost = async () => {
    if (submitting) return;

    if (mode === "photo" && !mediaUrl) {
      toast({ title: "Please wait", description: "Media is still uploading", variant: "destructive" });
      return;
    }
    if (mode === "text" && !textContent.trim()) {
      toast({ title: "Add some text", description: "Write something for your story", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await createStory({
        story_type: mode === "text" ? "text" : isVideo ? "video" : "photo",
        media_url: mediaUrl,
        text_content: textContent || null,
        background_color: bgColor,
      });
      toast({ title: "Story posted! 🎉" });
      navigate("/community/feed");
    } catch {
      toast({ title: "Failed to post story", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Create Story</h1>
        <div className="w-10" />
      </header>

      {mode === "choose" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <h2 className="text-xl font-bold text-foreground">What kind of story?</h2>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <Camera className="w-10 h-10 text-primary" />
              <span className="font-medium text-sm text-foreground">Photo / Video</span>
            </button>
            <button
              onClick={() => setMode("text")}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <Type className="w-10 h-10 text-primary" />
              <span className="font-medium text-sm text-foreground">Text</span>
            </button>
          </div>
        </div>
      )}

      {mode === "photo" && (
        <div className="flex-1 flex flex-col">
          {/* Preview */}
          <div className="flex-1 relative bg-black flex items-center justify-center mx-4 rounded-2xl overflow-hidden">
            {mediaPreview && !isVideo && (
              <img src={mediaPreview} alt="Story" className="w-full h-full object-contain" />
            )}
            {mediaPreview && isVideo && (
              <video src={mediaPreview} className="w-full h-full object-contain" controls muted autoPlay loop />
            )}
            {imageUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full"
              onClick={() => { setMediaPreview(null); setMediaUrl(null); setMode("choose"); }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Text overlay input */}
          <div className="p-4">
            <Textarea
              placeholder="Add a caption... (optional)"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
              className="bg-card border-border resize-none"
              rows={2}
            />
          </div>

          {/* Post button */}
          <div className="p-4 pt-0">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12"
              onClick={handlePost}
              disabled={submitting || imageUploading || !mediaUrl}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              Share Story
            </Button>
          </div>
        </div>
      )}

      {mode === "text" && (
        <div className="flex-1 flex flex-col">
          {/* Text preview */}
          <div
            className="flex-1 mx-4 rounded-2xl flex items-center justify-center p-8 transition-colors"
            style={{ backgroundColor: bgColor }}
          >
            <Textarea
              placeholder="Type your story..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="bg-transparent border-none text-white text-xl font-bold text-center resize-none placeholder:text-white/40 focus-visible:ring-0"
              rows={5}
            />
          </div>

          {/* Color picker */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Background</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform ${
                    bgColor === color ? "border-primary scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBgColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Post button */}
          <div className="p-4 pt-0">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12"
              onClick={handlePost}
              disabled={submitting || !textContent.trim()}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              Share Story
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default CreateStory;
