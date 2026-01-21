import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, Heart, MessageCircle, Bookmark, MoreHorizontal, Play, ChevronUp, Flame, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Post {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    isVerified: boolean;
  };
  content: string;
  hashtags: string[];
  type: "text" | "workout" | "poll" | "video" | "before-after" | "steps" | "score";
  media?: {
    type: "image" | "video";
    url: string;
    stats?: {
      minutes?: number;
      kcal?: number;
      score?: number;
      kilometers?: number;
    };
  };
  poll?: {
    question: string;
    options: { label: string; votes: number; percentage: number }[];
    totalVotes: number;
    remaining: string;
  };
  steps?: {
    count: number;
    percentage: number;
    total: number;
  };
  score?: {
    value: number;
    label: string;
    change: number;
    chartData: number[];
  };
  engagement: {
    views: number;
    likes: number;
    comments: number;
  };
  timestamp: string;
  isSaved: boolean;
}

const mockPosts: Post[] = [
  {
    id: "1",
    author: { name: "Makise Kurisu", handle: "@makise_k", avatar: "", isVerified: true },
    content: "Just done a quick HIIT session with my gang! Don't forget to hydrate, Y'all! 💪",
    hashtags: ["HydrationChallenge", "DrinkMoreWater"],
    type: "workout",
    media: {
      type: "image",
      url: "/placeholder.svg",
      stats: { minutes: 52, kcal: 128, score: 3 }
    },
    engagement: { views: 5874, likes: 215, comments: 11 },
    timestamp: "3m ago",
    isSaved: false
  },
  {
    id: "2",
    author: { name: "Jamie D. Jones", handle: "@jamie_d", avatar: "", isVerified: true },
    content: "Just received a personalized health insight from HIIT AI. It's amazing how much data can be turned into actionable advice! What's your latest AI recommendation?",
    hashtags: ["fitnessAI", "SmartWellness", "TechForHealth", "HealthInsights"],
    type: "text",
    engagement: { views: 5874, likes: 215, comments: 11 },
    timestamp: "3m ago",
    isSaved: false
  },
  {
    id: "3",
    author: { name: "Charles D. Xavier", handle: "@charles_x", avatar: "", isVerified: true },
    content: "Started learning about muscle hypertrophy recently and I came across this workshop - this is a must see for everyone, ever!",
    hashtags: ["bloodpressure", "healthworkshop", "hiitworks"],
    type: "text",
    engagement: { views: 5874, likes: 215, comments: 11 },
    timestamp: "3m ago",
    isSaved: false
  },
  {
    id: "4",
    author: { name: "Monkey S. Martens", handle: "@monkey_s", avatar: "", isVerified: true },
    content: "If you had to choose, which breakfast type is the best for your health?",
    hashtags: ["breakfast", "morningmeal", "hiitcommunity"],
    type: "poll",
    poll: {
      question: "Risk Profile",
      options: [
        { label: "Eggs", votes: 45, percentage: 2 },
        { label: "Toast", votes: 120, percentage: 10 },
        { label: "Milk", votes: 1020, percentage: 84 }
      ],
      totalVotes: 481,
      remaining: "6d remaining"
    },
    engagement: { views: 5874, likes: 215, comments: 11 },
    timestamp: "3m ago",
    isSaved: false
  },
  {
    id: "5",
    author: { name: "Shinomiya Kaguya", handle: "@princess", avatar: "", isVerified: true },
    content: "I've been focusing on improving my nutrition - mainly staying active and monitoring my meals. So glad I have HIIT to track my progress!",
    hashtags: ["nutrition", "FitnessGoals"],
    type: "video",
    media: {
      type: "video",
      url: "/placeholder.svg"
    },
    engagement: { views: 5874, likes: 215, comments: 11 },
    timestamp: "3m ago",
    isSaved: false
  },
  {
    id: "6",
    author: { name: "Batman Sanderson", handle: "@batman_s", avatar: "", isVerified: true },
    content: "Hey All! I just hit my steps goal for this week, all thanks to HIIT AI 💪",
    hashtags: ["stepsGoals", "ActivePeople", "FitnessJourney"],
    type: "steps",
    steps: {
      count: 2000,
      percentage: 48.2,
      total: 3152
    },
    engagement: { views: 5874, likes: 215, comments: 11 },
    timestamp: "3m ago",
    isSaved: false
  },
  {
    id: "7",
    author: { name: "Makise Kurisu", handle: "@makise_k", avatar: "", isVerified: true },
    content: "I've set my health goals for the month and can't wait to share the progress! Here is my awesome health score so far! 💥",
    hashtags: ["HealthSciFitness", "FitnessGoals", "HIITEVA"],
    type: "score",
    score: {
      value: 88.5,
      label: "Very Fit",
      change: 15.81,
      chartData: [40, 45, 50, 55, 60, 70, 88]
    },
    engagement: { views: 5874, likes: 215, comments: 11 },
    timestamp: "3m ago",
    isSaved: false
  }
];

