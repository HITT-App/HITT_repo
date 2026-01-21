import { useState } from "react";
import { ArrowLeft, Search, Play, Eye, Clock, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tags = ['Fitness', 'Diet', 'Sleep', 'Mindfulness'];

const categoryShorts = {
  hydration: [
    {
      id: '1',
      title: '3 Easy Ways to Improve Your Sleep',
      author: 'Eddie Yong',
      views: 5300,
      duration: '0:45',
      thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=350&fit=crop',
    },
    {
      id: '2',
      title: 'Steps to Health: Why Walking Matters',
      author: 'Eddie Yong',
      views: 5300,
      duration: '0:50',
      thumbnail: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=350&fit=crop',
    },
    {
      id: '3',
      title: 'AI Wellness Hacks You...',
      author: 'Eddie Yong',
      views: 5300,
      duration: '0:40',
      thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=350&fit=crop',
    },
  ],
  fitness: [
    {
      id: '4',
      title: 'Mood Tracking: A Simple Key to Better Health',
      author: 'Eddie Yong',
      views: 5500,
      duration: '0:55',
      thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=350&fit=crop',
      isNew: true,
    },
    {
      id: '5',
      title: 'Quick Tips to Lower Blood Pressure',
      author: 'Eddie Yong',
      views: 5500,
      duration: '0:48',
      thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=350&fit=crop',
    },
    {
      id: '6',
      title: '3 Easy Ways to Improve Your Sleep',
      author: 'Eddie Yong',
      views: 5500,
      duration: '0:42',
      thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&h=350&fit=crop',
    },
  ],
};

const BrowseShorts = () => {
  const navigate = useNavigate();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('latest');

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const ShortCard = ({ short }: { short: typeof categoryShorts.hydration[0] & { isNew?: boolean } }) => (
    <div 
      className="relative min-w-[140px] cursor-pointer"
      onClick={() => navigate(`/short/${short.id}`)}
    >
      <div className="relative h-52 rounded-xl overflow-hidden">
        <img 
          src={short.thumbnail} 
          alt={short.title}
          className="w-full h-full object-cover"
        />
        {short.isNew && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
            New
          </span>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {short.duration}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
          <Play className="w-10 h-10 text-white" fill="white" />
        </div>
      </div>
      <h4 className="text-sm font-medium mt-2 line-clamp-2">{short.title}</h4>
      <p className="text-xs text-muted-foreground">{short.author}</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Eye className="w-3 h-3" />
        {short.views >= 1000 ? `${(short.views / 1000).toFixed(1)}k` : short.views}
      </p>
    </div>
  );

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
          <h1 className="text-xl font-bold text-foreground">Browse Shorts</h1>
          <p className="text-sm text-muted-foreground">Browse shorts</p>
        </div>
      </header>

      <div className="px-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search for a short..." 
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
          <span className="text-sm text-foreground">All Videos</span>
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

        {/* Hydration Shorts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💧</span>
            <h2 className="font-semibold text-foreground">Hydration</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categoryShorts.hydration.map((short) => (
              <ShortCard key={short.id} short={short} />
            ))}
          </div>
        </section>

        {/* Fitness Shorts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💪</span>
            <h2 className="font-semibold text-foreground">Fitness</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categoryShorts.fitness.map((short) => (
              <ShortCard key={short.id} short={short} />
            ))}
          </div>
        </section>

        {/* Load More */}
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Load More
        </Button>
      </div>
    </div>
  );
};

export default BrowseShorts;
