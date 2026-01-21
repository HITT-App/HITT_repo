import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Image, Mic, Paperclip, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCommunityActions } from "@/hooks/useCommunity";
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
  const { user } = useAuth();
  const { createPost } = useCommunityActions();
  
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "poll" | "before-after">("text");
  const [category, setCategory] = useState("workout");
  const [tags, setTags] = useState<string[]>(["fitnessrock", "hiitAI"]);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showMediaSheet, setShowMediaSheet] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);

  const getInitials = (email: string | undefined) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add New Post</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="p-4">
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

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMediaSheet(true)}>
            <Image className="w-4 h-4" />
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
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Post →"
          )}
        </Button>
      </div>

      {/* Media Sheet */}
      <Sheet open={showMediaSheet} onOpenChange={setShowMediaSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Add Media</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { icon: "📷", label: "Image" },
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
