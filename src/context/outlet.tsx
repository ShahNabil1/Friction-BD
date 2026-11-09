import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserOutlet, useOutlets, Outlet } from "@/hooks/useOutlets";

interface OutletContextType {
  currentOutlet: Outlet | null;
  setCurrentOutlet: (outlet: Outlet | null) => void;
  availableOutlets: Outlet[];
  isLoading: boolean;
  needsOutletSelection: boolean;
  userOutletRole: string | null;
  canSwitchOutlet: boolean; // Whether user can change outlets
  isLocked: boolean; // Whether user is locked to their assigned outlet
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isSuperAdmin, role, isLoading: roleLoading } = useUserRole();
  const { data: userOutlet, isLoading: userOutletLoading } = useUserOutlet();
  const { data: allOutlets = [], isLoading: outletsLoading } = useOutlets();
  
  const [currentOutlet, setCurrentOutletState] = useState<Outlet | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Determine if user can switch outlets (only super_admin and admin)
  const canSwitchOutlet = isSuperAdmin || role === "admin";
  
  // Determine if user is locked to their assigned outlet
  const isLocked = !canSwitchOutlet && !!userOutlet?.outlet;

  // Determine available outlets based on role
  const availableOutlets = canSwitchOutlet
    ? allOutlets 
    : userOutlet?.outlet 
      ? [userOutlet.outlet] 
      : [];

  // Custom setter that enforces branch isolation
  const setCurrentOutlet = (outlet: Outlet | null) => {
    // If user is locked, ignore attempts to change outlet
    if (isLocked && outlet?.id !== userOutlet?.outlet?.id) {
      console.warn("User is locked to their assigned outlet");
      return;
    }
    setCurrentOutletState(outlet);
  };

  // Initialize outlet on load
  useEffect(() => {
    if (hasInitialized) return;
    if (roleLoading || userOutletLoading || outletsLoading) return;
    if (!user) return;

    // Non-admin staff with assigned outlet - force lock to their outlet
    if (isLocked && userOutlet?.outlet) {
      setCurrentOutletState(userOutlet.outlet);
      setHasInitialized(true);
      return;
    }

    // Super admin or admin with multiple outlets - can select
    if (canSwitchOutlet && allOutlets.length > 1) {
      // Check localStorage for previously selected outlet
      const savedOutletId = localStorage.getItem("pos_current_outlet");
      if (savedOutletId) {
        const savedOutlet = allOutlets.find(o => o.id === savedOutletId);
        if (savedOutlet) {
          setCurrentOutletState(savedOutlet);
        }
      } else {
        // Default to main branch for super admin
        const mainBranch = allOutlets.find(o => o.is_main_branch);
        if (mainBranch) {
          setCurrentOutletState(mainBranch);
        }
      }
    } else if (userOutlet?.outlet) {
      // Regular staff - auto-select their assigned outlet
      setCurrentOutletState(userOutlet.outlet);
    } else if (allOutlets.length === 1) {
      // Only one outlet exists - auto-select it
      setCurrentOutletState(allOutlets[0]);
    }

    setHasInitialized(true);
  }, [user, isSuperAdmin, role, userOutlet, allOutlets, roleLoading, userOutletLoading, outletsLoading, hasInitialized, canSwitchOutlet, isLocked]);

  // Persist outlet selection (only for users who can switch)
  useEffect(() => {
    if (currentOutlet && canSwitchOutlet) {
      localStorage.setItem("pos_current_outlet", currentOutlet.id);
    }
  }, [currentOutlet, canSwitchOutlet]);

  const isLoading = roleLoading || userOutletLoading || outletsLoading;

  // Determine if outlet selection is needed (only for admins)
  const needsOutletSelection = !isLoading && 
    !currentOutlet && 
    canSwitchOutlet &&
    allOutlets.length > 1;

  return (
    <OutletContext.Provider
      value={{
        currentOutlet,
        setCurrentOutlet,
        availableOutlets,
        isLoading,
        needsOutletSelection,
        userOutletRole: userOutlet?.outletRole || null,
        canSwitchOutlet,
        isLocked,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutletContext() {
  const context = useContext(OutletContext);
  if (context === undefined) {
    throw new Error("useOutletContext must be used within an OutletProvider");
  }
  return context;
}
