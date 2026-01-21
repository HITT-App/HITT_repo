import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Coach {
  id: string;
  name: string;
  avatar_url: string | null;
  title: string;
  bio: string | null;
  specialties: string[];
  coaching_types: string[];
  experience_years: number;
  certifications: string[];
  languages: string[];
  rating: number;
  review_count: number;
  session_count: number;
  price_per_session_min: number;
  price_per_session_max: number;
  is_available: boolean;
  is_featured: boolean;
  gender: string;
  gallery_urls: string[];
  location_address: string | null;
  available_days: string[];
}

export interface CoachingPreferences {
  id: string;
  user_id: string;
  preferred_workout_types: string[];
  preferred_coach_gender: string | null;
  target_body_areas: string[];
  budget_min: number;
  budget_max: number;
  session_duration_minutes: number;
  coaching_type: string;
  exercise_frequency: string | null;
  workout_time_preference: string | null;
  supplements: string[];
  onboarding_completed: boolean;
}

export interface CoachFilters {
  specialty?: string;
  coachingType?: string;
  gender?: string;
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  searchQuery?: string;
}

export function useCoaches(filters?: CoachFilters) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredCoaches, setFeaturedCoaches] = useState<Coach[]>([]);

  const fetchCoaches = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('coaches')
        .select('*')
        .eq('is_available', true)
        .order('rating', { ascending: false });

      if (filters?.specialty) {
        query = query.contains('specialties', [filters.specialty]);
      }
      if (filters?.coachingType) {
        query = query.contains('coaching_types', [filters.coachingType]);
      }
      if (filters?.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }
      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating);
      }
      if (filters?.priceMax) {
        query = query.lte('price_per_session_min', filters.priceMax);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Client-side search filter
      if (filters?.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        filteredData = filteredData.filter(coach =>
          coach.name.toLowerCase().includes(searchLower) ||
          coach.title.toLowerCase().includes(searchLower) ||
          coach.specialties?.some((s: string) => s.toLowerCase().includes(searchLower))
        );
      }

      setCoaches(filteredData as Coach[]);
      setFeaturedCoaches(filteredData.filter(c => c.is_featured) as Coach[]);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    } finally {
      setLoading(false);
    }
  }, [filters?.specialty, filters?.coachingType, filters?.gender, filters?.priceMax, filters?.minRating, filters?.searchQuery]);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  return { coaches, featuredCoaches, loading, refetch: fetchCoaches };
}

export function useCoach(coachId: string | undefined) {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;

    const fetchCoach = async () => {
      setLoading(true);
      try {
        const { data: coachData } = await supabase
          .from('coaches')
          .select('*')
          .eq('id', coachId)
          .single();

        if (coachData) setCoach(coachData as Coach);

        const { data: reviewsData } = await supabase
          .from('coach_reviews')
          .select('*')
          .eq('coach_id', coachId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (reviewsData) setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching coach:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [coachId]);

  return { coach, reviews, loading };
}

export function useCoachingPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CoachingPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('coaching_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) setPreferences(data as CoachingPreferences);
    } catch (error) {
      // No preferences yet
    } finally {
      setLoading(false);
    }
  }, [user]);

  const savePreferences = async (prefs: Partial<CoachingPreferences>) => {
    if (!user) return false;

    try {
      if (preferences) {
        const { error } = await supabase
          .from('coaching_preferences')
          .update(prefs)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coaching_preferences')
          .insert({ ...prefs, user_id: user.id });
        if (error) throw error;
      }
      await fetchPreferences();
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return { preferences, loading, savePreferences, refetch: fetchPreferences };
}
