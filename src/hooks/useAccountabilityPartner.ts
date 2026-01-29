import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AccountabilityPartner {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  shared_streak: number;
  status: string;
  created_at: string;
  accepted_at: string | null;
  worked_out_today: boolean;
}

export function useAccountabilityPartner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch the user's accountability partner
  const { data: partner, isLoading } = useQuery({
    queryKey: ["accountability-partner", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get accepted pairs where user is either party
      const { data: pairs } = await supabase
        .from("accountability_pairs")
        .select("*")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq("status", "accepted")
        .limit(1);

      if (!pairs || pairs.length === 0) return null;

      const pair = pairs[0];
      const partnerId = pair.user_id === user.id ? pair.partner_id : pair.user_id;

      // Get partner's profile
      const { data: profile } = await supabase
        .from("community_profiles")
        .select("display_name, avatar_url")
        .eq("user_id", partnerId)
        .single();

      // Check if partner worked out today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayWorkout } = await supabase
        .from("workout_progress")
        .select("id")
        .eq("user_id", partnerId)
        .not("completed_at", "is", null)
        .gte("completed_at", today.toISOString())
        .limit(1);

      return {
        id: pair.id,
        partner_id: partnerId,
        partner_name: profile?.display_name || "Partner",
        partner_avatar: profile?.avatar_url,
        shared_streak: pair.shared_streak,
        status: pair.status,
        created_at: pair.created_at,
        accepted_at: pair.accepted_at,
        worked_out_today: (todayWorkout?.length || 0) > 0,
      } as AccountabilityPartner;
    },
    enabled: !!user,
  });

  // Fetch pending requests
  const { data: pendingRequests } = useQuery({
    queryKey: ["accountability-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: pairs } = await supabase
        .from("accountability_pairs")
        .select("*")
        .eq("partner_id", user.id)
        .eq("status", "pending");

      if (!pairs) return [];

      // Get requester profiles
      const userIds = pairs.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("community_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return pairs.map(pair => ({
        id: pair.id,
        user_id: pair.user_id,
        user_name: profileMap.get(pair.user_id)?.display_name || "User",
        user_avatar: profileMap.get(pair.user_id)?.avatar_url,
        created_at: pair.created_at,
      }));
    },
    enabled: !!user,
  });

  // Send partner request
  const sendRequest = useMutation({
    mutationFn: async (partnerId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("accountability_pairs")
        .insert({
          user_id: user.id,
          partner_id: partnerId,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partner request sent!");
      queryClient.invalidateQueries({ queryKey: ["accountability-partner"] });
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Request already sent to this user");
      } else {
        toast.error("Failed to send request");
      }
    },
  });

  // Accept partner request
  const acceptRequest = useMutation({
    mutationFn: async (pairId: string) => {
      const { error } = await supabase
        .from("accountability_pairs")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", pairId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partner request accepted!");
      queryClient.invalidateQueries({ queryKey: ["accountability-partner"] });
      queryClient.invalidateQueries({ queryKey: ["accountability-requests"] });
    },
    onError: () => {
      toast.error("Failed to accept request");
    },
  });

  // Decline partner request
  const declineRequest = useMutation({
    mutationFn: async (pairId: string) => {
      const { error } = await supabase
        .from("accountability_pairs")
        .delete()
        .eq("id", pairId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request declined");
      queryClient.invalidateQueries({ queryKey: ["accountability-requests"] });
    },
    onError: () => {
      toast.error("Failed to decline request");
    },
  });

  // Remove partner
  const removePartner = useMutation({
    mutationFn: async (pairId: string) => {
      const { error } = await supabase
        .from("accountability_pairs")
        .delete()
        .eq("id", pairId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partnership ended");
      queryClient.invalidateQueries({ queryKey: ["accountability-partner"] });
    },
    onError: () => {
      toast.error("Failed to remove partner");
    },
  });

  return {
    partner,
    pendingRequests,
    isLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removePartner,
  };
}
