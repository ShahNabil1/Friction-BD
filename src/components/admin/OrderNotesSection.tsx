import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Loader2, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrderNotes } from "@/hooks/useOrderNotes";
import { useToast } from "@/hooks/use-toast";

interface OrderNotesSectionProps {
  orderId: string;
}

export function OrderNotesSection({ orderId }: OrderNotesSectionProps) {
  const { notes, isLoading, isAdding, addNote, deleteNote } = useOrderNotes(orderId);
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const success = await addNote(newNote);
    if (success) {
      setNewNote("");
      toast({
        title: "Note added",
        description: "Internal note has been saved",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const success = await deleteNote(noteId);
    if (success) {
      toast({
        title: "Note deleted",
        description: "Internal note has been removed",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Internal Notes</h4>
        <span className="text-xs text-muted-foreground">(Staff only)</span>
      </div>

      {/* Add Note */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add an internal note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[60px] resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAddNote();
            }
          }}
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={isAdding || !newNote.trim()}
          className="shrink-0"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No internal notes yet
        </p>
      ) : (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group relative rounded-lg bg-muted/50 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap text-foreground">{note.note}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{note.created_by_name || "Unknown"}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(note.created_at), "MMM dd, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteNote(note.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