const CommunityFeed = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("popular");
  const [posts, setPosts] = useState(mockPosts);

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
  };

  const toggleSave = (postId: string) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, isSaved: !p.isSaved } : p));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background z-10 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <Avatar className="w-10 h-10" onClick={() => navigate("/community/profile")}>
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary">MK</AvatarFallback>
          </Avatar>
          <h1 className="text-lg font-semibold">Feed</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/community/create")}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search for a feed..." 
              className="pl-9 bg-muted/50"
              onClick={() => navigate("/community/search")}
              readOnly
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 bg-muted/30">
            <TabsTrigger value="popular" className="gap-1 text-xs">
              <Flame className="w-3 h-3" /> Popular
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-1 text-xs">
              <TrendingUp className="w-3 h-3" /> Trending
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-1 text-xs">
              <Users className="w-3 h-3" /> Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Posts */}
      <div className="divide-y divide-border">
        {posts.map((post) => (
          <article key={post.id} className="p-4">
            {/* Author */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10" onClick={() => navigate(`/community/user/${post.id}`)}>
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {post.author.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm">{post.author.name}</span>
                  {post.author.isVerified && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-[8px]">✓</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Posted {post.timestamp}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <p className="text-sm text-foreground mb-2">{post.content}</p>
            
            {/* Hashtags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {post.hashtags.map((tag) => (
                <span key={tag} className="text-xs text-primary">#{tag}</span>
              ))}
            </div>

            {/* Media */}
            {post.type === "workout" && post.media && (
              <div className="relative rounded-xl overflow-hidden mb-3">
                <img src={post.media.url} alt="" className="w-full h-48 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center gap-4 text-white text-sm">
                    <div className="flex items-center gap-1">
                      <span className="bg-primary/80 px-2 py-0.5 rounded text-xs">{post.media.stats?.minutes}</span>
                      <span className="text-xs">Minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-primary/80 px-2 py-0.5 rounded text-xs">🔥 {post.media.stats?.kcal}</span>
                      <span className="text-xs">kcal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-primary/80 px-2 py-0.5 rounded text-xs">⚡ {post.media.stats?.score}</span>
                      <span className="text-xs">Score</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {post.type === "video" && post.media && (
              <div className="relative rounded-xl overflow-hidden mb-3">
                <img src={post.media.url} alt="" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            )}

            {post.type === "poll" && post.poll && (
              <Card className="p-4 mb-3 bg-muted/30">
                <p className="text-sm font-medium mb-3">{post.poll.question}</p>
                <div className="space-y-2">
                  {post.poll.options.map((option, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.percentage}%</span>
                      </div>
                      <Progress 
                        value={option.percentage} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {post.poll.totalVotes} votes · {post.poll.remaining}
                </p>
              </Card>
            )}

            {post.type === "steps" && post.steps && (
              <Card className="p-4 mb-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">I just hit my goal this week!</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{post.steps.count.toLocaleString()} Steps</p>
                    <p className="text-xs text-primary">
                      <ChevronUp className="w-3 h-3 inline" />
                      {post.steps.percentage}% · {post.steps.total.toLocaleString()} Total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">👟</span>
                  </div>
                </div>
              </Card>
            )}

            {post.type === "score" && post.score && (
              <Card className="p-4 mb-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">H</span>
                  </div>
                  <span className="text-sm font-medium">HIIT Score</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{post.score.value}</p>
                    <p className="text-xs text-muted-foreground">{post.score.label}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <ChevronUp className="w-3 h-3" />
                    +{post.score.change}%
                  </Badge>
                </div>
                <div className="flex items-end gap-1 h-16 mt-3">
                  {post.score.chartData.map((val, idx) => (
                    <div 
                      key={idx} 
                      className="flex-1 bg-primary/20 rounded-t"
                      style={{ height: `${(val / 100) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </Card>
            )}

            {/* Engagement */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="text-xs">👁</span> {formatNumber(post.engagement.views)}
                </span>
                <button className="flex items-center gap-1 hover:text-primary">
                  <Heart className="w-4 h-4" /> {formatNumber(post.engagement.likes)}
                </button>
                <button 
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={() => navigate(`/community/post/${post.id}/comments`)}
                >
                  <MessageCircle className="w-4 h-4" /> {post.engagement.comments}
                </button>
              </div>
              <button 
                className={`hover:text-primary ${post.isSaved ? "text-primary" : ""}`}
                onClick={() => toggleSave(post.id)}
              >
                <Bookmark className={`w-4 h-4 ${post.isSaved ? "fill-current" : ""}`} />
                <span className="ml-1 text-xs">Save</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default CommunityFeed;
