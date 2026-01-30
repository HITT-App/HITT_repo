import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Article {
  id: string;
  title: string;
  date: string;
  category: string;
  author: string;
  authorAvatar?: string;
  image: string;
}

interface ResourcesSectionProps {
  articles?: Article[];
}

export function ResourcesSection({ articles }: ResourcesSectionProps) {
  const navigate = useNavigate();

  const defaultArticles: Article[] = [
    {
      id: "1",
      title: "Learn about cardio fitness & how it's measured",
      date: "Jun 23, 2025",
      category: "Wellness",
      author: "Julie Robertson",
      authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
      image: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&q=80",
    },
    {
      id: "2",
      title: "Learn the benefits of meditation",
      date: "Jun 15, 2025",
      category: "Mindfulness",
      author: "Mike Chen",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80",
    },
  ];

  const displayArticles = articles || defaultArticles;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-sm font-semibold text-foreground">News & Resources</h2>
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/resources")}
        >
          See All
        </Button>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
        {displayArticles.map((article) => (
          <Card 
            key={article.id}
            className="flex-shrink-0 w-[200px] overflow-hidden border-0 shadow-card cursor-pointer"
            onClick={() => navigate(`/article/${article.id}`)}
          >
            <div className="relative h-24">
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-white/80">{article.date} • {article.category}</p>
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                {article.title}
              </h3>
              <div className="flex items-center gap-2">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={article.authorAvatar} alt={article.author} />
                  <AvatarFallback className="text-xs">{article.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{article.author}</span>
                <ChevronRight className="w-3 h-3 text-primary ml-auto" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
