import { AlertDialogHeader, AlertDialogFooter, AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import type { PendingAction } from "@/types";

interface ConfirmationDialogProps {
  pendingAction: PendingAction | undefined;
  setPendingAction: (action: PendingAction | undefined) => void;
}

export function ConfirmationDialog({ pendingAction, setPendingAction }: ConfirmationDialogProps) {
  return (
    <AlertDialog open={pendingAction !== undefined} onOpenChange={open => !open && setPendingAction(undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingAction?.prompt}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              pendingAction?.action();
              setPendingAction(undefined);
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
