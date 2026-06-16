import { useState } from "react";
import { ArrowLeft, Share2, Target, Check, X, Trophy, Users, Calendar, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const challengeData = {
  id: '1',
  title: 'July 20K Ultimate Jogging Challenge',
  subtitle: 'Run 30 kilometers for this month',
  organizer: 'Official HIIT AI Team',
  verified: true,
  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=200&fit=crop',
  currentProgress: 12.230,
  targetProgress: 30.00,
  daysRemaining: 5,
  participants: 1224324,
  overview: `Push your limits this July! The 20K Ultimate Jogging Challenge is designed to help you stay active, build endurance, and stay consistent with your fitness routine. Whether you're a beginner or a seasoned runner, this challenge will keep you motivated throughout the month.`,
  rewards: [
    { id: '1', title: 'Jogging Messiah', description: 'Complete a jogging challenge', icon: '🏃' },
    { id: '2', title: 'Steps Achiever', description: 'Jog for 5km for the first time', icon: '👟' },
    { id: '3', title: 'Speed Hunter', description: 'Jog with at least 10km per second', icon: '⚡' },
  ],
  whyJoin: [
    'Improved Cardiovascular Health',
    'Enhanced Metabolism and Weight Management',
    'Stronger Immune System',
    'Mental Health Stability',
  ],
};

const ChallengeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const progressPercent = (challengeData.currentProgress / challengeData.targetProgress) * 100;

  const handleJoin = () => {
    setHasJoined(true);
    setShowJoinDialog(true);
  };

  const handleComplete = () => {
    setShowCompleteDialog(true);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/challenges')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">Challenge Detail</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 space-y-6 pb-28">
        {/* Badge */}
        <div className="flex justify-center">
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
            ⚡ Challenge
          </span>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{challengeData.title}</h1>
          <p className="text-muted-foreground mt-1">{challengeData.subtitle}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">{challengeData.organizer}</span>
            {challengeData.verified && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">✓</span>
            )}
          </div>
        </div>

        {/* Join Button */}
        {!hasJoined && (
          <Button className="w-full" onClick={handleJoin}>
            Join Challenge
          </Button>
        )}

        {/* Progress (after joining) */}
        {hasJoined && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">My Progress</span>
              <span className="text-xs text-muted-foreground">{challengeData.daysRemaining} days remaining</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold text-primary">{challengeData.currentProgress}</span>
              <span className="text-lg text-muted-foreground">/{challengeData.targetProgress}km</span>
              <div className="ml-auto text-4xl font-black text-primary/20">20K</div>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <Button 
              variant="outline" 
              className="w-full mt-4 text-primary border-primary"
              onClick={() => navigate('/activity-live')}
            >
              Start Tracking
            </Button>
          </Card>
        )}

        {/* Challenge Image */}
        <div className="rounded-2xl overflow-hidden">
          <img 
            src={challengeData.image} 
            alt={challengeData.title}
            className="w-full h-48 object-cover"
          />
        </div>

        {/* Overview */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {challengeData.overview}
          </p>
        </section>

        {/* Rewards */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Rewards</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Stay motivated with exciting rewards! Earn badges, XP and exclusive perks for completing milestones.
          </p>
          <div className="space-y-3">
            {challengeData.rewards.map((reward) => (
              <div key={reward.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {reward.icon}
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{reward.title}</h4>
                  <p className="text-xs text-muted-foreground">{reward.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Join */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Why Join?</h2>
          <div className="space-y-2">
            {challengeData.whyJoin.map((reason, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Final Thoughts */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Final Thoughts</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Easily monitor your progress throughout the challenge with real-time insights. Your stats
            update instantly after every run, so you can stay on track and adjust your pace accordingly.
          </p>
        </section>

        {/* Participants */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Participants</h2>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Avatar key={i} className="w-8 h-8 border-2 border-background">
                  <AvatarImage src={`https://i.pravatar.cc/32?img=${i}`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ))}
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center border-2 border-background">
                +1
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">1,224,324+ Participants</p>
              <p className="text-xs text-muted-foreground">Total Participants already joined. Let's join now and challenge yourself!</p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        {hasJoined ? (
          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => navigate('/challenge-leaderboard')}
            >
              View Leaderboard
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
            >
              Invite Friend
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button className="w-full" onClick={handleJoin}>
              Join Challenge
            </Button>
            <Button variant="outline" className="w-full">
              Invite Friend
            </Button>
          </div>
        )}
      </div>
      </div>

      {/* Join Confirmation Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="text-center">
          <div className="py-6">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold text-primary mb-2">20K</h2>
            <h3 className="text-xl font-semibold mb-2">Okay, You're In!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You have 24d left to complete this challenge. Let's complete it now!
            </p>
            <div className="flex items-center gap-2 justify-center mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">10K Monthly Challenge</p>
                <p className="text-xs text-muted-foreground">Complete a 10K challenge</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => {
              setShowJoinDialog(false);
              navigate('/activity-live');
            }}>
              Start Tracking
            </Button>
            <Button variant="outline" className="w-full mt-2" onClick={() => setShowJoinDialog(false)}>
              End Challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="text-center">
          <div className="py-6">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold mb-2">Challenge Complete!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You have earned the badge "10K Monthly Challenge"
            </p>
            <div className="flex items-center gap-2 justify-center mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">10K Monthly Challenge</p>
                <p className="text-xs text-muted-foreground">Complete a 10K challenge</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => setShowCompleteDialog(false)}>
              Great, thanks! 🎉
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChallengeDetail;
