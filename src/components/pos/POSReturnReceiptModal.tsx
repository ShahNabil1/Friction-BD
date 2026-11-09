import { useRef } from "react";
import { Printer, X, RotateCcw } from "lucide-react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePOSSettings } from "@/hooks/usePOSSettings";
import frictionLogo from "@/assets/friction-logo-color.jpg";

interface ReturnedItem {
  title: string;
  price: number;
  qty: number;
  reason?: string;
  variation?: {
    size?: string;
    color?: string;
  };
}

interface ExchangeItem {
  title: string;
  price: number;
  qty: number;
  size?: string;
  color?: string;
}

interface POSReturnReceiptModalProps {
  open: boolean;
  onClose: () => void;
  returnReceiptNumber: string;
  originalOrderNumber: string;
  returnedItems: ReturnedItem[];
  exchangeItems?: ExchangeItem[];
  returnType: "refund" | "exchange";
  refundAmount: number;
  exchangeAmount?: number;
  balanceDue?: number;
  customerName?: string;
  customerPhone?: string;
  processedBy?: string;
  // Loyalty clawback data
  pointsClawedBack?: number;
  refundDeduction?: number;
  pointsAdded?: number;
}

export function POSReturnReceiptModal({
  open,
  onClose,
  returnReceiptNumber,
  originalOrderNumber,
  returnedItems,
  exchangeItems = [],
  returnType,
  refundAmount,
  exchangeAmount = 0,
  balanceDue = 0,
  customerName,
  customerPhone,
  processedBy,
  pointsClawedBack = 0,
  refundDeduction = 0,
  pointsAdded = 0,
}: POSReturnReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const settings = usePOSSettings();

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=420,height=800");
    if (!printWindow) return;

    const widthMm = settings.paperWidth === "58mm" ? "58mm" : "80mm";
    const pageHeightMm = settings.paperWidth === "58mm" ? "1200mm" : "1800mm";

    const inheritedStyles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href="${window.location.origin}/" />
          <title>Credit Note ${returnReceiptNumber}</title>
          ${inheritedStyles}
          <style>
            @page {
              size: ${widthMm} ${pageHeightMm};
              margin: 0 !important;
              padding: 0 !important;
            }

            *, *::before, *::after {
              color: #000000 !important;
              font-weight: 700 !important;
              font-size: 12px !important;
              opacity: 1 !important;
              text-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${widthMm} !important;
              max-width: ${widthMm} !important;
              height: auto !important;
              min-height: 0 !important;
              background: #fff !important;
              color: #000000 !important;
            }

            body {
              font-family: 'Arial', 'Helvetica Neue', sans-serif;
              line-height: 1.35;
              overflow: visible !important;
              padding: 0mm 2mm !important;
            }

            h1 { font-size: 16px !important; }
            h2 { font-size: 14px !important; }
            .grand-total { font-size: 16px !important; }

            hr, table, tr, td, th {
              border-color: #000000 !important;
            }

            thead th {
              padding-top: 8px !important;
              padding-bottom: 8px !important;
            }

            tbody td {
              padding-top: 10px !important;
              padding-bottom: 10px !important;
            }

            .receipt-logo {
              max-width: ${settings.paperWidth === "58mm" ? "35mm" : "45mm"} !important;
              height: auto !important;
              margin: 0 auto 2mm auto !important;
              display: block !important;
            }

            table { width: 100%; border-collapse: collapse; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { break-inside: avoid; page-break-inside: avoid; }
            img, svg { max-width: 100% !important; height: auto !important; }

            .receipt {
              width: 100% !important;
              max-width: 100% !important;
              display: block;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            @media print {
              @page {
                size: ${widthMm} ${pageHeightMm};
                margin: 0 !important;
                padding: 0 !important;
              }

              html, body {
                width: ${widthMm} !important;
                max-width: ${widthMm} !important;
                height: auto !important;
                overflow: visible !important;
                margin: 0 !important;
              }

              body {
                padding: 1mm 2mm !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${printContent.outerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const triggerPrint = () => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } finally {
          printWindow.close();
        }
      }, 400);
    };

    printWindow.onload = triggerPrint;
    setTimeout(triggerPrint, 1200);
  };

  const formatPrice = (amount: number) => {
    return amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDateTime = () => {
    const now = new Date();
    return now.toLocaleString("en-GB", { 
      day: "2-digit", 
      month: "short", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const returnItemsTotal = returnedItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const exchangeItemsTotal = exchangeItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const returnId = `RET-${returnReceiptNumber.slice(0, 5).toUpperCase()}`;
  const logoSrc = settings.logoUrl || frictionLogo;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <RotateCcw className="h-5 w-5" />
            {returnType === "exchange" ? "Exchange Complete" : "Return Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* Printable Receipt - Mushak 6.3 Format */}
        <div
          ref={printRef}
          className="rounded-lg border bg-white p-4 text-[12px] font-bold font-sans"
          style={{ fontFamily: "'Arial', 'Helvetica Neue', sans-serif" }}
        >
          {/* Mushak Label */}
          {settings.showMushakLabel && (
            <div className="relative">
              <span className="absolute top-0 right-0 text-[8px] font-bold text-gray-600">
                {settings.mushakLabel}
              </span>
            </div>
          )}

          {/* Header Section */}
          <div className="text-center pt-1">
            {settings.showLogo && (
              <img
                src={logoSrc}
                alt="Logo"
                className="receipt-logo h-10 mx-auto mb-1"
              />
            )}
            
            {/* Government Text */}
            {settings.govtHeader1 && (
              <p className="text-[9px] text-gray-600" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                {settings.govtHeader1}
              </p>
            )}
            {settings.govtHeader2 && (
              <p className="text-[9px] text-gray-600 mb-2" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                {settings.govtHeader2}
              </p>
            )}

            {/* Company Name */}
            <h1 className="text-xs font-bold uppercase tracking-wide mb-1">
              {settings.companyName}
            </h1>

            {/* Company Info */}
            {settings.registeredAddress && (
              <p className="text-[8px] text-gray-600 leading-tight">
                {settings.registeredAddress}
              </p>
            )}

            {/* VAT Number */}
            {settings.vatRegNo && (
              <p className="text-[9px] font-semibold mt-1">
                Central VAT Reg. No.: {settings.vatRegNo}
              </p>
            )}

            {/* Contact */}
            {(settings.contactMobile || settings.contactWebsite) && (
              <p className="text-[8px] text-gray-600 mt-1">
                {settings.contactMobile && `Mobile: ${settings.contactMobile}`}
                {settings.contactMobile && settings.contactWebsite && ", "}
                {settings.contactWebsite}
              </p>
            )}
          </div>

          {/* Divider */}
          <hr className="border-t border-dashed border-black my-3" />

          {/* Credit Note Title */}
          <div className="text-center mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              {returnType === "exchange" ? "Exchange Note" : "Credit Note / Return"}
            </h2>
          </div>

          {/* Return Details */}
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-x-4 text-[9px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Return ID:</span>
                <span className="font-medium">{returnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{formatDateTime()}</span>
              </div>
            </div>
            
            <div className="text-[9px] mt-1 flex justify-between">
              <span className="text-gray-600">Original Invoice:</span>
              <span className="font-medium">{originalOrderNumber}</span>
            </div>

            <div className="text-[9px] mt-1 flex items-start justify-between gap-3">
              <span className="text-gray-600 shrink-0">Customer:</span>
              <span className="font-medium text-right">
                {customerName || "Walk-in Customer"}
              </span>
            </div>

            {customerPhone && (
              <div className="text-[9px] mt-1">
                <span className="text-gray-600">Mobile:</span>
                <span className="ml-2">{customerPhone}</span>
              </div>
            )}

            {processedBy && (
              <div className="text-[9px] mt-1">
                <span className="text-gray-600">Processed By:</span>
                <span className="ml-2">{processedBy}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-t border-solid border-black my-2" />

          {/* Returned Items Table */}
          <div className="mb-2">
            <p className="text-[8px] font-semibold uppercase text-gray-600 mb-1">Items Returned</p>
            <table className="w-full text-[9px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1 text-left w-[35%] text-[8px] font-semibold">Item</th>
                  <th className="py-1 text-center w-[10%] text-[8px] font-semibold">Qty</th>
                  <th className="py-1 text-right w-[18%] text-[8px] font-semibold">Price</th>
                  <th className="py-1 text-left w-[22%] text-[8px] font-semibold">Reason</th>
                  <th className="py-1 text-right w-[15%] text-[8px] font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {returnedItems.map((item, index) => {
                  const variantInfo = [item.variation?.size, item.variation?.color].filter(Boolean).join(" / ");
                  return (
                    <tr key={index} className="border-b border-dotted border-gray-300">
                      <td className="py-2">
                        <div className="leading-tight">
                          <span className="block truncate text-[8px]">{item.title}</span>
                          {variantInfo && (
                            <span className="text-[7px] text-gray-500">{variantInfo}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-center text-[8px]">{item.qty}</td>
                      <td className="py-2 text-right text-[8px]">{formatPrice(item.price)}</td>
                      <td className="py-2 text-left text-[7px] text-gray-600">{item.reason || "-"}</td>
                      <td className="py-2 text-right font-semibold text-[8px]">
                        {formatPrice(item.price * item.qty)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Exchange Items Table (if applicable) */}
          {returnType === "exchange" && exchangeItems.length > 0 && (
            <>
              <hr className="border-t border-dashed border-black my-2" />
              <div className="mb-2">
                <p className="text-[8px] font-semibold uppercase text-gray-600 mb-1">Exchange Items</p>
                <table className="w-full text-[9px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-1 text-left w-[50%] text-[8px] font-semibold">Item</th>
                      <th className="py-1 text-center w-[15%] text-[8px] font-semibold">Qty</th>
                      <th className="py-1 text-right w-[15%] text-[8px] font-semibold">Price</th>
                      <th className="py-1 text-right w-[20%] text-[8px] font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchangeItems.map((item, index) => {
                      const variantInfo = [item.size, item.color].filter(Boolean).join(" / ");
                      return (
                        <tr key={index} className="border-b border-dotted border-gray-300">
                          <td className="py-2">
                            <div className="leading-tight">
                              <span className="block truncate text-[8px]">{item.title}</span>
                              {variantInfo && (
                                <span className="text-[7px] text-gray-500">{variantInfo}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 text-center text-[8px]">{item.qty}</td>
                          <td className="py-2 text-right text-[8px]">{formatPrice(item.price)}</td>
                          <td className="py-2 text-right font-semibold text-[8px]">
                            {formatPrice(item.price * item.qty)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Divider */}
          <hr className="border-t border-dashed border-black my-2" />

          {/* Totals Section */}
          <div className="space-y-1 text-[9px]">
            <div className="flex justify-between">
              <span>Returned Items Total:</span>
              <span>{formatPrice(returnItemsTotal)}</span>
            </div>

            {returnType === "exchange" && exchangeItems.length > 0 && (
              <div className="flex justify-between">
                <span>Exchange Items Total:</span>
                <span>{formatPrice(exchangeItemsTotal)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          {returnType === "refund" ? (
            <div className="grand-total flex justify-between items-center py-2 my-2 border-t-2 border-b-2 border-black text-sm font-bold">
              <span>TOTAL REFUNDED:</span>
              <span>৳ {formatPrice(refundAmount)}</span>
            </div>
          ) : (
            <div className={`grand-total flex justify-between items-center py-2 my-2 border-t-2 border-b-2 border-black text-sm font-bold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
              <span>{balanceDue > 0 ? "CUSTOMER PAYS:" : "CREDIT TO CUSTOMER:"}</span>
              <span>৳ {formatPrice(Math.abs(balanceDue))}</span>
            </div>
          )}

          {/* Payment Method */}
          <div className="text-[9px] mb-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Refund Method:</span>
              <span>{returnType === "exchange" ? "Adjustment" : "Cash"}</span>
            </div>
          </div>

          {/* Loyalty Points Adjustment */}
          {(pointsClawedBack > 0 || pointsAdded > 0 || refundDeduction > 0) && (
            <>
              <hr className="border-t border-dashed border-black my-2" />
              <div className="space-y-1 text-[9px]">
                <p className="text-[8px] font-semibold uppercase text-gray-600 mb-1">Loyalty Points Adjustment</p>
                {pointsClawedBack > 0 && (
                  <div className="flex justify-between">
                    <span>Points Clawed Back:</span>
                    <span className="font-bold">(-) {pointsClawedBack}</span>
                  </div>
                )}
                {refundDeduction > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Points Shortfall Deduction:</span>
                    <span className="font-bold">(-) ৳ {formatPrice(refundDeduction)}</span>
                  </div>
                )}
                {pointsAdded > 0 && (
                  <div className="flex justify-between">
                    <span>Points Added (Exchange):</span>
                    <span className="font-bold">(+) {pointsAdded}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Barcode */}
          <div className="flex justify-center my-3">
            <Barcode
              value={returnReceiptNumber.slice(0, 8).toUpperCase()}
              format="CODE128"
              width={1.2}
              height={40}
              fontSize={10}
              displayValue
              renderer="svg"
            />
          </div>

          {/* Terms & Conditions */}
          <div className="text-[7px] leading-relaxed space-y-1 text-gray-600">
            <p>** Returns/exchanges must be processed within 3 days with original receipt.</p>
            <p>** Sale or discounted items are final and cannot be returned.</p>
            <p>** Refunds are processed as per company policy.</p>
            {settings.termsAndConditions.slice(0, 2).map((term) => (
              <p key={term.id}>{term.text}</p>
            ))}
          </div>

          {/* Developer Credit */}
          <div className="text-center mt-3 text-[9px] font-mono text-gray-500">
            Developed By www.shahnabil.com
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
