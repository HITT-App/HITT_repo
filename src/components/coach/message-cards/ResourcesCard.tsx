import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Book, Headphones, BookOpen } from 'lucide-react';

const resources = [
  {
    id: 1,
    title: 'Managingyour health',
    author: 'By Ali F. Green',
    type: 'Book',
    pages: '158pg',
    icon: Book,
  },
  {
    id: 2,
    title: 'Improving Diet',
    author: 'By Coach Jeremiah G',
    type: 'Podcast',
    pages: '158pg',
    icon: Headphones,
  },
  {
    id: 3,
    title: 'Muscle Hypertrophy',
    author: 'By Estelle Bright',
    type: 'Audiobook',
    pages: '158pg',
    icon: BookOpen,
  },
];

export function ResourcesCard() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        {resources.map((resource) => (
          <button
            key={resource.id}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <resource.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{resource.title}</p>
              <p className="text-xs text-muted-foreground">{resource.author}</p>
              <p className="text-xs text-muted-foreground">{resource.type} · {resource.pages}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
