import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, MapPin, Save, Loader2, ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { AddressCard, type Address } from "@/components/account/AddressCard";
import { AddressFormDialog, type AddressFormData } from "@/components/account/AddressFormDialog";
import { useAddresses } from "@/hooks/useAddresses";
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

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Account() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  const {
    addresses,
    isLoading: isLoadingAddresses,
    isSaving: isSavingAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddresses();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          form.reset({
            full_name: data.full_name || "",
            phone: data.phone || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSaving(true);
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let error;
      if (existingProfile) {
        // Update existing profile using user_id for RLS
        const result = await supabase
          .from("profiles")
          .update({
            full_name: data.full_name,
            phone: data.phone,
          })
          .eq("user_id", user.id);
        error = result.error;
      } else {
        // Insert new profile
        const result = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            user_id: user.id,
            full_name: data.full_name,
            phone: data.phone,
          });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddressSubmit = async (data: AddressFormData) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, data);
      } else {
        await addAddress(data);
      }
      setIsAddressDialogOpen(false);
      setEditingAddress(null);
    } catch {
      // Error is handled in the hook
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsAddressDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingAddress) {
      await deleteAddress(deletingAddress.id);
      setDeletingAddress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HeaderNav />
      
      <main className="container py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Account</h1>
            <p className="text-muted-foreground">Manage your profile and delivery addresses</p>
          </div>

          <div className="space-y-8">
            {/* Personal Information */}
            <Card className="border-border/50 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your basic account information
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="sm:max-w-[50%]">
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <BDPhoneInput placeholder="01XXXXXXXXX" className="rounded-xl" value={field.value || ""} onChange={field.onChange} showValidationHint />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="min-w-[120px] rounded-xl bg-bubu-red hover:bg-bubu-red/90"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Delivery Addresses */}
            <Card className="border-border/50 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <MapPin className="h-5 w-5" />
                      Delivery Addresses
                    </CardTitle>
                    <CardDescription>
                      Manage your saved delivery addresses
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEditingAddress(null);
                      setIsAddressDialogOpen(true);
                    }}
                    className="gap-1.5 rounded-xl bg-bubu-green text-bubu-green-foreground hover:bg-bubu-green/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add Address
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-primary" />
                    </div>
                    <p className="mt-4 text-muted-foreground">
                      No saved addresses yet
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 rounded-xl"
                      onClick={() => {
                        setEditingAddress(null);
                        setIsAddressDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Address
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {addresses.map((address) => (
                      <AddressCard
                        key={address.id}
                        address={address}
                        onEdit={handleEditAddress}
                        onDelete={setDeletingAddress}
                        onSetDefault={(addr) => setDefaultAddress(addr.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Address Form Dialog */}
      <AddressFormDialog
        open={isAddressDialogOpen}
        onOpenChange={(open) => {
          setIsAddressDialogOpen(open);
          if (!open) setEditingAddress(null);
        }}
        onSubmit={handleAddressSubmit}
        editingAddress={editingAddress}
        isSaving={isSavingAddress}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAddress} onOpenChange={() => setDeletingAddress(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
