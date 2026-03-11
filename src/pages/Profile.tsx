import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useStreaksAndBadges } from '@/hooks/useStreaksAndBadges';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useWakeWordPreference } from '@/hooks/useWakeWordPreference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StreakCard } from '@/components/gamification/StreakCard';
import { BadgesDisplay } from '@/components/gamification/BadgesDisplay';
import { PasswordChangeSection } from '@/components/profile/PasswordChangeSection';
import { ArrowLeft, Camera, Loader2, User, Target, Save, Trophy, Shield, Mic, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FITNESS_GOALS = [
  'Lose weight',
  'Build muscle',
  'Improve endurance',
  'Increase flexibility',
  'General fitness',
  'Train for competition',
];

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { profile, loading, updating, updateProfile, uploadAvatar } = useProfile();
  const { streak, allBadges, earnedBadges, loading: streaksLoading } = useStreaksAndBadges();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { enabled: wakeWordEnabled, setEnabled: setWakeWordEnabled } = useWakeWordPreference();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setFitnessGoal(profile.fitness_goal || '');
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image under 5MB' });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload to storage
    setUploadingAvatar(true);
    const publicUrl = await uploadAvatar(file);
    setUploadingAvatar(false);

    if (publicUrl) {
      await updateProfile({ avatar_url: publicUrl });
      setAvatarPreview(publicUrl);
    }
  };

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    
    if (trimmedName.length > 50) {
      toast({ variant: 'destructive', title: 'Invalid name', description: 'Display name must be under 50 characters' });
      return;
    }

    await updateProfile({
      display_name: trimmedName || null,
      fitness_goal: fitnessGoal || null,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  if (loading || streaksLoading || adminLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadgeIds = earnedBadges.map(eb => eb.badge_id);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Button>
          )}
          <Button onClick={handleSave} disabled={updating} size="sm" className="gap-2">
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </header>

      <div className="p-5 max-w-md mx-auto space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border border-border">
              <AvatarImage src={avatarPreview || undefined} alt="Profile" />
              <AvatarFallback className="bg-secondary text-lg font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center active:opacity-80 transition-opacity disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Streak Card */}
        {streak && (
          <StreakCard
            currentStreak={streak.current_streak}
            longestStreak={streak.longest_streak}
            totalWorkouts={streak.total_workouts}
            lastWorkoutDate={streak.last_workout_date}
          />
        )}

        {/* Badges Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            Badges & Achievements
          </Label>
          <BadgesDisplay 
            allBadges={allBadges} 
            earnedBadgeIds={earnedBadgeIds}
            showLocked={true}
          />
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName" className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Display Name
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            maxLength={50}
            className="bg-secondary border-border"
          />
        </div>

        {/* Fitness Goal */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            Fitness Goal
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {FITNESS_GOALS.map((goal) => (
              <button
                key={goal}
                onClick={() => setFitnessGoal(goal)}
                className={`p-3.5 rounded-xl text-sm font-medium transition-all touch-manipulation ${
                  fitnessGoal === goal
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground active:bg-secondary/70'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
          <div className="pt-3">
            <Label htmlFor="customGoal" className="text-xs text-muted-foreground">
              Or enter a custom goal
            </Label>
            <Textarea
              id="customGoal"
              value={FITNESS_GOALS.includes(fitnessGoal) ? '' : fitnessGoal}
              onChange={(e) => setFitnessGoal(e.target.value)}
              placeholder="Describe your fitness goal..."
              maxLength={200}
              className="mt-1 bg-secondary border-border resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Voice Activation */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-muted-foreground" />
            Voice Activation
          </Label>
          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
            <div className="space-y-1">
              <p className="font-medium text-sm">"Ok HIIT" Wake Word</p>
              <p className="text-xs text-muted-foreground">
                Say "Ok HIIT" anywhere in the app to start voice mode
              </p>
            </div>
            <Switch 
              checked={wakeWordEnabled} 
              onCheckedChange={setWakeWordEnabled}
            />
          </div>
        </div>

        {/* Password Change Section */}
        <PasswordChangeSection />

        {/* Sign Out */}
        <div className="pt-6">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}