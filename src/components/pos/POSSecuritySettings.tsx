import { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface POSSecuritySettingsProps {
  outletId?: string;
}

export function POSSecuritySettings({ outletId }: POSSecuritySettingsProps) {
  const { isSuperAdmin, role } = useUserRole();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [hasExistingPin, setHasExistingPin] = useState(false);

  const canEdit = isSuperAdmin || role === "admin";

  useEffect(() => {
    if (outletId) {
      fetchExistingPin();
    }
  }, [outletId]);

  const fetchExistingPin = async () => {
    if (!outletId) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase.rpc("outlet_has_master_pin", {
        p_outlet_id: outletId,
      });
      if (error) throw error;
      setHasExistingPin(!!data);
    } catch (error) {
      console.error("Error fetching PIN:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSavePin = async () => {
    if (!outletId) {
      toast.error("Please select an outlet first");
      return;
    }
    if (pin.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must contain only numbers");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("set_outlet_master_pin", {
        p_outlet_id: outletId,
        p_pin: pin,
      });
      if (error) throw error;

      toast.success("Supervisor PIN updated successfully");
      setPin("");
      setConfirmPin("");
      setHasExistingPin(true);
    } catch (error) {
      console.error("Error saving PIN:", error);
      toast.error("Failed to save PIN");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearPin = async () => {
    if (!outletId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("set_outlet_master_pin", {
        p_outlet_id: outletId,
        p_pin: "",
      });
      if (error) throw error;

      toast.success("Supervisor PIN removed");
      setHasExistingPin(false);
    } catch (error) {
      console.error("Error clearing PIN:", error);
      toast.error("Failed to clear PIN");
    } finally {
      setIsLoading(false);
    }
  };

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            POS Security
          </CardTitle>
          <CardDescription>
            You don't have permission to manage security settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isFetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          POS Security
        </CardTitle>
        <CardDescription>
          Set a 4-digit supervisor PIN for authorizing returns and sensitive operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasExistingPin && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 dark:text-emerald-400">
              A supervisor PIN is currently set for this outlet
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">
              {hasExistingPin ? "New Supervisor PIN" : "Supervisor PIN"}
            </Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPin(value);
                }}
                placeholder="Enter 4-digit PIN"
                className="pr-10 font-mono tracking-widest"
                maxLength={4}
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be exactly 4 digits (0-9)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm PIN</Label>
            <div className="relative">
              <Input
                id="confirmPin"
                type={showConfirmPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setConfirmPin(value);
                }}
                placeholder="Re-enter PIN"
                className="pr-10 font-mono tracking-widest"
                maxLength={4}
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
              >
                {showConfirmPin ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSavePin}
            disabled={isLoading || pin.length !== 4 || confirmPin.length !== 4}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {hasExistingPin ? "Update PIN" : "Set PIN"}
          </Button>

          {hasExistingPin && (
            <Button
              variant="outline"
              onClick={handleClearPin}
              disabled={isLoading}
            >
              Remove PIN
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
