import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const trendingTags = [
  "endurance", "POWER", "AITIPS", "trackyourhealth", "stayactive",
  "sleepbetter", "hiitMOMENT", "FITNESSGOD", "2500ML", "nutritionfact"
];

const browsePeople = [
  { id: "1", name: "Azunyan U. Wu", handle: "@azunyan_senpai", avatar: "" },
  { id: "2", name: "X-AE-B-99_bugfix2", handle: "@xtheobliterator", avatar: "" },
  { id: "3", name: "Joshua Smith", handle: "@JSmith221", avatar: "" },
  { id: "4", name: "Shinomiya Kaguya", handle: "@princesskaguya22", avatar: "" },
];

const CommunitySearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tags");
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);

  const toggleFollow = (userId: string) => {
    setFollowedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-background z-10 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <Avatar className="w-10 h-10" onClick={() => navigate("/community/profile")}>
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary">MK</AvatarFallback>
          </Avatar>
          <h1 className="text-lg font-semibold">Search Community</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/community/create")}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search for a feed..." 
              className="pl-9 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-muted/30">
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="mt-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Trending Tags</h2>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 hover:border-primary"
                  onClick={() => setSearchQuery(`#${tag}`)}
                >
                  # {tag}
                </Badge>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Browse people</h2>
            <div className="space-y-4">
              {browsePeople.map((person) => (
                <div key={person.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {person.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.handle}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    variant={followedUsers.includes(person.id) ? "outline" : "default"}
                    className={followedUsers.includes(person.id) ? "" : "bg-primary hover:bg-primary/90"}
                    onClick={() => toggleFollow(person.id)}
                  >
                    {followedUsers.includes(person.id) ? "Following" : "Follow"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CommunitySearch;
