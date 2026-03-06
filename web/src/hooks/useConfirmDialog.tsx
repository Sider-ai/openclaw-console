import { useCallback, useRef, useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

export function useConfirmDialog(): {
  requestConfirm: (message: string) => Promise<boolean>;
  confirmDialogNode: ReactNode;
} {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const requestConfirm = useCallback((msg: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setMessage(msg);
      setOpen(true);
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setOpen(false);
  }

  function handleCancel() {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setOpen(false);
  }

  const confirmDialogNode = (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestConfirm, confirmDialogNode };
}
