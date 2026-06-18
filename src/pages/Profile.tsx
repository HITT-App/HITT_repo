import { useState, useRef, useEffect } from 'react';
import { HEmoji } from '@/components/HEmoji';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityProfile, useCommunityActions } from '@/hooks/useCommunity';
import { useBlockedUsers } from '@/hooks/useCommunityExtras';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useStreaksAndBadges } from '@/hooks/useStreaksAndBadges';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useWakeWordPreference } from '@/hooks/useWakeWordPreference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StreakCard } from '@/components/gamification/StreakCard';
import { BadgesDisplay } from '@/components/gamification/BadgesDisplay';
import { PasswordChangeSection } from '@/components/profile/PasswordChangeSection';
import { WatchSyncSection } from '@/components/profile/WatchSyncSection';
import ImageCropperDialog from '@/components/community/ImageCropperDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Camera, Loader2, User, Target, Shield, Mic, Sun, Moon,
  Pencil, Check, X, Calendar, Lock, Globe, Trash2, Bell, ChevronRight, Upload,
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const PRESET_AVATARS = Array.from({ length: 12 }, (_, i) =>
  `/avatars/avatar-${String(i + 1).padStart(2, '0')}.jpg`
);
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const FITNESS_GOALS = [
  'Lose weight', 'Build muscle', 'Improve endurance',
  'Increase flexibility', 'General fitness', 'Train for competition',
];

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { profile, loading, updating, updateProfile, uploadAvatar } = useProfile();
  const { profile: communityProfile, loading: communityLoading } = useCommunityProfile();
  const { createOrUpdateProfile } = useCommunityActions();
  const { uploadImage, uploading: imageUploading } = useImageUpload();
  const { streak, allBadges, earnedBadges, loading: streaksLoading } = useStreaksAndBadges();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { enabled: wakeWordEnabled, setEnabled: setWakeWordEnabled } = useWakeWordPreference();
  const { blockedUsers, unblockUser, loading: blockedLoading } = useBlockedUsers();
  const { theme, setTheme } = useTheme();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  // Account deletion
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('delete-account', {
        body: { confirmation: 'DELETE' },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      await signOut();
      navigate('/login');
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again or contact support.', variant: 'destructive' });
      setDeleting(false);
    }
  };

  // Inline editing state
  const [editingField, setEditingField] = useState<'name' | 'username' | 'bio' | null>(null);
  const [tempValue, setTempValue] = useState('');

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);

  const handlePresetSelect = async (url: string) => {
    setPresetSaving(true);
    setAvatarPreview(url);
    await updateProfile({ avatar_url: url });
    await createOrUpdateProfile({ avatar_url: url });
    setPresetSaving(false);
    setAvatarPickerOpen(false);
  };

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState('');
  const [cropperType, setCropperType] = useState<'avatar' | 'banner'>('avatar');
  const [saving, setSaving] = useState(false);

  // Load from both profiles
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setFitnessGoal(profile.fitness_goal || '');
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (communityProfile) {
      setUsername(communityProfile.username || '');
      setBio(communityProfile.bio || '');
      setBannerUrl(communityProfile.banner_url);
      setIsPrivate(communityProfile.is_private || false);
      if (!avatarPreview && communityProfile.avatar_url) {
        setAvatarPreview(communityProfile.avatar_url);
      }
    }
  }, [communityProfile]);

  const handleFileSelect = (file: File, type: 'avatar' | 'banner') => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max 5MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCropperImage(e.target.result as string);
        setCropperType(type);
        setCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], `${cropperType}-${Date.now()}.jpg`, { type: 'image/jpeg' });

    if (cropperType === 'avatar') {
      // Upload to avatars bucket via useProfile
      const publicUrl = await uploadAvatar(file);
      if (publicUrl) {
        setAvatarPreview(publicUrl);
        await updateProfile({ avatar_url: publicUrl });
        // Sync to community profile
        await createOrUpdateProfile({ avatar_url: publicUrl });
      }
    } else {
      const url = await uploadImage(file, 'community-images');
      if (url) {
        setBannerUrl(url);
        await createOrUpdateProfile({ banner_url: url });
      }
    }
  };

  const startEditing = (field: 'name' | 'username' | 'bio') => {
    setEditingField(field);
    setTempValue(field === 'name' ? displayName : field === 'username' ? username : bio);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const confirmEditing = async () => {
    if (!editingField) return;
    setSaving(true);

    if (editingField === 'name') {
      const trimmed = tempValue.trim();
      if (trimmed.length > 50) {
        toast({ variant: 'destructive', title: 'Too long', description: 'Max 50 characters' });
        setSaving(false);
        return;
      }
      setDisplayName(trimmed);
      await updateProfile({ display_name: trimmed || null });
      await createOrUpdateProfile({ display_name: trimmed || undefined });
    } else if (editingField === 'username') {
      const cleaned = tempValue.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setUsername(cleaned);
      await createOrUpdateProfile({ username: cleaned || undefined });
    } else if (editingField === 'bio') {
      setBio(tempValue);
      await createOrUpdateProfile({ bio: tempValue || undefined });
    }

    setEditingField(null);
    setTempValue('');
    setSaving(false);
  };

  const handleSaveFitnessGoal = async (goal: string) => {
    setFitnessGoal(goal);
    await updateProfile({ fitness_goal: goal || null });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = () => {
    if (displayName) return displayName.slice(0, 2).toUpperCase();
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  const isLoading = loading || communityLoading || streaksLoading || adminLoading;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadgeIds = earnedBadges.map(eb => eb.badge_id);
  const joinedDate = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : '';
  const stats = communityProfile || { posts_count: 0, followers_count: 0, following_count: 0, likes_received: 0 };

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background sticky top-0 z-20">
        <h1 className="font-semibold">Profile</h1>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-2">
            <Shield className="w-4 h-4" />
            Admin
          </Button>
        )}
      </header>

      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-br from-primary/30 to-primary/10 overflow-hidden group">
        {bannerUrl && (
          <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        )}
        <button
          onClick={() => bannerInputRef.current?.click()}
          className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity border border-border"
        >
          <Camera className="w-4 h-4 text-foreground" />
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file, 'banner');
            e.target.value = '';
          }}
        />
      </div>

      {/* Avatar overlapping banner */}
      <div className="px-5 -mt-12 relative z-10">
        <div className="relative w-24 h-24">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarImage src={avatarPreview || undefined} alt="Profile" />
            <AvatarFallback className="bg-secondary text-lg font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background"
          >
            <Camera className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file, 'avatar');
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Name, username, bio — inline editable */}
      <div className="px-5 mt-3 space-y-1">
        {/* Display Name */}
        {editingField === 'name' ? (
          <div className="flex items-center gap-2">
            <Input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              maxLength={50}
              className="h-9 text-lg font-bold bg-secondary"
              autoFocus
            />
            <Button size="icon" variant="ghost" onClick={confirmEditing} disabled={saving}>
              <Check className="w-4 h-4 text-primary" />
            </Button>
            <Button size="icon" variant="ghost" onClick={cancelEditing}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <button onClick={() => startEditing('name')} className="flex items-center gap-2 group/edit">
            <h2 className="text-xl font-bold text-foreground">
              {displayName || 'Add your name'}
            </h2>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Username */}
        {editingField === 'username' ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="h-8 pl-7 text-sm bg-secondary"
                autoFocus
              />
            </div>
            <Button size="icon" variant="ghost" onClick={confirmEditing} disabled={saving} className="h-8 w-8">
              <Check className="w-3.5 h-3.5 text-primary" />
            </Button>
            <Button size="icon" variant="ghost" onClick={cancelEditing} className="h-8 w-8">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <button onClick={() => startEditing('username')} className="flex items-center gap-1.5 group/edit">
            <span className="text-sm text-muted-foreground">
              {username ? `@${username}` : 'Set username'}
            </span>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Bio */}
        {editingField === 'bio' ? (
          <div className="space-y-2 pt-1">
            <Textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              maxLength={300}
              rows={3}
              className="text-sm bg-secondary resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tempValue.length}/300</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
                <Button size="sm" onClick={confirmEditing} disabled={saving}>Save</Button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => startEditing('bio')} className="flex items-start gap-1.5 group/edit text-left pt-1">
            <span className="text-sm text-muted-foreground">
              {bio || 'Add a bio...'}
            </span>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity mt-0.5 shrink-0" />
          </button>
        )}

        {/* Joined date */}
        {joinedDate && (
          <div className="flex items-center gap-1.5 pt-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Joined {joinedDate}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="px-5 mt-4 flex gap-5">
        {[
          { label: 'Posts', value: stats.posts_count },
          { label: 'Followers', value: stats.followers_count },
          { label: 'Following', value: stats.following_count },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="mt-5">
        <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger
            value="profile"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ===== PROFILE TAB ===== */}
        <TabsContent value="profile" className="p-5 space-y-6 mt-0">
          {/* Streak Card */}
          {streak && (
            <StreakCard
              currentStreak={streak.current_streak}
              longestStreak={streak.longest_streak}
              totalWorkouts={streak.total_workouts}
              lastWorkoutDate={streak.last_workout_date}
            />
          )}

          {/* Badges */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <><HEmoji name="leaderboard" size={16} style={{verticalAlign:'middle', marginRight:6}}/> Badges & Achievements</>
            </h3>
            <BadgesDisplay allBadges={allBadges} earnedBadgeIds={earnedBadgeIds} showLocked />
          </div>

          {/* Fitness Goal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Fitness Goal
              </h3>
              <button
                onClick={() => navigate('/goal-setup', { state: { returnTo: '/profile' } })}
                className="text-xs font-semibold text-primary active:opacity-70 transition-opacity"
              >
                Set up with wizard →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FITNESS_GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleSaveFitnessGoal(goal)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all touch-manipulation ${
                    fitnessGoal === goal
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground active:bg-secondary/70'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
            <Textarea
              value={FITNESS_GOALS.includes(fitnessGoal) ? '' : fitnessGoal}
              onChange={(e) => setFitnessGoal(e.target.value)}
              onBlur={() => handleSaveFitnessGoal(fitnessGoal)}
              placeholder="Or enter a custom goal..."
              maxLength={200}
              className="bg-secondary border-border resize-none"
              rows={2}
            />
          </div>
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings" className="p-5 space-y-5 mt-0">
          {/* Appearance */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="font-medium text-sm">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between themes</p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')} />
          </div>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notification-preferences')}
            className="w-full flex items-center justify-between p-4 bg-secondary rounded-xl active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium text-sm">Notifications</p>
                <p className="text-xs text-muted-foreground">Control what alerts you receive</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Voice */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
            <div className="flex items-center gap-3">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">"Ok HIIT" Wake Word</p>
                <p className="text-xs text-muted-foreground">Say "Ok HIIT" to start voice mode</p>
              </div>
            </div>
            <Switch checked={wakeWordEnabled} onCheckedChange={setWakeWordEnabled} />
          </div>

          {/* Privacy */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Privacy</h3>
            <div className="flex gap-2">
              {[
                { label: 'Public', icon: Globe, value: false },
                { label: 'Private', icon: Lock, value: true },
              ].map(({ label, icon: Icon, value }) => (
                <button
                  key={label}
                  onClick={async () => {
                    setIsPrivate(value);
                    await createOrUpdateProfile({ is_private: value });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-all ${
                    isPrivate === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Private profiles are only visible to approved followers
            </p>
          </div>

          {/* Connected Devices (Watch Sync) */}
          <WatchSyncSection />

          {/* Password */}
          <PasswordChangeSection />

          {/* Blocked Users */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Blocked Users</h3>
            {blockedLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : blockedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No blocked users</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((block) => (
                  <div key={block.blocked_id} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={block.blocked_user?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-xs">
                          {block.blocked_user?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{block.blocked_user?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">@{block.blocked_user?.username || 'user'}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        const success = await unblockUser(block.blocked_id);
                        if (success) toast({ title: 'User unblocked' });
                      }}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sign Out */}
          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/debug-ai')}
              className="w-full text-muted-foreground/50 hover:text-muted-foreground text-xs"
            >
              Debug AI
            </Button>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Sign Out
            </Button>
          </div>

          {/* Danger zone */}
          <div className="pt-2 pb-6">
            <Button
              variant="ghost"
              onClick={() => setDeleteModalOpen(true)}
              className="w-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete my account
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Account deletion modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => { setDeleteModalOpen(open); setDeleteConfirmText(''); }}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete your account</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground space-y-3 pt-1">
              <span className="block">
                This will delete your profile, workouts, nutrition logs, sleep data, health metrics,
                community posts, and all other personal data.
              </span>
              <span className="block">
                You have <strong>30 days to change your mind</strong> — log back in within that window
                and we'll restore everything. After 30 days, deletion is permanent and cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium">To confirm, type <strong>DELETE</strong> below</p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              autoCapitalize="characters"
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              className="w-full"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete my account
            </Button>
            <Button
              variant="outline"
              onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(''); }}
              className="w-full"
            >
              Keep my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImage}
        aspectRatio={cropperType === 'avatar' ? 1 : 3}
        onCropComplete={handleCropComplete}
        title={cropperType === 'avatar' ? 'Crop Profile Picture' : 'Crop Banner Image'}
      />
    </div>
  );
}
