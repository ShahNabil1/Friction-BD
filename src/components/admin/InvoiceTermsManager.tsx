import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InvoiceTermsManagerProps {
  terms: string[];
  onChange: (terms: string[]) => void;
}

export function InvoiceTermsManager({ terms, onChange }: InvoiceTermsManagerProps) {
  const [newTerm, setNewTerm] = useState("");

  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    onChange([...terms, newTerm.trim()]);
    setNewTerm("");
  };

  const handleRemoveTerm = (index: number) => {
    const updated = terms.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateTerm = (index: number, value: string) => {
    const updated = [...terms];
    updated[index] = value;
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...terms];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === terms.length - 1) return;
    const updated = [...terms];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {terms.map((term, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl border border-border/30"
          >
            <div className="flex flex-col gap-1 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <GripVertical className="h-3 w-3 rotate-90" />
              </Button>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Term {index + 1}
              </Label>
              <Input
                value={term}
                onChange={(e) => handleUpdateTerm(index, e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-5"
              onClick={() => handleRemoveTerm(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new term */}
      <div className="flex gap-2">
        <Input
          placeholder="Add new term or condition..."
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTerm();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAddTerm}
          disabled={!newTerm.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        These terms will appear at the bottom of customer invoices/receipts.
      </p>
    </div>
  );
}
