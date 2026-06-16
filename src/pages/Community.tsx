import { useNavigate } from "react-router-dom";
import hiitLogo from "@/assets/hiit-logo.webp";
import { ArrowRight, Newspaper, Trophy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const quickLinks = [
  {
    title: "News Feed",
    description: "See what the community is up to",
    icon: Newspaper,
    href: "/community/feed",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Leaderboard",
    description: "Compare your progress",
    icon: Trophy,
    href: "/leaderboard",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    title: "Chatroom",
    description: "Chat with other members",
    icon: MessageCircle,
    href: "/community/chatroom",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
];

const Community = () => {
  const navigate = useNavigate();

  return (
    <div className="h-[100dvh] bg-background flex flex-col pb-20">
      {/* Hero */}
      <div className="flex items-center justify-center px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
            <img src={hiitLogo} alt="HIIT Fitness" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold mb-1">HIIT Fitness Community</h1>
          <p className="text-xs text-muted-foreground">
            Share your fitness progress and interact with other members.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-4 space-y-2 flex-1">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.title}
              className="cursor-pointer hover:bg-muted/50 active:scale-[0.98] transition-all"
              onClick={() => navigate(link.href)}
            >
              <CardContent className="flex items-center gap-3 p-3.5">
                <div className={`p-2.5 rounded-xl ${link.bg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${link.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{link.title}</h3>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA */}
      <div className="p-4">
        <Button
          className="w-full"
          onClick={() => navigate("/community/feed")}
        >
          Explore Community <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Community;
