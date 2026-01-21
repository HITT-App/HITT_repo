import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';

const quotes = [
  {
    id: 1,
    text: "I do the same exercises I did 50 years ago, and they still work",
    author: "Coach Julia White",
    likes: 291,
    comments: 11,
    shares: 85,
  },
  {
    id: 2,
    text: "The only bad workout is the one that didn't happen",
    author: "Coach Mike Brown",
    likes: 156,
    comments: 8,
    shares: 42,
  },
  {
    id: 3,
    text: "Your body can stand almost anything. It's your mind you have to convince",
    author: "Coach Sarah Lee",
    likes: 423,
    comments: 24,
    shares: 156,
  },
];

export function QuoteCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const quote = quotes[currentIndex];

  const next = () => setCurrentIndex((prev) => (prev + 1) % quotes.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + quotes.length) % quotes.length);

  return (
    <Card className="border-border/50 bg-gradient-to-br from-foreground to-foreground/90 text-background overflow-hidden">
      <CardContent className="p-6">
        <blockquote className="text-xl font-semibold mb-4 leading-relaxed">
          "{quote.text}"
        </blockquote>
        <p className="text-sm opacity-80 mb-4">— {quote.author}</p>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm opacity-70 mb-4">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {quote.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {quote.comments}
          </span>
          <span>↗ {quote.shares}</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            className="text-background/70 hover:text-background hover:bg-background/10 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-1.5">
            {quotes.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-background' : 'bg-background/30'
                }`}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            className="text-background/70 hover:text-background hover:bg-background/10 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
