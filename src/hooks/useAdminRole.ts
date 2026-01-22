import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface AdminRoleState {
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
}

export function useAdminRole() {
  const { user } = useAuth();
  const [state, setState] = useState<AdminRoleState>({
    isAdmin: false,
    isModerator: false,
    loading: true,
  });

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setState({ isAdmin: false, isModerator: false, loading: false });
        return;
      }

      try {
        // Check admin role
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        // Check moderator role
        const { data: isModerator } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "moderator",
        });

        setState({
          isAdmin: Boolean(isAdmin),
          isModerator: Boolean(isModerator),
          loading: false,
        });
      } catch (error) {
        console.error("Error checking roles:", error);
        setState({ isAdmin: false, isModerator: false, loading: false });
      }
    };

    checkRoles();
  }, [user]);

  return state;
}
