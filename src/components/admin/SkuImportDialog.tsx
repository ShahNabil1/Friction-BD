import { useState, useRef } from "react";
import { Upload, FileText, Check, X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface SkuImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  identifier: string;
  sku: string;
  status: "pending" | "success" | "error";
  message?: string;
  productId?: string;
  productTitle?: string;
}

export function SkuImportDialog({ open, onOpenChange }: SkuImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload");

  const resetDialog = () => {
    setParsedRows([]);
    setStep("upload");
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const downloadTemplate = () => {
    const csvContent = "identifier,sku\nproduct-slug-here,SKU-001\nother-product-slug,SKU-002";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sku-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): { identifier: string; sku: string }[] => {
    const lines = text.trim().split("\n");
    const rows: { identifier: string; sku: string }[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle quoted values
      const match = line.match(/^"?([^",]*)"?,\s*"?([^",]*)"?$/);
      if (match) {
        const [, identifier, sku] = match;
        if (identifier && sku) {
          rows.push({ 
            identifier: identifier.trim(), 
            sku: sku.trim().toUpperCase() 
          });
        }
      } else {
        // Simple split for non-quoted values
        const parts = line.split(",");
        if (parts.length >= 2) {
          rows.push({ 
            identifier: parts[0].trim(), 
            sku: parts[1].trim().toUpperCase() 
          });
        }
      }
    }
    
    return rows;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const text = await file.text();
      const csvRows = parseCSV(text);

      if (csvRows.length === 0) {
        toast({
          title: "Empty file",
          description: "No valid rows found in the CSV file",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Fetch all products to match identifiers
      const { data: products, error } = await supabase
        .from("products")
        .select("id, title, slug, sku")
        .order("title");

      if (error) throw error;

      // Match rows to products
      const matched: ParsedRow[] = csvRows.map((row) => {
        const product = products?.find(
          (p) =>
            p.slug === row.identifier ||
            p.id === row.identifier ||
            p.title.toLowerCase() === row.identifier.toLowerCase()
        );

        if (product) {
          return {
            identifier: row.identifier,
            sku: row.sku,
            status: "pending" as const,
            productId: product.id,
            productTitle: product.title,
            message: product.sku ? `Will replace existing SKU: ${product.sku}` : undefined,
          };
        } else {
          return {
            identifier: row.identifier,
            sku: row.sku,
            status: "error" as const,
            message: "Product not found",
          };
        }
      });

      setParsedRows(matched);
      setStep("preview");
    } catch (err: any) {
      toast({
        title: "Error parsing file",
        description: err.message || "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.status === "pending" && r.productId);
    
    if (validRows.length === 0) {
      toast({
        title: "No valid rows",
        description: "No products to update",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const updatedRows = [...parsedRows];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      if (row.status !== "pending" || !row.productId) continue;

      try {
        const { error } = await supabase
          .from("products")
          .update({ sku: row.sku })
          .eq("id", row.productId);

        if (error) throw error;

        updatedRows[i] = { ...row, status: "success", message: "Updated successfully" };
        successCount++;
      } catch (err: any) {
        updatedRows[i] = { ...row, status: "error", message: err.message || "Update failed" };
        errorCount++;
      }
    }

    setParsedRows(updatedRows);
    setStep("complete");
    setIsProcessing(false);

    // Invalidate products query to refresh the list
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });

    toast({
      title: "Import Complete",
      description: `${successCount} products updated${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
    });
  };

  const pendingCount = parsedRows.filter((r) => r.status === "pending").length;
  const successCount = parsedRows.filter((r) => r.status === "success").length;
  const errorCount = parsedRows.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import SKUs
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to assign SKU codes to multiple products at once.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                CSV file with columns: <code className="bg-muted px-1 py-0.5 rounded">identifier</code> (slug, ID, or title) and <code className="bg-muted px-1 py-0.5 rounded">sku</code>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="sku-csv-upload"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Select CSV File
                </Button>
              </div>
            </div>
          </div>
        )}

        {(step === "preview" || step === "complete") && (
          <>
            <div className="flex gap-2 mb-2">
              {pendingCount > 0 && (
                <Badge variant="secondary">{pendingCount} pending</Badge>
              )}
              {successCount > 0 && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  {successCount} success
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} errors</Badge>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[400px] border rounded-lg">
              <div className="p-2 space-y-1">
                {parsedRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      row.status === "success"
                        ? "bg-green-50"
                        : row.status === "error"
                        ? "bg-red-50"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {row.status === "success" && (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        {row.status === "error" && (
                          <X className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          {row.productTitle || row.identifier}
                        </span>
                      </div>
                      {row.message && (
                        <p className="text-xs text-muted-foreground ml-6 truncate">
                          {row.message}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 ml-2">
                      {row.sku}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="mt-4">
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isProcessing || pendingCount === 0}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Import {pendingCount} SKUs
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
