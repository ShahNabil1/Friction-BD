import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";

export interface Outlet {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_main_branch: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutletInventoryItem {
  id: string;
  outlet_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product?: {
    id: string;
    title: string;
    sku: string | null;
    images: string[] | null;
  };
  variant?: {
    id: string;
    size: string | null;
    color: string | null;
    sku: string | null;
  };
}

export interface InventoryTransfer {
  id: string;
  from_outlet_id: string;
  to_outlet_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  status: "pending" | "completed" | "cancelled";
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  from_outlet?: { id: string; name: string } | null;
  to_outlet?: { id: string; name: string } | null;
}

export interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  assigned_outlet_id: string | null;
  outlet_role: string | null;
  role: string | null;
  can_access_pos: boolean | null;
  assigned_outlet?: Outlet;
}

// Fetch all outlets
export function useOutlets() {
  return useQuery({
    queryKey: ["outlets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outlets")
        .select("id, name, address, phone, is_main_branch, is_active, created_at, updated_at")
        .order("is_main_branch", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as Outlet[];
    },
  });
}

// Fetch single outlet
export function useOutlet(outletId: string | null) {
  return useQuery({
    queryKey: ["outlets", outletId],
    queryFn: async () => {
      if (!outletId) return null;
      const { data, error } = await supabase
        .from("outlets")
        .select("id, name, address, phone, is_main_branch, is_active, created_at, updated_at")
        .eq("id", outletId)
        .single();

      if (error) throw error;
      return data as Outlet;
    },
    enabled: !!outletId,
  });
}

// Fetch outlet inventory
export function useOutletInventory(outletId: string | null) {
  return useQuery({
    queryKey: ["outlet-inventory", outletId],
    queryFn: async () => {
      if (!outletId) return [];
      const { data, error } = await supabase
        .from("outlet_inventory")
        .select(`
          *,
          product:products(id, title, sku, images),
          variant:product_variants(id, size, color, sku)
        `)
        .eq("outlet_id", outletId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OutletInventoryItem[];
    },
    enabled: !!outletId,
  });
}

// Fetch inventory transfers
export function useInventoryTransfers(outletId?: string | null) {
  return useQuery({
    queryKey: ["inventory-transfers", outletId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_transfers")
        .select(`
          *,
          from_outlet:outlets!inventory_transfers_from_outlet_id_fkey(id, name),
          to_outlet:outlets!inventory_transfers_to_outlet_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false });

      if (outletId) {
        query = query.or(`from_outlet_id.eq.${outletId},to_outlet_id.eq.${outletId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryTransfer[];
    },
  });
}

// Fetch staff members with outlet assignments
export function useStaffMembers() {
  return useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone,
          assigned_outlet_id,
          outlet_role,
          role,
          can_access_pos,
          assigned_outlet:outlets(id, name)
        `)
        .in("role", ["admin", "moderator", "super_admin"])
        .order("full_name");

      if (error) throw error;
      return data as StaffMember[];
    },
  });
}

// Create outlet mutation
export function useCreateOutlet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (outlet: { name: string; address?: string; phone?: string }) => {
      const { data, error } = await supabase
        .from("outlets")
        .insert({
          name: outlet.name,
          address: outlet.address || null,
          phone: outlet.phone || null,
          is_main_branch: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Outlet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });
}

// Update outlet mutation
export function useUpdateOutlet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string; 
      name?: string; 
      address?: string | null; 
      phone?: string | null;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("outlets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Outlet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });
}

// Delete outlet mutation
export function useDeleteOutlet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("outlets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlets"] });
    },
  });
}

// Assign staff to outlet mutation
export function useAssignStaffToOutlet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      outletId, 
      outletRole 
    }: { 
      userId: string; 
      outletId: string | null; 
      outletRole?: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          assigned_outlet_id: outletId,
          outlet_role: outletRole || "cashier",
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
    },
  });
}

// Create inventory transfer mutation
export function useCreateInventoryTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (transfer: {
      from_outlet_id: string;
      to_outlet_id: string;
      product_id: string;
      variant_id?: string | null;
      quantity: number;
      notes?: string;
    }) => {
      // Get user's name from profiles
      let createdByName = "Unknown";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        createdByName = profile?.full_name || "Unknown";
      }

      const { data, error } = await supabase
        .from("inventory_transfers")
        .insert({
          ...transfer,
          created_by: user?.id,
          created_by_name: createdByName,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
    },
  });
}

// Complete inventory transfer mutation (calls RPC)
export function useCompleteInventoryTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transferId: string) => {
      const { data, error } = await supabase.rpc("complete_inventory_transfer", {
        p_transfer_id: transferId,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string } | null;
      if (result && !result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["outlet-inventory"] });
    },
  });
}

// Get user's assigned outlet
export function useUserOutlet() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["user-outlet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          assigned_outlet_id,
          outlet_role,
          assigned_outlet:outlets(*)
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return {
        outletId: data?.assigned_outlet_id,
        outletRole: data?.outlet_role,
        outlet: data?.assigned_outlet as Outlet | null,
      };
    },
    enabled: !!user,
  });
}
