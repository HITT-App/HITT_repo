import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchUsers, useBrowseUsers } from "@/hooks/useCommunityExtras";
import { useCommunityActions } from "@/hooks/useCommunity";
import { useAuth } from "@/hooks/useAuth";

const trendingTags = [
  "endurance", "POWER", "AITIPS", "trackyourhealth", "stayactive",
  "sleepbetter", "hiitMOMENT", "FITNESSGOD", "2500ML", "nutritionfact"
];

const CommunitySearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tags");
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  const { users: searchResults, loading: searchLoading } = useSearchUsers(searchQuery);
  const { users: browseUsers, loading: browseLoading } = useBrowseUsers();
  const { followUser, unfollowUser } = useCommunityActions();

  const displayedUsers = searchQuery.trim() ? searchResults : browseUsers;
  const isLoading = searchQuery.trim() ? searchLoading : browseLoading;

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Optimistic update
    setFollowingUsers(prev => {
      const next = new Set(prev);
      if (isFollowing) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });

    if (isFollowing) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
  };

  const isUserFollowing = (userId: string, originalStatus?: boolean) => {
    if (followingUsers.has(userId)) return true;
    if (originalStatus && !followingUsers.has(userId)) return originalStatus;
    return false;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold">Search Community</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/community/create")}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search for people..." 
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
      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28">
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
                  onClick={() => {
                    setSearchQuery(`#${tag}`);
                    setActiveTab("people");
                  }}
                >
                  # {tag}
                </Badge>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {searchQuery.trim() ? "Search Results" : "Browse People"}
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchQuery.trim() ? "No users found" : "No users to display"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedUsers.map((person) => {
                  const isFollowing = isUserFollowing(person.user_id, person.is_following);
                  
                  return (
                    <div key={person.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/community/user/${person.user_id}`)}
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={person.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(person.display_name || person.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {person.display_name || person.username || "Anonymous"}
                          </p>
                          {person.username && (
                            <p className="text-xs text-muted-foreground">@{person.username}</p>
                          )}
                        </div>
                      </div>
                      
                      {user && person.user_id !== user.id && (
                        <Button 
                          size="sm"
                          variant={isFollowing ? "outline" : "default"}
                          className={isFollowing ? "" : "bg-primary hover:bg-primary/90"}
                          onClick={() => handleFollow(person.user_id, isFollowing)}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
};

export default CommunitySearch;
