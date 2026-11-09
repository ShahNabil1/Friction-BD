import { Layers, Trash2, Clock, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { PosDraftRow } from "@/hooks/usePosDrafts";

interface POSOpenDraftsSheetProps {
  open: boolean;
  onClose: () => void;
  drafts: PosDraftRow[];
  isLoading: boolean;
  onSelectDraft: (draft: PosDraftRow) => void;
  onDeleteDraft: (draftId: string) => void;
  isDeletingId?: string | null;
}

export function POSOpenDraftsSheet({
  open,
  onClose,
  drafts,
  isLoading,
  onSelectDraft,
  onDeleteDraft,
  isDeletingId,
}: POSOpenDraftsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Saved Sales ({drafts.length})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No saved sales</p>
              <p className="text-sm">Press F9 to save a sale for later</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {drafts.map((draft) => {
                const itemCount = draft.payload?.lines?.length || 0;
                return (
                  <div
                    key={draft.id}
                    className="group relative p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onSelectDraft(draft)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {draft.label || "Untitled Draft"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(draft.updated_at), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDraft(draft.id);
                        }}
                        disabled={isDeletingId === draft.id}
                      >
                        {isDeletingId === draft.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
