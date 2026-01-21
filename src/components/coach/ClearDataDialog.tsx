import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare } from 'lucide-react';

interface ClearDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  totalChats: number;
}

export function ClearDataDialog({ open, onOpenChange, onConfirm, totalChats }: ClearDataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center py-4">
          {/* Refresh Icon */}
          <div className="w-32 h-32 mb-6 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-24 h-24 text-blue-500" strokeWidth={2} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">{totalChats.toLocaleString()} Total Chats</span>
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold">
              Clear AI Assistant Data & Reset Memory?
            </DialogTitle>
            <DialogDescription>
              This will erase all of the history. This means AI chatbot will lose knowledge about your health data.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-2 mt-6">
            <Button
              className="w-full h-12 rounded-2xl"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              Yes, Clear All
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => onOpenChange(false)}
            >
              <span className="mr-2">×</span> No, nevermind
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
