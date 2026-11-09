import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";
import { toast } from "@/hooks/use-toast";
import type { Address } from "@/components/account/AddressCard";
import type { AddressFormData } from "@/components/account/AddressFormDialog";

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses((data as unknown as Address[]) || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast({
        title: "Error",
        description: "Failed to load addresses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addAddress = async (data: AddressFormData) => {
    if (!user) return;

    setIsSaving(true);
    try {
      // If this is set as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { error } = await supabase.from("user_addresses").insert({
        user_id: user.id,
        ...data,
      } as any);

      if (error) throw error;

      toast({
        title: "Address Added",
        description: "Your new address has been saved.",
      });

      await fetchAddresses();
    } catch (error) {
      console.error("Error adding address:", error);
      toast({
        title: "Error",
        description: "Failed to add address. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateAddress = async (id: string, data: AddressFormData) => {
    if (!user) return;

    setIsSaving(true);
    try {
      // If this is set as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { error } = await supabase
        .from("user_addresses")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Address Updated",
        description: "Your address has been updated.",
      });

      await fetchAddresses();
    } catch (error) {
      console.error("Error updating address:", error);
      toast({
        title: "Error",
        description: "Failed to update address. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Address Deleted",
        description: "The address has been removed.",
      });

      await fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast({
        title: "Error",
        description: "Failed to delete address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const setDefaultAddress = async (id: string) => {
    if (!user) return;

    try {
      // Unset all defaults first
      await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set the new default
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Default Address Updated",
        description: "This address is now your default.",
      });

      await fetchAddresses();
    } catch (error) {
      console.error("Error setting default address:", error);
      toast({
        title: "Error",
        description: "Failed to set default address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDefaultAddress = () => {
    return addresses.find((a) => a.is_default) || addresses[0] || null;
  };

  return {
    addresses,
    isLoading,
    isSaving,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
    refetch: fetchAddresses,
  };
}
