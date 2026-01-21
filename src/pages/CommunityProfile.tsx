import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Heart, MessageCircle, Bookmark, MoreHorizontal, Plus, MessageSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CommunityProfile = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("newest");
  
  const profileData = {
    name: "Makise Kurisu",
    joinDate: "Dec 2026",
    stats: {
      posts: 24,
      followers: "1.2k",
      likes: 98
    },
    isFollowing: false,
    isPremium: true
  };

  const posts = [
    {
      id: "1",
      content: "Just done a quick HIIT session with my gang! Don't forget to hydrate, Y'all! 💪",
      hashtags: ["HydrationChallenge", "DrinkMoreWater"],
      image: "/placeholder.svg",
      stats: { minutes: 52, kcal: 128, score: 3 },
      engagement: { views: 5874, likes: 215, comments: 11 },
      timestamp: "3m ago"
    },
    {
      id: "2",
      content: "Just received a personalized health insight from HIIT AI. It's amazing how much data can be turned into actionable advice!",
      hashtags: ["fitnessAI", "SmartWellness", "TechForHealth", "HealthInsights"],
      engagement: { views: 5874, likes: 215, comments: 11 },
      timestamp: "3m ago"
    },
    {
      id: "3",
      content: "Started learning about muscle hypertrophy recently and I came across this workshop - this is a must see for everyone, ever!",
      hashtags: ["bloodpressure", "healthworkshop", "hiitworks"],
      engagement: { views: 5874, likes: 215, comments: 11 },
      timestamp: "3m ago"
    }
  ];

  const hasNoPosts = false;

  if (hasNoPosts) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-muted">?</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="p-4 text-center pt-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary">hiit plus</Badge>
          <p className="text-xs text-muted-foreground mb-1">Member since {profileData.joinDate}</p>
          <h1 className="text-xl font-bold mb-6">{profileData.name}</h1>
          
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center mb-12">
            <Button className="bg-primary hover:bg-primary/90 gap-1">
              Follow <Plus className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="gap-1">
              Chat <MessageSquare className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-w-xs mx-auto">
            <img src="/placeholder.svg" alt="" className="w-48 h-48 mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">You don't have any post yet.</h2>
            <p className="text-lg font-semibold mb-2">Let's create a new post!</p>
            <p className="text-sm text-muted-foreground mb-6">
              Let's post your first fitness, wellness, or nutrition related topics!
            </p>
            <Button 
              variant="link" 
              className="text-primary gap-1"
              onClick={() => navigate("/community/create")}
            >
              Create Post <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
        <img src="/placeholder.svg" alt="" className="w-full h-full object-cover opacity-50" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm"
          onClick={() => navigate(-1)}
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Avatar className="absolute -bottom-12 left-4 w-24 h-24 border-4 border-background">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary text-white text-2xl">MK</AvatarFallback>
        </Avatar>
      </div>

      {/* Profile Info */}
      <div className="pt-16 px-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Badge variant="outline" className="mb-2 text-primary border-primary text-xs">hiit plus</Badge>
            <p className="text-xs text-muted-foreground">Member since {profileData.joinDate}</p>
            <h1 className="text-xl font-bold">{profileData.name}</h1>
          </div>
        </div>

        <div className="flex justify-between mb-6">
          <div className="text-center">
            <p className="text-xl font-bold">{profileData.stats.posts}</p>
            <p className="text-xs text-muted-foreground">Total Posts</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{profileData.stats.followers}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{profileData.stats.likes}</p>
            <p className="text-xs text-muted-foreground">Likes</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <Button className="flex-1 bg-primary hover:bg-primary/90 gap-1">
            Follow <Plus className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 gap-1"
            onClick={() => navigate("/community/chat/1")}
          >
            Chat <MessageSquare className="w-4 h-4" />
          </Button>
        </div>

        {/* Posts Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">All Posts</h2>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 pb-20">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">MK</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-sm">{profileData.name}</span>
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-[8px]">✓</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Posted {post.timestamp}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm mb-2">{post.content}</p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="text-xs text-primary">#{tag}</span>
                ))}
              </div>

              {post.image && (
                <div className="relative rounded-xl overflow-hidden mb-3">
                  <img src={post.image} alt="" className="w-full h-48 object-cover" />
                  {post.stats && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="flex items-center gap-4 text-white text-sm">
                        <div className="flex items-center gap-1">
                          <span className="bg-primary/80 px-2 py-0.5 rounded text-xs">{post.stats.minutes}</span>
                          <span className="text-xs">Minutes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="bg-primary/80 px-2 py-0.5 rounded text-xs">🔥 {post.stats.kcal}</span>
                          <span className="text-xs">kcal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="bg-primary/80 px-2 py-0.5 rounded text-xs">⚡ {post.stats.score}</span>
                          <span className="text-xs">Score</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="text-xs">👁</span> {(post.engagement.views / 1000).toFixed(1)}k
                  </span>
                  <button className="flex items-center gap-1 hover:text-primary">
                    <Heart className="w-4 h-4" /> {post.engagement.likes}
                  </button>
                  <button className="flex items-center gap-1 hover:text-primary">
                    <MessageCircle className="w-4 h-4" /> {post.engagement.comments}
                  </button>
                </div>
                <button className="flex items-center gap-1 hover:text-primary">
                  <Bookmark className="w-4 h-4" />
                  <span className="text-xs">Save</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityProfile;
