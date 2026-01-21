import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, Upload, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface BlockedUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
}

const CommunityProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("public");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([
    { id: "1", name: "Julia Dawson", handle: "@jdawg_8712", avatar: "" },
    { id: "2", name: "Mark Roberts", handle: "@mrob_221", avatar: "" },
  ]);

  const handleUnblock = (userId: string) => {
    setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
    toast({
      title: "User unblocked",
      description: "The user has been unblocked successfully."
    });
  };

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your community profile settings have been updated."
    });
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Community Profile Setting</h1>
        <Button variant="ghost" size="icon">
          <Info className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label>Label</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Enter your name..." 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Handle */}
        <div className="space-y-2">
          <Label>Label</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input 
              placeholder="Enter your handle" 
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label>Bio</Label>
          <div className="relative">
            <Textarea 
              placeholder="Enter your bio here..." 
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
            <div className="relative rounded-xl overflow-hidden h-32">
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              <Button 
                size="sm" 
                className="absolute top-2 right-2 bg-primary hover:bg-primary/90"
              >
                Replace
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <p className="text-sm text-primary mb-2">Browse your file to upload!</p>
              <p className="text-xs text-muted-foreground mb-4">
                Supported Formats: SVG, JPG, PNG (10mb each)
              </p>
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                Browse File <Upload className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Privacy Policy */}
        <div className="space-y-3">
          <Label>Privacy Policy</Label>
          <p className="text-xs text-muted-foreground">
            Private Profile: your profile will only be visible to yourself
          </p>
          <RadioGroup value={privacyPolicy} onValueChange={setPrivacyPolicy} className="flex gap-2">
            {["Public", "Friend Only", "Private"].map((option) => (
              <div 
                key={option}
                className={`flex-1 border rounded-lg p-3 text-center cursor-pointer transition-colors ${
                  privacyPolicy === option.toLowerCase().replace(" ", "-") 
                    ? "bg-muted border-primary" 
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setPrivacyPolicy(option.toLowerCase().replace(" ", "-"))}
              >
                <span className="text-sm">{option}</span>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Blocked Users */}
        <div className="space-y-3">
          <Label>Blocked Users</Label>
          <p className="text-xs text-muted-foreground">
            Blocked users will not be visible to you, and they cannot see your post.
          </p>
          <div className="space-y-3">
            {blockedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-muted">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.handle}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleUnblock(user.id)}
                >
                  Unblock
                </Button>
              </div>
            ))}
            <Button variant="link" className="text-primary gap-1 p-0 h-auto">
              <Plus className="w-4 h-4" /> Add Another
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90"
          onClick={handleSave}
        >
          Save Settings ✓
        </Button>
      </div>
    </div>
  );
};

export default CommunityProfileSettings;
