import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Copy, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface DeliveryStatus {
  consignment_id?: string;
  tracking_code?: string;
  invoice?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  cod_amount?: number;
  delivery_status?: string;
  status?: string;
  note?: string;
  updated_at?: string;
}

interface CourierStatusLookupProps {
  getAccessToken: () => Promise<string>;
}

export const CourierStatusLookup = ({ getAccessToken }: CourierStatusLookupProps) => {
  const [searchType, setSearchType] = useState<"tracking" | "invoice" | "cid">("tracking");
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeliveryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({ title: "Error", description: "Please enter a search value", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const accessToken = await getAccessToken();
      
      const typeMap = {
        tracking: "status_by_tracking",
        invoice: "status_by_invoice",
        cid: "status_by_cid",
      };

      const bodyMap = {
        tracking: { tracking_code: searchValue.trim() },
        invoice: { invoice: searchValue.trim() },
        cid: { consignment_id: searchValue.trim() },
      };

      const { data, error: fnError } = await supabase.functions.invoke("steadfast-api", {
        body: { type: typeMap[searchType], ...bodyMap[searchType] },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        // Steadfast returns the delivery info in data.delivery_status or directly in data
        const deliveryData = data.data.delivery_status || data.data;
        setResult(deliveryData);
      } else {
        throw new Error(data?.error || data?.data?.message || "Status not found");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch status";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const getStatusBadgeVariant = (status?: string) => {
    if (!status) return "secondary";
    const s = status.toLowerCase();
    if (s.includes("delivered")) return "default";
    if (s.includes("pending") || s.includes("in_review")) return "secondary";
    if (s.includes("cancelled") || s.includes("return")) return "destructive";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-500/10 p-2">
            <Search className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Delivery Status Lookup</CardTitle>
            <CardDescription>Search by tracking code, invoice, or consignment ID</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={searchType} onValueChange={(v) => setSearchType(v as typeof searchType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tracking">Tracking Code</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="cid">Consignment ID</TabsTrigger>
          </TabsList>
          <TabsContent value="tracking" className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter tracking code..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="invoice" className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter invoice number..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="cid" className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter consignment ID..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={getStatusBadgeVariant(result.delivery_status || result.status)}>
                {result.delivery_status || result.status || "Unknown"}
              </Badge>
            </div>

            {result.consignment_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Consignment ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{result.consignment_id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(result.consignment_id!, "Consignment ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {result.tracking_code && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tracking Code</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{result.tracking_code}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(result.tracking_code!, "Tracking Code")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {result.invoice && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoice</span>
                <code className="text-sm font-mono">{result.invoice}</code>
              </div>
            )}

            {result.recipient_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recipient</span>
                <span className="text-sm">{result.recipient_name}</span>
              </div>
            )}

            {result.cod_amount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">COD Amount</span>
                <span className="text-sm font-semibold">৳{result.cod_amount}</span>
              </div>
            )}

            {result.note && (
              <div className="border-t pt-3">
                <span className="text-sm text-muted-foreground">Note:</span>
                <p className="mt-1 text-sm">{result.note}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
