import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Outlet } from "@/hooks/useOutlets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const outletSchema = z.object({
  name: z.string().min(1, "Outlet name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
  is_main_branch: z.boolean().default(false),
});

type OutletFormValues = z.infer<typeof outletSchema>;

interface OutletFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlet: Outlet | null;
  onSuccess: () => void;
}

export function OutletFormDialog({
  open,
  onOpenChange,
  outlet,
  onSuccess,
}: OutletFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!outlet;

  const form = useForm<OutletFormValues>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      is_active: true,
      is_main_branch: false,
    },
  });

  useEffect(() => {
    if (outlet) {
      form.reset({
        name: outlet.name,
        address: outlet.address || "",
        phone: outlet.phone || "",
        is_active: outlet.is_active,
        is_main_branch: outlet.is_main_branch,
      });
    } else {
      form.reset({
        name: "",
        address: "",
        phone: "",
        is_active: true,
        is_main_branch: false,
      });
    }
  }, [outlet, form]);

  const onSubmit = async (data: OutletFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("outlets")
          .update({
            name: data.name,
            address: data.address || null,
            phone: data.phone || null,
            is_active: data.is_active,
            is_main_branch: data.is_main_branch,
            updated_at: new Date().toISOString(),
          })
          .eq("id", outlet.id);

        if (error) throw error;
        toast.success("Outlet updated successfully");
      } else {
        const { error } = await supabase.from("outlets").insert({
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          is_active: data.is_active,
          is_main_branch: data.is_main_branch,
        });

        if (error) throw error;
        toast.success("Outlet created successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save outlet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Outlet" : "Add New Outlet"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outlet Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bogura Branch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Full address" {...field} />
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
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <BDPhoneInput placeholder="01XXXXXXXXX" value={field.value || ""} onChange={field.onChange} showValidationHint />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_main_branch"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Main Branch</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Update Outlet"
                  : "Create Outlet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
