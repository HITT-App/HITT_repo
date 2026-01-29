import { useAccountabilityPartner } from "@/hooks/useAccountabilityPartner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Flame, Check, X, UserPlus, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AccountabilityPartnerCard() {
  const navigate = useNavigate();
  const { 
    partner, 
    pendingRequests, 
    isLoading,
    acceptRequest,
    declineRequest,
  } = useAccountabilityPartner();

  if (isLoading) {
    return (
      <div className="mx-4 mb-4">
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="animate-pulse flex gap-3">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show pending requests
  if (pendingRequests && pendingRequests.length > 0 && !partner) {
    const request = pendingRequests[0];
    return (
      <div className="mx-4 mb-4">
        <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Partner Request
          </h3>
          
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={request.user_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {request.user_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{request.user_name}</p>
              <p className="text-xs text-muted-foreground">wants to be your accountability partner</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              size="sm"
              onClick={() => acceptRequest.mutate(request.id)}
            >
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => declineRequest.mutate(request.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show active partner
  if (partner) {
    return (
      <div className="mx-4 mb-4">
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Accountability Partner
          </h3>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={partner.partner_avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {partner.partner_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Status indicator */}
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center",
                partner.worked_out_today ? "bg-accent" : "bg-muted"
              )}>
                {partner.worked_out_today && <Check className="w-2.5 h-2.5 text-accent-foreground" />}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {partner.partner_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {partner.worked_out_today 
                  ? "✅ Worked out today!" 
                  : "Hasn't worked out yet"}
              </p>
            </div>

            {/* Shared streak */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">{partner.shared_streak}</span>
            </div>
          </div>

          {/* Message button */}
          <Button
            variant="outline"
            className="w-full mt-3"
            size="sm"
            onClick={() => navigate(`/community/messages?user=${partner.partner_id}`)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>
    );
  }

  // Show find partner CTA
  return (
    <div className="mx-4 mb-4">
      <div className="bg-card border border-border/60 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Find a Partner</h3>
            <p className="text-xs text-muted-foreground">Stay accountable together</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={() => navigate("/community/search")}
        >
          Find Accountability Partner
        </Button>
      </div>
    </div>
  );
}
