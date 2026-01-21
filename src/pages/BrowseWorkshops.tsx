import { useState } from "react";
import { ArrowLeft, Search, Eye, MessageCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tags = ['Fitness', 'Diet', 'Sleep', 'Mindfulness'];

const workshops = [
  {
    id: '1',
    title: 'How To Manage Nutrition Like A Pro',
    tag: 'Tag Name',
    date: 'Jan 16, 2025',
    views: 878,
    comments: 3,
  },
  {
    id: '2',
    title: 'Why Berries Are The Next Superfood For Muscle Gain',
    tag: 'Tag Name',
    date: 'Jan 16, 2026',
    views: 878,
    comments: 3,
  },
  {
    id: '3',
    title: 'Hydration Hacks: Staying Refreshed and Energized',
    tag: 'Tag Name',
    date: 'Jan 16, 2025',
    views: 878,
    comments: 3,
  },
];

const BrowseWorkshops = () => {
  const navigate = useNavigate();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('latest');

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/resources')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Browse Workshops</h1>
          <p className="text-sm text-muted-foreground">Browse fitness workshops</p>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search for a workshop..." 
            className="pl-10 bg-secondary border-0 rounded-xl"
          />
        </div>

        {/* Tags */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTag(tag)}
              className="rounded-full whitespace-nowrap"
            >
              {tag}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">All Workshops</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Workshops List */}
        <div className="space-y-3">
          {workshops.map((workshop) => (
            <Card 
              key={workshop.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/workshop/${workshop.id}`)}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>{workshop.date}</span>
                <span>·</span>
                <span>{workshop.tag}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {workshop.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {workshop.views}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {workshop.comments}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Load More
        </Button>
      </div>
    </div>
  );
};

export default BrowseWorkshops;
