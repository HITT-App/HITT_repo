import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, Upload, Camera, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCommunityProfile, useCommunityActions } from "@/hooks/useCommunity";
import { useBlockedUsers } from "@/hooks/useCommunityExtras";
import { useImageUpload } from "@/hooks/useImageUpload";
import ImageCropperDialog from "@/components/community/ImageCropperDialog";

const CommunityProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useCommunityProfile();
  const { createOrUpdateProfile } = useCommunityActions();
  const { blockedUsers, unblockUser, loading: blockedLoading } = useBlockedUsers();
  const { uploadImage, uploading } = useImageUpload();
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("public");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>("");
  const [cropperType, setCropperType] = useState<"avatar" | "banner">("avatar");

  // Load profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url);
      setBannerUrl(profile.banner_url);
      setPrivacyPolicy(profile.is_private ? "private" : "public");
    }
  }, [profile]);

  const handleFileSelect = (file: File, type: "avatar" | "banner") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCropperImage(e.target.result as string);
        setCropperType(type);
        setCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], `${cropperType}-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    const url = await uploadImage(file, "community-images");
    
    if (url) {
      if (cropperType === "avatar") {
        setAvatarUrl(url);
      } else {
        setBannerUrl(url);
      }
      
      // Save immediately
      await createOrUpdateProfile({
        [cropperType === "avatar" ? "avatar_url" : "banner_url"]: url,
      });
      
      toast({
        title: "Image uploaded",
        description: `Your ${cropperType === "avatar" ? "profile picture" : "banner"} has been updated.`,
      });
    }
  };

  const handleUnblock = async (userId: string) => {
    const success = await unblockUser(userId);
    if (success) {
      toast({
        title: "User unblocked",
        description: "The user has been unblocked successfully.",
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await createOrUpdateProfile({
        display_name: displayName || undefined,
        username: username || undefined,
        bio: bio || undefined,
        avatar_url: avatarUrl || undefined,
        banner_url: bannerUrl || undefined,
        is_private: privacyPolicy === "private",
      });
      
      toast({
        title: "Settings saved",
        description: "Your community profile settings have been updated.",
      });
      navigate(-1);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Community Profile Settings</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6 pb-28">
        {/* Avatar with Camera Overlay */}
        <div className="flex justify-center">
          <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            
            {/* Camera Overlay */}
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading && cropperType === "avatar" ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            
            {/* Always visible camera badge on mobile */}
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 border-2 border-background sm:hidden">
              <Camera className="w-3 h-3 text-primary-foreground" />
            </div>
            
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, "avatar");
                e.target.value = "";
              }}
            />
          </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Tap to change profile picture
        </p>

        {/* Display Name */}
        <div className="space-y-2">
          <Label>Display Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Enter your display name..." 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Username/Handle */}
        <div className="space-y-2">
          <Label>Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input 
              placeholder="Enter your username" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Only lowercase letters, numbers, and underscores allowed
          </p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label>Bio</Label>
          <div className="relative">
            <Textarea 
              placeholder="Tell us about yourself..." 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={300}
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {bio.length}/300
            </span>
          </div>
        </div>

        {/* Profile Banner */}
        <div className="space-y-2">
          <Label>Profile Banner</Label>
          {bannerUrl ? (
            <div className="relative rounded-xl overflow-hidden h-32 group">
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button 
                  size="sm" 
                  onClick={handleBannerClick}
                  disabled={uploading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {uploading && cropperType === "banner" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Camera className="w-4 h-4 mr-2" />
                  )}
                  Replace
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={handleBannerClick}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-primary mb-2">Browse your file to upload!</p>
              <p className="text-xs text-muted-foreground mb-4">
                Supported Formats: JPG, PNG, WebP (5MB max)
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90 gap-2"
                disabled={uploading}
              >
                {uploading && cropperType === "banner" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Browse File
              </Button>
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file, "banner");
              e.target.value = "";
            }}
          />
        </div>

        {/* Privacy Policy */}
        <div className="space-y-3">
          <Label>Privacy Settings</Label>
          <p className="text-xs text-muted-foreground">
            Private profiles are only visible to approved followers
          </p>
          <div className="flex gap-2">
            {["Public", "Private"].map((option) => {
              const value = option.toLowerCase();
              const isSelected = privacyPolicy === value;
              return (
                <div 
                  key={option}
                  className={`flex-1 border rounded-lg p-3 text-center cursor-pointer transition-colors ${
                    isSelected 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setPrivacyPolicy(value)}
                >
                  <span className="text-sm font-medium">{option}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blocked Users */}
        <div className="space-y-3">
          <Label>Blocked Users</Label>
          <p className="text-xs text-muted-foreground">
            Blocked users cannot see your posts or send you messages
          </p>
          
          {blockedLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No blocked users
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((block) => (
                <div key={block.blocked_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={block.blocked_user?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted">
                        {block.blocked_user?.display_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{block.blocked_user?.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">@{block.blocked_user?.username || "user"}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleUnblock(block.blocked_id)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings ✓"
          )}
        </Button>
      </div>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImage}
        aspectRatio={cropperType === "avatar" ? 1 : 3}
        onCropComplete={handleCropComplete}
        title={cropperType === "avatar" ? "Crop Profile Picture" : "Crop Banner Image"}
      />
    </div>
  );
};

export default CommunityProfileSettings;
