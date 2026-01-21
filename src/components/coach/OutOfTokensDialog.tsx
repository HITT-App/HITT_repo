import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface OutOfTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

export function OutOfTokensDialog({ open, onOpenChange, onUpgrade }: OutOfTokensDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center py-4">
          {/* Kettlebell Image Placeholder */}
          <div className="w-40 h-40 mb-6 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <div className="w-24 h-32 rounded-2xl bg-gradient-to-b from-gray-300 to-gray-400 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-8 rounded-full border-4 border-gray-400 bg-transparent" />
            </div>
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold">
              Whoops! out of token!
            </DialogTitle>
            <DialogDescription className="text-base">
              Unfortunately, you are out of token and needs to upgrade to the pro plan. Let's do it now!
            </DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-3 mt-6">
            <Button
              className="w-full h-12 rounded-2xl gap-2"
              onClick={() => {
                onUpgrade();
                onOpenChange(false);
              }}
            >
              Go Pro Now!
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => onOpenChange(false)}
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
