import { useState } from "react";
import { ArrowLeft, Share2, Bookmark, ThumbsUp, ThumbsDown, Meh, Smile, ChevronRight, Lock, Eye, MessageCircle, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const articleData = {
  id: '1',
  title: 'Muscle Hypertrophy: How Muscles Grow and How to Maximize It',
  author: {
    name: 'Guillermo White',
    avatar: 'https://i.pravatar.cc/40?img=10',
  },
  date: 'Sep 25, 2024',
  readTime: '5 min read',
  tags: ['#bodybuilding'],
  isPremium: true,
  content: {
    overview: `Muscle hypertrophy is the process of muscle growth that occurs when muscle fibers experience stress and adapt by increasing in size. This happens primarily through resistance training, which causes microscopic tears in muscle fibers.`,
    whatsImportant: `When these fibers repair, they grow back thicker and stronger, leading to increased muscle mass. There are two main types of hypertrophy: myofibrillar hypertrophy, which increases muscle strength, and sarcoplasmic hypertrophy, which boosts muscle volume by increasing fluid and energy stores within the muscle.`,
    howToGain: [
      'Improved Cardiovascular Health',
      'Enhanced Metabolism and Weight Management',
      'Stronger Immune System',
      'Mental Health Stability',
    ],
    finalThoughts: `By consistently following these principles, you can optimize muscle hypertrophy and achieve faster muscle growth over time. 💪`,
  },
  keyTopics: [
    { part: 'PART 1', title: 'Strength Training Basics', description: 'Master proper form and technique to maximize gains.' },
    { part: 'PART 2', title: 'Endurance Boosting', description: 'Improve cardiovascular endurance to enhance stamina.' },
    { part: 'PART 3', title: 'Functional Movements', description: 'Improve flexibility and prevent stiffness with mobility enhancing.' },
  ],
  relatedArticles: [
    { id: '2', title: 'Tracking Your Health: Why Fitness Metrics Matter', tag: 'Tag Name', date: 'Jan 5, 2025', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&h=100&fit=crop' },
    { id: '3', title: 'The Future of AI-Personalized Health...', tag: 'Tag Name', date: 'Jan 5, 2025', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop' },
  ],
};

const ArticleDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [rating, setRating] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/resources')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Article Detail</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 space-y-6">
        {/* Tag */}
        <div className="flex gap-2">
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
            ✨ #bodybuilding
          </span>
        </div>

        {/* Title & Meta */}
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {articleData.title}
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={articleData.author.avatar} />
              <AvatarFallback>{articleData.author.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{articleData.author.name}</p>
              <p className="text-xs text-muted-foreground">{articleData.date} · {articleData.readTime}</p>
            </div>
          </div>
        </div>

        {/* Overview */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {articleData.content.overview}
          </p>
        </section>

        {/* What's Important */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">What's Important?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {articleData.content.whatsImportant}
          </p>
        </section>

        {/* How To Gain More Muscle */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">How To Gain More Muscle</h2>
          <div className="space-y-2">
            {articleData.content.howToGain.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Final Thoughts */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Final Thoughts</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {articleData.content.finalThoughts}
          </p>
        </section>

        {/* Rating */}
        <section className="text-center py-4">
          <p className="text-muted-foreground mb-4">How would you rate this article?</p>
          <div className="flex justify-center gap-4">
            {[
              { key: 'bad', icon: ThumbsDown, label: 'Bad' },
              { key: 'neutral', icon: Meh, label: 'Neutral' },
              { key: 'great', icon: Smile, label: 'Great' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setRating(key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                  rating === key ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <Icon className={`w-8 h-8 ${rating === key ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${rating === key ? 'text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Premium Unlock */}
        {articleData.isPremium && (
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 text-center">
            <Lock className="w-8 h-8 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Go Pro to Unlock Full Article Now!</h3>
            <p className="text-sm opacity-90 mt-2 mb-4">Subscribe to Pro →</p>
            <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
              Subscribe to Pro
            </Button>
          </Card>
        )}

        {/* Related Articles */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">You might also like</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {articleData.relatedArticles.map((article) => (
              <Card 
                key={article.id}
                className="min-w-[180px] overflow-hidden cursor-pointer"
                onClick={() => navigate(`/article/${article.id}`)}
              >
                <img 
                  src={article.image} 
                  alt={article.title}
                  className="w-full h-24 object-cover"
                />
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">{article.date} · {article.tag}</p>
                  <h4 className="text-sm font-medium line-clamp-2">{article.title}</h4>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Key Topics */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Key Topics Covered</h2>
          <div className="space-y-3">
            {articleData.keyTopics.map((topic, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                  {topic.part}
                </span>
                <div>
                  <h4 className="font-medium text-foreground">{topic.title}</h4>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ArticleDetail;
