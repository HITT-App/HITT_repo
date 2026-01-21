import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Settings, Heart, Send, Paperclip, Smile, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  likes: number;
  replies: number;
  timestamp: string;
  isLiked: boolean;
}

const mockComments: Comment[] = [
  {
    id: "1",
    author: { name: "Julienne Anderson", avatar: "" },
    content: "Amet lacinia penatibus nulla pellentesque nibh eu praesent eros. Quisque et torquent conubia a interdum venenatis purus. Curae vel ad velit varius urna a conubia",
    likes: 15,
    replies: 2587,
    timestamp: "25m ago",
    isLiked: false
  },
  {
    id: "2",
    author: { name: "Mary F. Smith", avatar: "" },
    content: "Lorem ipsum odor amet, consectetuer adipiscing elit. Erat rutrum mi nisl accumsan ad aptent.",
    likes: 16,
    replies: 2587,
    timestamp: "8min ago",
    isLiked: false
  },
  {
    id: "3",
    author: { name: "Mary F. Smith", avatar: "" },
    content: "Lorem ipsum odor amet, consectetuer adipiscing elit. Erat rutrum mi nisl accumsan ad aptent.",
    likes: 15,
    replies: 2587,
    timestamp: "8min ago",
    isLiked: false
  },
  {
    id: "4",
    author: { name: "Julienne Anderson", avatar: "" },
    content: "Amet lacinia penatibus nulla pellentesque nibh eu praesent eros. Quisque et torquent conubia a interdum venenatis purus. Curae vel ad velit varius urna a conubia",
    likes: 15,
    replies: 2587,
    timestamp: "25m ago",
    isLiked: false
  },
  {
    id: "5",
    author: { name: "Julienne Anderson", avatar: "" },
    content: "Amet lacinia penatibus nulla pellentesque nibh eu praesent eros. Quisque et torquent conubia a interdum venenatis purus. Curae vel ad velit varius urna a conubia",
    likes: 15,
    replies: 2587,
    timestamp: "25m ago",
    isLiked: false
  },
];

const PostComments = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [comments, setComments] = useState(mockComments);
  const [newComment, setNewComment] = useState("");

  const toggleLike = (commentId: string) => {
    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
        : c
    ));
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: { name: "You", avatar: "" },
      content: newComment,
      likes: 0,
      replies: 0,
      timestamp: "Just now",
      isLiked: false
    };
    
    setComments([comment, ...comments]);
    setNewComment("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">All Comments</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Comments List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id}>
              <div className="flex gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={comment.author.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {comment.author.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{comment.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <button 
                      className={`flex items-center gap-1 ${comment.isLiked ? "text-red-500" : ""}`}
                      onClick={() => toggleLike(comment.id)}
                    >
                      <Heart className={`w-4 h-4 ${comment.isLiked ? "fill-current" : ""}`} />
                      {comment.likes}
                    </button>
                    <button className="flex items-center gap-1">
                      💬 {comment.replies.toLocaleString()}
                    </button>
                    <button className="text-primary">View All Replies</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <Button variant="link" className="w-full text-primary">
            Show All
          </Button>
        </div>
      </ScrollArea>

      {/* Add Comment Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type to write comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Mic className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <Button 
            size="icon" 
            className="bg-primary hover:bg-primary/90 rounded-full shrink-0"
            onClick={handleSubmit}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostComments;
