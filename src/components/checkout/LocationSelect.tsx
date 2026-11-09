import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface LocationSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function LocationSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  disabledReason,
}: LocationSelectProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-xl bg-background px-3.5 font-normal transition-all duration-200",
            "hover:border-primary/40 hover:shadow-sm focus:ring-2 focus:ring-ring focus:ring-offset-1",
            !value && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <span className="truncate">
            {value || (disabled && disabledReason ? disabledReason : placeholder)}
          </span>
          <ChevronsUpDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border border-border/60 rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        align="start"
        sideOffset={6}
      >
        <Command className="bg-popover">
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-11"
          />
          <CommandList className="max-h-[260px] overflow-y-auto scroll-smooth">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup className="p-1.5">
              {options.map((opt) => {
                const isSelected = value === opt;
                return (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={(currentValue) => {
                      const match = options.find(
                        (o) => o.toLowerCase() === currentValue.toLowerCase()
                      );
                      onChange(match || opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150",
                      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                      isSelected && "bg-primary/10 text-foreground font-medium"
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 shrink-0 text-primary transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
