import { ArrowLeft, BookOpen, Video, FileText, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const resources = [
  { id: 1, title: "Beginner's Guide to HIIT", type: "Article", icon: FileText, color: "text-blue-500" },
  { id: 2, title: "Proper Form Techniques", type: "Video", icon: Video, color: "text-red-500" },
  { id: 3, title: "Nutrition Fundamentals", type: "E-Book", icon: BookOpen, color: "text-green-500" },
  { id: 4, title: "Workout Motivation Mix", type: "Podcast", icon: Headphones, color: "text-purple-500" },
];

const Resources = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Resources</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button variant="default" size="sm">All</Button>
          <Button variant="outline" size="sm">Articles</Button>
          <Button variant="outline" size="sm">Videos</Button>
          <Button variant="outline" size="sm">E-Books</Button>
        </div>

        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <Card key={resource.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className={`w-6 h-6 ${resource.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground">{resource.type}</p>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Resources;
