import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
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
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Address } from "./AddressCard";

// Simplified schema - removed house_no, flat_no, post_office from validation
const addressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  road_no: z.string().optional(),
  village: z.string().optional(),
  thana: z.string().optional(),
  upazilla: z.string().optional(),
  zilla: z.string().min(1, "District is required"),
  is_default: z.boolean().default(false),
});

export type AddressFormData = z.infer<typeof addressSchema> & {
  // These fields are sent to DB but not in the form
  house_no?: string;
  flat_no?: string;
  post_office?: string;
};

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddressFormData) => Promise<void>;
  editingAddress?: Address | null;
  isSaving: boolean;
}

export function AddressFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editingAddress,
  isSaving,
}: AddressFormDialogProps) {
  const form = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "Home",
      full_name: "",
      phone: "",
      road_no: "",
      village: "",
      thana: "",
      upazilla: "",
      zilla: "",
      is_default: false,
    },
  });

  useEffect(() => {
    if (editingAddress) {
      form.reset({
        label: editingAddress.label || "Home",
        full_name: editingAddress.full_name || "",
        phone: editingAddress.phone || "",
        road_no: editingAddress.road_no || "",
        village: editingAddress.village || "",
        thana: editingAddress.thana || "",
        upazilla: editingAddress.upazilla || "",
        zilla: editingAddress.zilla || "",
        is_default: editingAddress.is_default || false,
      });
    } else {
      form.reset({
        label: "Home",
        full_name: "",
        phone: "",
        road_no: "",
        village: "",
        thana: "",
        upazilla: "",
        zilla: "",
        is_default: false,
      });
    }
  }, [editingAddress, form, open]);

  const handleSubmit = async (data: z.infer<typeof addressSchema>) => {
    // Include empty strings for removed fields to satisfy DB schema
    await onSubmit({
      ...data,
      house_no: "",
      flat_no: "",
      post_office: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAddress ? "Edit Address" : "Add New Address"}
          </DialogTitle>
          <DialogDescription>
            {editingAddress
              ? "Update your delivery address details"
              : "Add a new delivery address to your account"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Label</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select label" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 1: Name & Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <BDPhoneInput placeholder="01XXXXXXXXX" value={field.value || ""} onChange={field.onChange} showValidationHint />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Road No & Village/Area */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="road_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Road No / Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Road number or address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="village"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Village/Area</FormLabel>
                    <FormControl>
                      <Input placeholder="Village or area" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Thana & Upazilla */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="thana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thana</FormLabel>
                    <FormControl>
                      <Input placeholder="Thana" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="upazilla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upazilla</FormLabel>
                    <FormControl>
                      <Input placeholder="Upazilla" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: District (full width) */}
            <FormField
              control={form.control}
              name="zilla"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District (Zilla) *</FormLabel>
                  <FormControl>
                    <Input placeholder="District" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set as default address</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      This address will be pre-selected during checkout
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingAddress ? (
                  "Update Address"
                ) : (
                  "Add Address"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
