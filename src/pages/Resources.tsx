import { ArrowLeft, Bell, Search, Dumbbell, Apple, BarChart3, Activity, Brain, ChevronRight, Play, Eye, MessageCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const categories = [
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'diet', label: 'Diet', icon: Apple },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'ai', label: 'AI', icon: Brain },
];

const featuredArticle = {
  id: '1',
  title: 'The Power of Nutrition: Key Foods for a Healthier You',
  author: 'Author Name',
  tags: ['Tag 1', 'Tag 2'],
  image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop',
};

const latestArticles = [
  {
    id: '2',
    title: 'The Science Behind Sleep: How Better Rest Improves Your Fitness In Long Term',
    tag: 'Tag Name',
    date: '2d ago',
    views: 21054,
    comments: 22,
  },
  {
    id: '3',
    title: '10 Surprising Immunity-Boosting Foods And Why They Work',
    tag: 'Tag Name',
    date: '3d ago',
    views: 3140,
    comments: 15,
  },
];

const shorts = [
  {
    id: '1',
    title: '3 Easy Ways to Improve Muscle',
    author: 'Eddie Yong',
    views: 5300,
    duration: '0:45',
    thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=350&fit=crop',
    isNew: true,
  },
  {
    id: '2',
    title: 'Why Hydration Is Your Superpower',
    author: 'Lisa Su',
    views: 12500,
    duration: '0:40',
    thumbnail: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=350&fit=crop',
  },
  {
    id: '3',
    title: 'Top 5 Signs You Need to Change...',
    author: 'Eddie Yong',
    views: 889,
    duration: '0:50',
    thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=350&fit=crop',
  },
];

const workshops = [
  {
    id: '1',
    title: 'Fitness Focus: How to Achieve Your Fitness Goals',
    tag: 'Tag Name',
    date: 'Jan 16, 2025',
    views: 878,
    comments: 3,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
  },
  {
    id: '2',
    title: 'Understanding Your Heart: Metrics That Matter',
    tag: 'Tag Name',
    date: 'Jan 16, 2025',
    views: 878,
    comments: 3,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop',
  },
  {
    id: '3',
    title: 'Workout Tips That Will Improve You To The Max',
    tag: 'Tag Name',
    date: 'Jan 16, 2025',
    views: 878,
    comments: 3,
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop',
  },
];

const Resources = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Resources</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/notifications')}
          className="rounded-full"
        >
          <Bell className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search for a resources..." 
            className="pl-10 bg-secondary border-0 rounded-xl"
          />
        </div>

        {/* Browse Category */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Browse Category</h2>
            <Button variant="link" className="text-primary p-0 h-auto" onClick={() => navigate('/resources/categories')}>
              See All
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/resources/browse?category=${cat.id}`)}
                  className="flex flex-col items-center gap-2 min-w-[60px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Featured Article */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Featured Article</h2>
          <Card 
            className="relative overflow-hidden rounded-2xl cursor-pointer"
            onClick={() => navigate(`/article/${featuredArticle.id}`)}
          >
            <img 
              src={featuredArticle.image} 
              alt={featuredArticle.title}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex gap-2 mb-2">
                {featuredArticle.tags.map((tag) => (
                  <span key={tag} className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-white font-semibold text-lg leading-tight">
                {featuredArticle.title}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <ChevronRight className="w-4 h-4 text-white" />
                <span className="text-sm text-white/80">{featuredArticle.author}</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Latest Articles */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <h2 className="font-semibold text-foreground">Latest Article</h2>
            </div>
            <Button variant="link" className="text-primary p-0 h-auto" onClick={() => navigate('/resources')}>
              See All
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {latestArticles.map((article) => (
              <Card 
                key={article.id}
                className="min-w-[260px] p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/article/${article.id}`)}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{article.date}</span>
                  <span>·</span>
                  <span>{article.tag}</span>
                </div>
                <h3 className="font-medium text-sm text-foreground leading-tight mb-3 line-clamp-2">
                  {article.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.views.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {article.comments}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* HIIT Shorts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎬</span>
              <h2 className="font-semibold text-foreground">HIIT Shorts</h2>
            </div>
            <Button variant="link" className="text-primary p-0 h-auto" onClick={() => navigate('/resources')}>
              See All
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {shorts.map((short) => (
              <div 
                key={short.id}
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
            ))}
          </div>
        </section>

        {/* Workshops */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎓</span>
              <h2 className="font-semibold text-foreground">Workshops</h2>
            </div>
            <Button variant="link" className="text-primary p-0 h-auto" onClick={() => navigate('/resources')}>
              See All
            </Button>
          </div>
          <div className="space-y-3">
            {workshops.map((workshop) => (
              <Card 
                key={workshop.id}
                className="p-3 flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/workshop/${workshop.id}`)}
              >
                <img 
                  src={workshop.image} 
                  alt={workshop.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{workshop.date}</span>
                    <span>·</span>
                    <span>{workshop.tag}</span>
                  </div>
                  <h3 className="font-medium text-sm text-foreground line-clamp-2">
                    {workshop.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {workshop.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {workshop.comments}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground self-center" />
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Resources;
