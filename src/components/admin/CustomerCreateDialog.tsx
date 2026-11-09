import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BDPhoneInput, isValidBDPhone } from "@/components/ui/bd-phone-input";

export type ManualCustomerAddress = {
  house_no?: string;
  road_no?: string;
  village?: string;
  thana?: string;
  upazilla?: string;
  zilla?: string;
  post_office?: string;
  flat_no?: string;
};

export type ManualCustomer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  address: ManualCustomerAddress | null;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, only asks for name + phone (for quick add flows) */
  compact?: boolean;
  onCreated?: (customer: ManualCustomer) => void;
};

export function CustomerCreateDialog({ open, onOpenChange, compact = false, onCreated }: Props) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    house_no: "",
    road_no: "",
    village: "",
    thana: "",
    upazilla: "",
    zilla: "",
    post_office: "",
    flat_no: "",
  });

  const canSave = useMemo(() => {
    if (!isValidBDPhone(form.phone)) return false;
    if (compact) return true;
    return !!form.full_name.trim();
  }, [form.phone, form.full_name, compact]);

  const reset = () => {
    setForm({
      full_name: "",
      email: "",
      phone: "",
      house_no: "",
      road_no: "",
      village: "",
      thana: "",
      upazilla: "",
      zilla: "",
      post_office: "",
      flat_no: "",
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);

    try {
      const address: ManualCustomerAddress | null = compact
        ? null
        : {
            house_no: form.house_no || undefined,
            road_no: form.road_no || undefined,
            village: form.village || undefined,
            thana: form.thana || undefined,
            upazilla: form.upazilla || undefined,
            zilla: form.zilla || undefined,
            post_office: form.post_office || undefined,
            flat_no: form.flat_no || undefined,
          };

      const { data, error } = await supabase
        .from("customers")
        .insert({
          full_name: form.full_name || null,
          email: form.email || null,
          phone: form.phone,
          address,
        } as any)
        .select("id, full_name, email, phone, address, created_at")
        .single();

      if (error) throw error;

      toast({ title: "Customer added", description: "Customer created successfully" });
      onCreated?.(data as ManualCustomer);
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create customer", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="w-[92vw] max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle>{compact ? "Quick Add Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            {compact
              ? "Add a customer with just name and phone. You can edit full address later."
              : "Create a customer for manual/POS orders."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer_full_name">Full Name{compact ? " (optional)" : ""}</Label>
            <Input
              id="customer_full_name"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Customer name"
            />
          </div>

          {!compact && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer_email">Email (optional)</Label>
              <Input
                id="customer_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="name@example.com"
              />
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer_phone">Phone *</Label>
            <BDPhoneInput
              id="customer_phone"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
              placeholder="01XXXXXXXXX"
              required
              showValidationHint
            />
          </div>

          {!compact && (
            <>
              <div className="space-y-2">
                <Label htmlFor="house_no">House / Flat No</Label>
                <Input id="house_no" value={form.house_no} onChange={(e) => setForm((p) => ({ ...p, house_no: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="road_no">Road / Street</Label>
                <Input id="road_no" value={form.road_no} onChange={(e) => setForm((p) => ({ ...p, road_no: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="village">Village / Area</Label>
                <Input id="village" value={form.village} onChange={(e) => setForm((p) => ({ ...p, village: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thana">Thana</Label>
                <Input id="thana" value={form.thana} onChange={(e) => setForm((p) => ({ ...p, thana: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upazilla">Upazilla</Label>
                <Input id="upazilla" value={form.upazilla} onChange={(e) => setForm((p) => ({ ...p, upazilla: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zilla">District (Zilla)</Label>
                <Input id="zilla" value={form.zilla} onChange={(e) => setForm((p) => ({ ...p, zilla: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post_office">Post Office</Label>
                <Input id="post_office" value={form.post_office} onChange={(e) => setForm((p) => ({ ...p, post_office: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flat_no">Flat No (optional)</Label>
                <Input id="flat_no" value={form.flat_no} onChange={(e) => setForm((p) => ({ ...p, flat_no: e.target.value }))} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
