import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  fitness_goal: string | null;
};

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'fitness_goal' | 'avatar_url'>>) => {
    if (!user || !profile) return false;

    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    setUpdating(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile' });
      return false;
    }

    setProfile(prev => prev ? { ...prev, ...updates } : null);
    toast({ title: 'Profile updated', description: 'Your changes have been saved' });
    return true;
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Delete existing avatar if any
    await supabase.storage.from('avatars').remove([filePath]);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload avatar' });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Add cache buster to URL
    const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
    
    return urlWithCacheBuster;
  };

  return {
    profile,
    loading,
    updating,
    updateProfile,
    uploadAvatar,
    refetch: fetchProfile,
  };
}
