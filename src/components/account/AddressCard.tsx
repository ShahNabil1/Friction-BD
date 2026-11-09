import { Home, Building2, MapPin, Star, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string | null;
  phone: string | null;
  house_no: string | null;
  flat_no: string | null;
  road_no: string | null;
  village: string | null;
  post_office: string | null;
  thana: string | null;
  upazilla: string | null;
  zilla: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  onSetDefault?: (address: Address) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (address: Address) => void;
  compact?: boolean;
}

const labelIcons: Record<string, React.ReactNode> = {
  Home: <Home className="h-4 w-4" />,
  Work: <Building2 className="h-4 w-4" />,
  Other: <MapPin className="h-4 w-4" />,
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  selectable = false,
  selected = false,
  onSelect,
  compact = false,
}: AddressCardProps) {
  const formatAddressLine = () => {
    const parts: string[] = [];
    if (address.flat_no) parts.push(`Flat ${address.flat_no}`);
    if (address.house_no) parts.push(`House ${address.house_no}`);
    if (address.road_no) parts.push(`Road ${address.road_no}`);
    if (address.village) parts.push(address.village);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const formatLocationLine = () => {
    const parts: string[] = [];
    if (address.post_office) parts.push(`P.O: ${address.post_office}`);
    if (address.thana) parts.push(address.thana);
    if (address.upazilla) parts.push(address.upazilla);
    if (address.zilla) parts.push(address.zilla);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(address);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "rounded-lg border bg-card p-4 transition-all",
        selectable && "cursor-pointer hover:border-primary/50",
        selected && "border-primary ring-2 ring-primary/20",
        !selectable && "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "rounded-full p-2",
          address.is_default ? "bg-primary/10" : "bg-muted"
        )}>
          {labelIcons[address.label] || <MapPin className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{address.label}</span>
            {address.is_default && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            )}
          </div>
          {address.full_name && (
            <p className="text-sm text-foreground mt-1">{address.full_name}</p>
          )}
          {formatAddressLine() && (
            <p className="text-sm text-muted-foreground">{formatAddressLine()}</p>
          )}
          {formatLocationLine() && (
            <p className="text-sm text-muted-foreground">{formatLocationLine()}</p>
          )}
          {address.phone && (
            <p className="text-sm text-muted-foreground">Phone: {address.phone}</p>
          )}
        </div>
      </div>

      {!compact && !selectable && (onEdit || onDelete || onSetDefault) && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(address);
              }}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {onSetDefault && !address.is_default && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault(address);
              }}
              className="gap-1.5"
            >
              <Star className="h-3.5 w-3.5" />
              Set Default
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(address);
              }}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
