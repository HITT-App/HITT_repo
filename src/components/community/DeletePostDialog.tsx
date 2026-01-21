import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { X, Check } from "lucide-react";

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const DeletePostDialog = ({ open, onOpenChange, onConfirm }: DeletePostDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-3xl">
        <div className="text-center py-4">
          {/* Trash Can Image */}
          <div className="w-40 h-40 mx-auto mb-6 bg-muted rounded-2xl flex items-center justify-center">
            <span className="text-6xl">🗑️</span>
          </div>
          
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-xl font-bold">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure to delete this post?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex-col gap-3 mt-6 sm:flex-col">
            <AlertDialogAction 
              className="w-full bg-destructive hover:bg-destructive/90 gap-2"
              onClick={onConfirm}
            >
              Yes, Delete <Check className="w-4 h-4" />
            </AlertDialogAction>
            <AlertDialogCancel className="w-full border-destructive text-destructive hover:bg-destructive/10 gap-2 mt-0">
              <X className="w-4 h-4" /> No, don't delete
            </AlertDialogCancel>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePostDialog;
