import { ArrowLeft, MoreVertical, Medal, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const myProgress = {
  current: 12.230,
  target: 30.00,
  rank: 223,
};

const leaderboard = [
  { rank: 1, name: 'Frank Deckers', progress: 30.00, percent: 100, avatar: 'https://i.pravatar.cc/40?img=1' },
  { rank: 2, name: 'Emile Bright', progress: 28.50, percent: 95, avatar: 'https://i.pravatar.cc/40?img=2' },
  { rank: 3, name: 'Joshua Bright', progress: 25.00, percent: 88, avatar: 'https://i.pravatar.cc/40?img=3' },
  { rank: 4, name: 'Walter White', progress: 22.50, percent: 75, avatar: 'https://i.pravatar.cc/40?img=4' },
  { rank: 5, name: 'Jessie Black', progress: 20.00, percent: 66.7, avatar: 'https://i.pravatar.cc/40?img=5' },
  { rank: 6, name: 'Frank Deckers', progress: 18.00, percent: 60, avatar: 'https://i.pravatar.cc/40?img=6' },
];

const ChallengeLeaderboard = () => {
  const navigate = useNavigate();

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-400 text-yellow-900';
      case 2: return 'bg-gray-300 text-gray-700';
      case 3: return 'bg-orange-400 text-orange-900';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Challenge Leaderboard</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 space-y-6">
        {/* Your Place */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Your Place</span>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">you are ranked #{myProgress.rank}</span>
            </div>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-primary">{myProgress.current}</span>
            <span className="text-lg text-muted-foreground">/{myProgress.target}km</span>
            <div className="ml-auto text-4xl font-black text-primary/20">20K</div>
          </div>
          <Progress value={(myProgress.current / myProgress.target) * 100} className="h-2" />
          <Button variant="link" className="text-primary p-0 h-auto mt-3">
            See All
          </Button>
        </Card>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all">All Leaderboard</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4 space-y-3">
            {leaderboard.map((user) => (
              <Card 
                key={user.rank}
                className="p-3 flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(user.rank)}`}>
                  {user.rank <= 3 ? (
                    <Medal className="w-4 h-4" />
                  ) : (
                    user.rank
                  )}
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm">{user.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {user.progress.toFixed(2)}km/{myProgress.target}km
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {user.percent.toFixed(1)}%
                </span>
              </Card>
            ))}
            
            <Button variant="outline" className="w-full">
              Invite Friend
            </Button>
          </TabsContent>
          
          <TabsContent value="friends" className="mt-4">
            <div className="text-center py-12">
              <p className="text-muted-foreground">No friends in this challenge yet</p>
              <Button className="mt-4">Invite Friends</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChallengeLeaderboard;
