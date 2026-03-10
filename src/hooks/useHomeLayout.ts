import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HomeSection {
  id: string;
  section_key: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

export function useHomeLayout() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLayout = async () => {
      const { data, error } = await supabase
        .from("home_layout")
        .select("*")
        .order("sort_order");

      if (!error && data) {
        setSections(data as HomeSection[]);
      }
      setLoading(false);
    };

    fetchLayout();
  }, []);

  return { sections, loading };
}
