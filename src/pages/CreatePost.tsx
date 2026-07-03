import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Settings, Image, Mic, Paperclip, X, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCommunityActions } from "@/hooks/useCommunity";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAuth } from "@/hooks/useAuth";

const postCategories = [
  { id: "workout", label: "Workout", icon: "💪" },
  { id: "fitness", label: "Fitness", icon: "🏃" },
  { id: "jogging", label: "Jogging", icon: "🏃‍♂️" },
  { id: "diet", label: "Diet", icon: "🥗" },
  { id: "other", label: "Other", icon: "⚙️" },
];

const suggestedTags = ["fitnessrock", "hiitAI", "healthylifestyle", "workout"];

const CreatePost = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPostId = searchParams.get("edit");
  const { user } = useAuth();
  const { createPost } = useCommunityActions();
  const { uploadImage, uploading } = useImageUpload();
  
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "poll" | "before-after">("text");
  const [category, setCategory] = useState("workout");
  const [tags, setTags] = useState<string[]>([]);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showMediaSheet, setShowMediaSheet] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPost, setLoadingPost] = useState(!!editPostId);

  // Load existing post data when editing
  useEffect(() => {
    if (!editPostId) return;
    const loadPost = async () => {
      setLoadingPost(true);
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("id", editPostId)
        .single();
      if (data && !error) {
        setContent(data.content || "");
        setPostType((data.post_type as "text" | "poll" | "before-after") || "text");
        setCategory(data.category || "workout");
        setTags(data.tags || []);
        if (data.image_url) {
          setImageUrl(data.image_url);
          setImagePreview(data.image_url);
        }
        if (data.before_image_url) {
          setBeforeImageUrl(data.before_image_url);
          setBeforeImagePreview(data.before_image_url);
        }
        if (data.after_image_url) {
          setAfterImageUrl(data.after_image_url);
          setAfterImagePreview(data.after_image_url);
        }
        if (data.poll_options) {
          const po = data.poll_options as { options?: string[] };
          if (po.options) setPollOptions([...po.options, ...Array(4 - po.options.length).fill("")].slice(0, 4));
        }
      }
      setLoadingPost(false);
    };
    loadPost();
  }, [editPostId]);
  
  // Image states
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (email: string | undefined) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  const handleImageSelect = async (file: File, type: 'main' | 'before' | 'after' = 'main') => {
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'main') {
        setImagePreview(preview);
      } else if (type === 'before') {
        setBeforeImagePreview(preview);
      } else {
        setAfterImagePreview(preview);
      }
    };
    reader.readAsDataURL(file);

    // Upload to storage
    const url = await uploadImage(file);
    if (url) {
      if (type === 'main') {
        setImageUrl(url);
      } else if (type === 'before') {
        setBeforeImageUrl(url);
      } else {
        setAfterImageUrl(url);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'before' | 'after' = 'main') => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file, type);
    }
  };

  const removeImage = (type: 'main' | 'before' | 'after' = 'main') => {
    if (type === 'main') {
      setImageUrl(null);
      setImagePreview(null);
    } else if (type === 'before') {
      setBeforeImageUrl(null);
      setBeforeImagePreview(null);
    } else {
      setAfterImageUrl(null);
      setAfterImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setSubmitting(true);

    const postData: Parameters<typeof createPost>[0] = {
      content: content.trim(),
      post_type: postType,
      category,
      tags,
      image_url: imageUrl || undefined,
      before_image_url: beforeImageUrl || undefined,
      after_image_url: afterImageUrl || undefined,
    };

    if (postType === "poll") {
      const validOptions = pollOptions.filter(opt => opt.trim());
      if (validOptions.length >= 2) {
        postData.poll_options = {
          options: validOptions,
          votes: validOptions.map(() => 0),
        };
      }
    }

    if (editPostId) {
      // Update existing post
      const { error } = await supabase
        .from("community_posts")
        .update({
          content: postData.content,
          post_type: postData.post_type,
          category: postData.category,
          tags: postData.tags,
          image_url: postData.image_url || null,
          before_image_url: postData.before_image_url || null,
          after_image_url: postData.after_image_url || null,
          poll_options: postData.poll_options || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editPostId)
        .eq("user_id", user.id);

      setSubmitting(false);
      if (!error) {
        setShowSuccessDialog(true);
      }
      return;
    }

    const result = await createPost(postData);
    
    setSubmitting(false);
    
    if (result) {
      setShowSuccessDialog(true);
    }
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const getCategoryIcon = () => {
    const cat = postCategories.find(c => c.id === category);
    return cat?.icon || "💪";
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => handleFileChange(e, 'main')}
      />
      <input
        type="file"
        ref={beforeFileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => handleFileChange(e, 'before')}
      />
      <input
        type="file"
        ref={afterFileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => handleFileChange(e, 'after')}
      />

      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">{editPostId ? "Edit Post" : "Add New Post"}</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/community/profile/settings")}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28">
        <div className="flex gap-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder={postType === "poll" ? "What's your main health focus at the moment? Let's see!" : "What's on your mind?"}
              className="min-h-[120px] border-none resize-none focus-visible:ring-0 p-0 text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        {/* Image Preview for regular posts */}
        {postType !== "before-after" && imagePreview && (
          <div className="relative mb-4">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full max-h-64 object-cover rounded-xl"
            />
            <button
              onClick={() => removeImage('main')}
              className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        {/* Before/After Images */}
        {postType === "before-after" && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div 
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 relative overflow-hidden cursor-pointer"
              onClick={() => beforeFileInputRef.current?.click()}
            >
              {beforeImagePreview ? (
                <>
                  <img src={beforeImagePreview} alt="Before" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage('before'); }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Before</span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">Before</span>
                </div>
              )}
              {uploading && beforeImagePreview && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
            </div>
            <div 
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 relative overflow-hidden cursor-pointer"
              onClick={() => afterFileInputRef.current?.click()}
            >
              {afterImagePreview ? (
                <>
                  <img src={afterImagePreview} alt="After" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage('after'); }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">After</span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">After</span>
                </div>
              )}
              {uploading && afterImagePreview && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Poll Options */}
        {postType === "poll" && (
          <div className="space-y-3 mb-4">
            {pollOptions.map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <Input
                  placeholder={`Option ${idx + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions];
                    newOptions[idx] = e.target.value;
                    setPollOptions(newOptions);
                  }}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        )}

        {/* Category & Actions */}
        <div className="flex items-center gap-2 mb-4">
          <Sheet open={showCategorySheet} onOpenChange={setShowCategorySheet}>
            <SheetTrigger asChild>
              <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-primary/10">
                <span>{getCategoryIcon()}</span> {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Select Post Category</SheetTitle>
              </SheetHeader>
              <RadioGroup value={category} onValueChange={setCategory} className="mt-4 space-y-3">
                {postCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span>{cat.icon}</span>
                      <Label htmlFor={cat.id} className="cursor-pointer">{cat.label}</Label>
                    </div>
                    <RadioGroupItem value={cat.id} id={cat.id} />
                  </div>
                ))}
              </RadioGroup>
              <Button 
                className="w-full mt-6 bg-primary hover:bg-primary/90"
                onClick={() => setShowCategorySheet(false)}
              >
                Select Category
              </Button>
            </SheetContent>
          </Sheet>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => postType === "before-after" ? setShowMediaSheet(true) : fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Mic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-sm text-muted-foreground">Add Tag</span>
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="gap-1 bg-primary/10 border-primary text-primary">
              # {tag}
              <button onClick={() => removeTag(tag)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {suggestedTags.filter(t => !tags.includes(t)).map((tag) => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="gap-1 cursor-pointer hover:bg-primary/10"
              onClick={() => addTag(tag)}
            >
              # {tag}
            </Badge>
          ))}
        </div>

        {/* Post Type Selection */}
        <Sheet open={showTypeSheet} onOpenChange={setShowTypeSheet}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full mb-4">
              Choose Post Type: {postType === "text" ? "Text" : postType === "poll" ? "Poll" : "Before vs After"}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Choose Post Type</SheetTitle>
            </SheetHeader>
            <RadioGroup value={postType} onValueChange={(v) => setPostType(v as typeof postType)} className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">T</span>
                  <Label htmlFor="text" className="cursor-pointer">Text</Label>
                </div>
                <RadioGroupItem value="text" id="text" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📊</span>
                  <Label htmlFor="poll" className="cursor-pointer">Poll</Label>
                </div>
                <RadioGroupItem value="poll" id="poll" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">◐</span>
                  <Label htmlFor="before-after" className="cursor-pointer">Before vs After</Label>
                </div>
                <RadioGroupItem value="before-after" id="before-after" />
              </div>
            </RadioGroup>
            <Button 
              className="w-full mt-6 bg-primary hover:bg-primary/90"
              onClick={() => setShowTypeSheet(false)}
            >
              Confirm Selection
            </Button>
          </SheetContent>
        </Sheet>

        {/* Submit Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting || uploading || loadingPost}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            editPostId ? "Update Post →" : "Submit Post →"
          )}
        </Button>
      </div>
      </div>

      {/* Media Sheet */}
      <Sheet open={showMediaSheet} onOpenChange={setShowMediaSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Add Media</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { icon: "📷", label: "Image", action: () => { fileInputRef.current?.click(); setShowMediaSheet(false); } },
              { icon: "📹", label: "Video" },
              { icon: "🎙️", label: "Recording" },
              { icon: "🎵", label: "Audio" },
              { icon: "🥗", label: "Nutrition" },
              { icon: "😴", label: "Sleep" },
              { icon: "💧", label: "Hydration" },
              { icon: "⚖️", label: "Weight" },
            ].map((item) => (
              <button 
                key={item.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted"
                onClick={item.action}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm rounded-3xl text-center">
          <DialogTitle className="sr-only">Post submitted</DialogTitle>
          <div className="py-8">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center relative overflow-hidden">
              <span className="text-6xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Post submitted.</h2>
            <p className="text-muted-foreground mb-6">Post submitted successfully.</p>
            <Button 
              className="w-full bg-primary hover:bg-primary/90 mb-3"
              onClick={() => navigate("/community/feed")}
            >
              View Feed →
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/community/profile")}
            >
              See My Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatePost;
