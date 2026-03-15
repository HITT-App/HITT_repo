import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface RouteCoordinate {
  lat: number;
  lng: number;
  alt?: number;
}

export interface Route {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  distance_km: number;
  elevation_gain_m: number;
  estimated_minutes: number;
  difficulty: "easy" | "moderate" | "hard";
  surface_type: string;
  coordinates: RouteCoordinate[];
  is_public: boolean;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateRouteInput {
  name: string;
  description?: string;
  distance_km: number;
  elevation_gain_m: number;
  estimated_minutes: number;
  difficulty: "easy" | "moderate" | "hard";
  surface_type: string;
  coordinates: RouteCoordinate[];
  is_public?: boolean;
  tags?: string[];
}

export const useRoutes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        coordinates: (r.coordinates as RouteCoordinate[]) ?? [],
        tags: r.tags ?? [],
        distance_km: Number(r.distance_km),
        elevation_gain_m: Number(r.elevation_gain_m),
      })) as Route[];
    },
    enabled: !!user,
  });

  const { data: savedRoutes = [] } = useQuery({
    queryKey: ["routes", "saved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        coordinates: (r.coordinates as RouteCoordinate[]) ?? [],
        tags: r.tags ?? [],
        distance_km: Number(r.distance_km),
        elevation_gain_m: Number(r.elevation_gain_m),
      })) as Route[];
    },
    enabled: !!user,
  });

  const createRoute = useMutation({
    mutationFn: async (input: CreateRouteInput) => {
      const { data, error } = await supabase
        .from("routes")
        .insert({
          ...input,
          user_id: user!.id,
          coordinates: input.coordinates as any,
          tags: input.tags ?? [],
          is_public: input.is_public ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route saved!" });
    },
    onError: () => {
      toast({ title: "Failed to save route", variant: "destructive" });
    },
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast({ title: "Route deleted" });
    },
  });

  return { routes, savedRoutes, isLoading, createRoute, deleteRoute };
};
