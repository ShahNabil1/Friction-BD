import { useRef, useEffect, useState } from "react";
import { Printer, X, Check } from "lucide-react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { POSCartItem, POSCustomer } from "@/hooks/usePOSCart";
import { usePOSSettings } from "@/hooks/usePOSSettings";
import { supabase } from "@/integrations/supabase/client";
import frictionLogo from "@/assets/friction-logo-color.jpg";

const POINTS_VALUE = 0.75;

interface POSInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  items: POSCartItem[];
  customer: POSCustomer | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
  paidAmount?: number | null;
  dueAmount?: number | null;
}

export function POSInvoiceModal({
  open,
  onClose,
  orderId,
  items,
  customer,
  subtotal,
  discount,
  total,
  paymentMethod,
  tenderedAmount,
  changeAmount,
  paidAmount,
  dueAmount,
}: POSInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const settings = usePOSSettings();

  // Loyalty points state - fetched when modal opens
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [orderPointsRedeemed, setOrderPointsRedeemed] = useState<number>(0);
  const [orderPointsMonetaryValue, setOrderPointsMonetaryValue] = useState<number>(0);
  const [paymentDetails, setPaymentDetails] = useState<any[] | null>(null);

  useEffect(() => {
    if (!open || !orderId) return;

    // Fetch order's loyalty data
    supabase
      .from("orders")
      .select("points_redeemed, points_monetary_value, customer_id, payment_details")
      .eq("id", orderId)
      .single()
      .then(({ data }) => {
        setOrderPointsRedeemed(data?.points_redeemed ?? 0);
        setOrderPointsMonetaryValue(Number(data?.points_monetary_value ?? 0));
        setPaymentDetails(Array.isArray(data?.payment_details) ? data.payment_details : null);

        // Fetch customer's updated loyalty balance
        const custId = data?.customer_id || customer?.id;
        if (custId) {
          supabase
            .from("customers")
            .select("loyalty_points")
            .eq("id", custId)
            .single()
            .then(({ data: custData }) => {
              setLoyaltyBalance(custData?.loyalty_points ?? 0);
            });
        }
      });
  }, [open, orderId, customer?.id]);

  const isCreditSale = paymentMethod === "due" || (dueAmount != null && dueAmount > 0);
  const pointsEarned = isCreditSale ? 0 : Math.floor((total - orderPointsMonetaryValue) / 100);
  const hasCustomer = !!(customer?.id || customer?.name) && customer?.name !== "Walk-in Customer";
  const showLoyaltySection = hasCustomer && customer?.id;
  // Display the UPDATED total: if DB already reflects the increment, use it; otherwise add locally
  const effectiveLoyaltyTotal = isCreditSale ? loyaltyBalance : (loyaltyBalance >= pointsEarned ? loyaltyBalance : loyaltyBalance + pointsEarned);

  // VAT calculation (7.5% standard rate)
  const vatRate = 0.075;
  const vatAmount = Math.round(subtotal * vatRate);
  const totalWithVat = subtotal - discount + vatAmount;
  const roundOff = total - totalWithVat;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Use a separate window so only the receipt prints
    const printWindow = window.open(
      "",
      "_blank",
      "width=420,height=800"
    );
    if (!printWindow) return;

    // Thermal paper width in mm
    const widthMm = settings.paperWidth === "58mm" ? "58mm" : "80mm";

    // Chrome often ignores `auto` page height for printers and can push content onto later pages,
    // especially if we globally force `break-inside: avoid`. Use a very tall custom page height.
    // Typical receipts are far shorter than this, so it prints as a single continuous roll.
    const pageHeightMm = settings.paperWidth === "58mm" ? "1200mm" : "1800mm";

    // IMPORTANT: The receipt markup uses Tailwind classes. If we don't copy the app styles into
    // the print window, the layout can shift and Chrome may paginate oddly.
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
          <title>Mushak 6.3 Invoice</title>
          ${inheritedStyles}
          <style>
            /* Thermal receipt: force printer width + ZERO margins for no paper waste */
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
              /* full width, tiny safe padding so text doesn't touch edge */
              padding: 0mm 2mm !important;
            }

            h1 { font-size: 16px !important; }
            h2 { font-size: 14px !important; }
            .grand-total { font-size: 16px !important; }

            .customer-info {
              white-space: normal !important;
              overflow: visible !important;
              word-wrap: break-word !important;
              max-width: 100% !important;
            }

            /* Force borders to black */
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

            /* Compact logo for thermal receipt */
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
      // Give styles/images a moment to settle before printing (prevents pagination jumps)
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } finally {
          printWindow.close();
        }
      }, 400);
    };

    // Prefer onload, but keep a fallback in case it doesn't fire consistently
    printWindow.onload = triggerPrint;
    setTimeout(triggerPrint, 1200);
  };

  const formatPrice = (amount: number) => {
    return amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "cash": return "Cash";
      case "card": return "Card";
      case "mobile_banking": return "bKash/Nagad";
      case "due": return "Credit Sale";
      default: return method;
    }
  };

  // isCreditSale already defined above for loyalty logic
  const invoiceNo = orderId.slice(0, 8).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            Order Complete
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
                src={settings.logoUrl || frictionLogo}
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

          {/* Invoice Details */}
          <div className="mb-3">
            <h2 className="text-sm font-bold mb-2">Invoice</h2>
            
            <div className="grid grid-cols-2 gap-x-4 text-[9px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice No:</span>
                <span className="font-medium">{invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{formatDateTime()}</span>
              </div>
            </div>

            <div className="text-[9px] mt-1 flex items-start justify-between gap-3">
              <span className="text-gray-600 shrink-0">Customer:</span>
              <span className="customer-info font-medium text-right">
                {customer?.name || "Walk-in Customer"}
              </span>
            </div>

            {customer?.phone && (
              <div className="text-[9px] mt-1">
                <span className="text-gray-600">Mobile:</span>
                <span className="ml-2">{customer.phone}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-t border-solid border-black my-2" />

          {/* Product Table */}
          <table className="w-full text-[9px] mb-2" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="border-b border-black">
                <th className="py-1 text-center w-[8%] text-[8px] font-semibold">#</th>
                <th className="py-1 text-left w-[40%] text-[8px] font-semibold">Product</th>
                <th className="py-1 text-center w-[12%] text-[8px] font-semibold">Qty</th>
                <th className="py-1 text-right w-[20%] text-[8px] font-semibold">Unit Price</th>
                <th className="py-1 text-right w-[20%] text-[8px] font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const variantInfo = [item.selectedSize, item.selectedColor].filter(Boolean).join(" / ");
                return (
                  <tr key={index} className="border-b border-dotted border-gray-300">
                    <td className="py-2 text-center">{index + 1}</td>
                    <td className="py-2">
                      <div className="leading-tight">
                        <span className="block truncate">{item.product.title}</span>
                        {variantInfo && (
                          <span className="text-[7px] text-gray-500">{variantInfo}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      {item.quantity.toFixed(2)} Pc
                    </td>
                    <td className="py-2 text-right">{formatPrice(item.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Section */}
          <hr className="border-t border-dashed border-black my-2" />

          <div className="space-y-1 text-[9px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>(-) {formatPrice(discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Tax (VAT 7.5%):</span>
              <span>(+) {formatPrice(vatAmount)}</span>
            </div>

            {roundOff !== 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Round Off:</span>
                <span>{roundOff >= 0 ? "+" : ""}{formatPrice(roundOff)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="grand-total flex justify-between items-center py-2 my-2 border-t-2 border-b-2 border-black text-sm font-bold">
            <span>Total:</span>
            <span>৳ {formatPrice(total)}</span>
          </div>

          {/* Payment Info */}
          <div className="space-y-1 text-[9px]">
            {isCreditSale ? (
              <>
                <div className="flex justify-between">
                  <span>Total Bill:</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid Now:</span>
                  <span>{formatPrice(paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600">
                  <span>Due Balance:</span>
                  <span>{formatPrice(dueAmount || 0)}</span>
                </div>
              </>
            ) : paymentDetails && paymentDetails.length > 1 ? (
              <>
                {paymentDetails.map((tender: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{tender.label || tender.method}:</span>
                    <span>{formatPrice(tender.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t border-dotted border-gray-400 pt-1 mt-1">
                  <span>Total Paid:</span>
                  <span>{formatPrice(paymentDetails.reduce((s: number, t: any) => s + t.amount, 0))}</span>
                </div>
                {changeAmount != null && changeAmount > 0 && (
                  <div className="flex justify-between font-semibold text-amber-600">
                    <span>Change:</span>
                    <span>{formatPrice(changeAmount)}</span>
                  </div>
                )}
              </>
            ) : paymentMethod === "cash" && tenderedAmount != null && tenderedAmount > 0 ? (
              <>
                <div className="flex justify-between">
                  <span>{getPaymentLabel(paymentMethod)}:</span>
                  <span>{formatPrice(tenderedAmount)}</span>
                </div>
                {changeAmount != null && changeAmount > 0 && (
                  <div className="flex justify-between font-semibold text-amber-600">
                    <span>Change:</span>
                    <span>{formatPrice(changeAmount)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between">
                <span>{getPaymentLabel(paymentMethod)}:</span>
                <span>{formatPrice(total)}</span>
              </div>
            )}
          </div>

          {/* Redemption Details (if points were redeemed) */}
          {orderPointsRedeemed > 0 && (
            <>
              <hr className="border-t border-dashed border-black my-2" />
              <div className="space-y-1 text-[9px]">
                <p className="text-[8px] font-semibold uppercase text-gray-600 mb-1">Points Redemption</p>
                <div className="flex justify-between">
                  <span>Points Redeemed:</span>
                  <span className="font-bold">(-) {orderPointsRedeemed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Redemption Value:</span>
                  <span className="font-bold">(-) ৳ {formatPrice(orderPointsMonetaryValue)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Remaining Balance:</span>
                  <span>{loyaltyBalance.toLocaleString()} pts</span>
                </div>
              </div>
            </>
          )}

          {/* Loyalty Points Summary */}
          {showLoyaltySection && (
            <>
              <hr className="border-t border-dashed border-black my-2" />
              <div className="space-y-1 text-[9px]">
                <div className="flex justify-between">
                  <span>Points Earned:</span>
                  <span className="font-bold">
                    {isCreditSale ? "0 (Credit Sale)" : `(+) ${pointsEarned}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total Points:</span>
                  <span>{effectiveLoyaltyTotal.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}

          {/* Barcode */}
          <div className="flex justify-center my-4">
            <Barcode
              value={invoiceNo}
              format="CODE128"
              width={1.2}
              height={40}
              fontSize={10}
              displayValue
              renderer="svg"
            />
          </div>

          {/* Terms & Conditions */}
          <div className="text-[12px] leading-relaxed space-y-2">
            {settings.termsAndConditions.map((term) => (
              <p key={term.id}>{term.text}</p>
            ))}
          </div>

          {/* Developer Credit */}
          <div className="text-center mt-4 text-[9px] font-mono text-gray-500">
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
