import { ArrowLeft, Users, MessageCircle, Trophy, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const posts = [
  { id: 1, user: "Sarah M.", content: "Just finished my first 5K! 🏃‍♀️", likes: 24, comments: 8 },
  { id: 2, user: "Mike T.", content: "Week 4 of strength training complete 💪", likes: 18, comments: 5 },
  { id: 3, user: "Lisa K.", content: "Any tips for morning workouts?", likes: 12, comments: 15 },
];

const Community = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Community</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <Button variant="default" size="sm">
            <Users className="w-4 h-4 mr-1" /> Feed
          </Button>
          <Button variant="outline" size="sm">
            <Trophy className="w-4 h-4 mr-1" /> Challenges
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="w-4 h-4 mr-1" /> Groups
          </Button>
        </div>

        {posts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">{post.user[0]}</span>
              </div>
              <span className="font-medium text-foreground">{post.user}</span>
            </div>
            <p className="text-foreground mb-3">{post.content}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <button className="flex items-center gap-1 hover:text-primary">
                <Heart className="w-4 h-4" /> {post.likes}
              </button>
              <button className="flex items-center gap-1 hover:text-primary">
                <MessageCircle className="w-4 h-4" /> {post.comments}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Community;
