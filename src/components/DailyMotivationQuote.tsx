import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const quotes = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never came from comfort zones.", author: "Unknown" },
  { text: "Your only limit is you.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Be stronger than your excuses.", author: "Unknown" },
  { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
];

interface DailyMotivationQuoteProps {
  streak?: number;
}

export function DailyMotivationQuote({ streak = 0 }: DailyMotivationQuoteProps) {
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    // Use date as seed for consistent daily quote
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const index = dayOfYear % quotes.length;
    setQuote(quotes[index]);
  }, []);

  // Add streak-specific messages
  const getStreakMessage = () => {
    if (streak >= 30) return "🏆 You're unstoppable! 30+ day streak!";
    if (streak >= 14) return "🔥 Two weeks strong! Keep crushing it!";
    if (streak >= 7) return "⚡ One week streak! You're on fire!";
    if (streak >= 3) return "💪 3 days in! Building momentum!";
    return null;
  };

  const streakMessage = getStreakMessage();

  return (
    <div className="px-4 py-3">
      <div className="bg-secondary/50 rounded-xl p-4 relative overflow-hidden">
        {/* Subtle decoration */}
        <div className="absolute top-2 right-2 opacity-10">
          <Sparkles className="w-16 h-16 text-primary" />
        </div>

        {streakMessage && (
          <p className="text-xs font-medium text-primary mb-2">{streakMessage}</p>
        )}

        <blockquote className="relative">
          <p className="text-sm text-foreground leading-relaxed italic">
            "{quote.text}"
          </p>
          <footer className="mt-2 text-xs text-muted-foreground">
            — {quote.author}
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
