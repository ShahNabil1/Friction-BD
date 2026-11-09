import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Merge multiple refs (function or object) onto a single node.
 */
function useMergedRef<T>(...refs: Array<React.Ref<T> | undefined>) {
  return React.useCallback((node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  }, refs); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Serialize all form-like inputs inside `root` into a single string.
 * Used to detect whether the user typed / changed anything after the
 * dialog opened so we can prompt before discarding unsaved edits.
 */
function snapshotFormState(root: HTMLElement | null): string {
  if (!root) return "";
  const nodes = root.querySelectorAll<HTMLElement>(
    'input, textarea, select, [contenteditable="true"], [contenteditable=""]'
  );
  const parts: string[] = [];
  nodes.forEach((el) => {
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox" || el.type === "radio") {
        parts.push(el.checked ? "1" : "0");
      } else if (el.type === "file") {
        parts.push(String(el.files?.length ?? 0));
      } else {
        parts.push(el.value ?? "");
      }
    } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      parts.push(el.value ?? "");
    } else if ((el as HTMLElement).isContentEditable) {
      parts.push(el.textContent ?? "");
    }
  });
  return parts.join("\u0001");
}

const DIRTY_CONFIRM_MESSAGE =
  "আপনি কিছু পরিবর্তন করেছেন যা সেভ করা হয়নি। সেভ না করেই ক্লোজ করবেন?";

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onPointerDownOutside, onInteractOutside, onEscapeKeyDown, ...props }, ref) => {
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRef<HTMLDivElement>(ref as React.Ref<HTMLDivElement>, localRef);
  const initialSnapshotRef = React.useRef<string>("");
  const snapshotReadyRef = React.useRef<boolean>(false);
  const bypassRef = React.useRef<boolean>(false);
  const forceCloseRef = React.useRef<HTMLButtonElement | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Take an initial snapshot after the dialog mounts (allow one paint
  // so controlled inputs receive their default values first).
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      initialSnapshotRef.current = snapshotFormState(localRef.current);
      snapshotReadyRef.current = true;
    });
    return () => {
      cancelAnimationFrame(raf);
      snapshotReadyRef.current = false;
    };
  }, []);

  const isDirty = React.useCallback(() => {
    if (!snapshotReadyRef.current) return false;
    return snapshotFormState(localRef.current) !== initialSnapshotRef.current;
  }, []);

  /** Returns true when the caller should block (cancel) the close attempt. */
  const shouldBlockClose = React.useCallback((): boolean => {
    if (bypassRef.current) return false;
    if (!isDirty()) return false;
    setConfirmOpen(true);
    return true;
  }, [isDirty]);

  const handleConfirmDiscard = React.useCallback(() => {
    setConfirmOpen(false);
    bypassRef.current = true;
    // Trigger actual close on next tick so the alert dialog can unmount first.
    requestAnimationFrame(() => {
      forceCloseRef.current?.click();
    });
  }, []);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={mergedRef}
        onPointerDownOutside={(e) => {
          // Globally disable outside-click-to-close.
          e.preventDefault();
          onPointerDownOutside?.(e);
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
          onInteractOutside?.(e);
        }}
        onEscapeKeyDown={(e) => {
          if (shouldBlockClose()) e.preventDefault();
          onEscapeKeyDown?.(e);
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          onClick={(e) => {
            if (shouldBlockClose()) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        {/* Hidden close trigger used to bypass the dirty guard after confirm. */}
        <DialogPrimitive.Close ref={forceCloseRef} className="hidden" aria-hidden="true" tabIndex={-1} />
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent onEscapeKeyDown={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>সেভ করা হয়নি</AlertDialogTitle>
              <AlertDialogDescription>{DIRTY_CONFIRM_MESSAGE}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDiscard}>
                সেভ না করেই ক্লোজ করুন
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
