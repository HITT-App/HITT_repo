import { useState } from "react";
import { ArrowLeft, Search, Filter, Eye, MessageCircle, ChevronRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tags = ['Fitness', 'Diet', 'Sleep', 'Mindfulness'];

const articles = [
  {
    id: '1',
    title: 'Why Getting A Fitness Coach Is Always A Good Idea',
    author: 'Author Name',
    tags: ['Tag 1', 'Tag 2'],
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    title: 'Dumbbells And How To Use Them Properly In 2026',
    author: 'Author Name',
    tags: ['Tag 1', 'Tag 2'],
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
  },
  {
    id: '3',
    title: 'Managing Blood Pressure Tips From Real Professional',
    author: 'Author Name',
    tags: ['Tag 1', 'Tag 2'],
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop',
  },
];

const BrowseArticles = () => {
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
          <h1 className="text-xl font-bold text-foreground">Browse Articles</h1>
          <p className="text-sm text-muted-foreground">Browse multiple hi-quality articles</p>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search for an article..." 
              className="pl-10 bg-secondary border-0 rounded-xl"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl">
                <Filter className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Resources</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div>
                  <h3 className="font-medium mb-3">Resource Type</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">Article</Button>
                    <Button variant="default" size="sm">Shorts</Button>
                    <Button variant="outline" size="sm">Course</Button>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-3">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="default" size="sm">Nutrition</Button>
                    <Button variant="outline" size="sm">Fitness</Button>
                    <Button variant="outline" size="sm">Stress</Button>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-3">Duration</h3>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Placeholder Text" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="short">Under 5 min</SelectItem>
                      <SelectItem value="medium">5-15 min</SelectItem>
                      <SelectItem value="long">15+ min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h3 className="font-medium mb-3">Difficulty</h3>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Very Difficult" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="very-hard">Very Difficult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Show Results (23)</Button>
              </div>
            </SheetContent>
          </Sheet>
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
          <span className="text-sm text-foreground">All Articles</span>
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

        {/* Articles Grid */}
        <div className="space-y-4">
          {articles.map((article) => (
            <Card 
              key={article.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/article/${article.id}`)}
            >
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-40 object-cover"
              />
              <div className="p-3">
                <div className="flex gap-2 mb-2">
                  {article.tags.map((tag) => (
                    <span key={tag} className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-semibold text-foreground leading-tight mb-2">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{article.author}</span>
                </div>
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

export default BrowseArticles;
