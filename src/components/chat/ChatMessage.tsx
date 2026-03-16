import { cn } from '@/lib/utils';
import { Bot, CheckCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  GoalProgressCard, 
  HydrationCard, 
  HeartRateCard, 
  WorkoutCard, 
  RecipeCard,
  NutritionCard,
  ActivitySuggestionCard,
  HIITScoreCard,
  BloodPressureCard,
  StepsCard,
  SleepCard,
  WeightCard,
  WorkoutListCard,
  SelectOptionsCard
} from '@/components/coach/message-cards';

interface RichContent {
  type: 'goal_progress' | 'hydration' | 'heart_rate' | 'workout' | 'recipe' | 
        'nutrition' | 'activity_suggestion' | 'hiit_score' | 'blood_pressure' | 
        'steps' | 'sleep' | 'weight' | 'workout_list' | 'select_options' | 'image_analysis';
  data?: any;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  richContent?: RichContent;
  imageUrl?: string;
  onOptionSelect?: (option: { id: string; label: string }) => void;
}

export function ChatMessage({ 
  role, 
  content, 
  timestamp,
  richContent,
  imageUrl,
  onOptionSelect
}: ChatMessageProps) {
  const isUser = role === 'user';

  const renderRichContent = () => {
    if (!richContent) return null;

    switch (richContent.type) {
      case 'goal_progress':
        return <GoalProgressCard {...richContent.data} />;
      case 'hydration':
        return <HydrationCard {...richContent.data} />;
      case 'heart_rate':
        return <HeartRateCard {...richContent.data} />;
      case 'workout':
        return <WorkoutCard {...richContent.data} />;
      case 'recipe':
        return <RecipeCard {...richContent.data} />;
      case 'nutrition':
        return <NutritionCard {...richContent.data} />;
      case 'activity_suggestion':
        return <ActivitySuggestionCard {...richContent.data} />;
      case 'hiit_score':
        return <HIITScoreCard {...richContent.data} />;
      case 'blood_pressure':
        return <BloodPressureCard {...richContent.data} />;
      case 'steps':
        return <StepsCard {...richContent.data} />;
      case 'sleep':
        return <SleepCard {...richContent.data} />;
      case 'weight':
        return <WeightCard {...richContent.data} />;
      case 'workout_list':
        return <WorkoutListCard {...richContent.data} />;
      case 'select_options':
        return <SelectOptionsCard {...richContent.data} onSelect={onOptionSelect} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 animate-fade-up',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar - only for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <Bot className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      <div className={cn('max-w-[80%] space-y-2', isUser && 'flex flex-col items-end')}>
        {/* Image if present */}
        {imageUrl && (
          <div className="rounded-2xl overflow-hidden max-w-[200px]">
            <img src={imageUrl} alt="Uploaded" className="w-full h-auto" />
          </div>
        )}

        {/* Text message */}
        {content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-3',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/80 text-foreground'
            )}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
            ) : (
              <div className="text-[13px] leading-[1.75] max-w-none space-y-3
                [&>p]:text-foreground/85
                [&>ul]:pl-1 [&>ul]:space-y-1
                [&>ol]:pl-1 [&>ol]:space-y-1
                [&>ul>li]:text-foreground/80
                [&>ol>li]:text-foreground/80
                [&>h1]:text-[15px] [&>h1]:font-semibold [&>h1]:text-foreground [&>h1]:mt-3
                [&>h2]:text-[14px] [&>h2]:font-semibold [&>h2]:text-foreground [&>h2]:mt-3
                [&>h3]:text-[13.5px] [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mt-2
                [&>h4]:text-[13px] [&>h4]:font-medium [&>h4]:text-foreground [&>h4]:mt-2
                [&>h5]:text-[13px] [&>h5]:font-medium [&>h5]:text-foreground/90
                [&>hr]:border-border/20 [&>hr]:my-3
                [&>blockquote]:border-l-2 [&>blockquote]:border-primary/30 [&>blockquote]:pl-3 [&>blockquote]:text-foreground/70 [&>blockquote]:italic
                [&_strong]:text-foreground [&_strong]:font-semibold
                [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
            
            {/* Timestamp and read status for user messages */}
            {isUser && timestamp && (
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-primary-foreground/60">{timestamp}</span>
                <CheckCheck className="w-3 h-3 text-primary-foreground/60" />
              </div>
            )}
          </div>
        )}

        {/* Timestamp for assistant messages */}
        {!isUser && timestamp && (
          <span className="text-[10px] text-muted-foreground px-1">{timestamp}</span>
        )}

        {/* Rich content cards */}
        {richContent && (
          <div className="w-full max-w-sm">
            {renderRichContent()}
          </div>
        )}
      </div>
    </div>
  );
}
