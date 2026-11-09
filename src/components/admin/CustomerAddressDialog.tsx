import { MapPin, Phone, User, Home } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomerAddress {
  label?: string;
  full_name?: string | null;
  phone?: string | null;
  house_no?: string | null;
  road_no?: string | null;
  flat_no?: string | null;
  village?: string | null;
  thana?: string | null;
  zilla?: string | null;
  post_office?: string | null;
  upazilla?: string | null;
}

interface CustomerAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  address: CustomerAddress | null | undefined;
}

export function CustomerAddressDialog({
  open,
  onOpenChange,
  customerName,
  address,
}: CustomerAddressDialogProps) {
  const hasAddress = address && (
    address.house_no || address.road_no || address.village || 
    address.thana || address.zilla || address.phone
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Delivery Address
          </DialogTitle>
          <DialogDescription>
            Address details for {customerName || "Customer"}
          </DialogDescription>
        </DialogHeader>

        {hasAddress ? (
          <div className="space-y-4">
            {/* Label */}
            {address.label && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Home className="h-3.5 w-3.5" />
                {address.label}
              </div>
            )}

            {/* Full Name */}
            {address.full_name && (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="font-medium">{address.full_name}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {address.phone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{address.phone}</p>
                </div>
              </div>
            )}

            {/* Address Details */}
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Address</p>
                <div className="space-y-0.5 text-sm">
                  {(address.flat_no || address.house_no || address.road_no) && (
                    <p>
                      {address.flat_no && `Flat ${address.flat_no}, `}
                      {address.house_no && `House ${address.house_no}, `}
                      {address.road_no && `Road ${address.road_no}`}
                    </p>
                  )}
                  {address.village && <p>{address.village}</p>}
                  {(address.thana || address.upazilla) && (
                    <p>
                      {address.thana}
                      {address.thana && address.upazilla && ", "}
                      {address.upazilla}
                    </p>
                  )}
                  {(address.post_office || address.zilla) && (
                    <p className="font-medium">
                      {address.post_office && `${address.post_office}, `}
                      {address.zilla}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No address found</p>
            <p className="text-sm text-muted-foreground/70">
              This customer hasn't saved any delivery address yet.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
