import { useCallback } from "react";
import { usePOSSettings } from "@/hooks/usePOSSettings";
import frictionLogo from "@/assets/friction-logo-color.jpg";

interface ReceiptItem {
  product_name: string | null;
  qty: number;
  price: number;
  selected_variation?: { size?: string; color?: string } | null;
}

interface ReceiptData {
  orderId: string;
  items: ReceiptItem[];
  customer: { name: string | null; phone: string | null } | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
  paidAmount?: number | null;
  dueAmount?: number | null;
  createdAt?: string;
  // Loyalty points data (optional)
  pointsRedeemed?: number;
  pointsMonetaryValue?: number;
  customerLoyaltyPoints?: number;
  // Split payment tenders (optional)
  paymentDetails?: Array<{ method: string; label: string; amount: number }> | null;
}

export function usePrintReceipt() {
  const settings = usePOSSettings();

  const printReceipt = useCallback((data: ReceiptData) => {
    const {
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
      createdAt,
      pointsRedeemed = 0,
      pointsMonetaryValue = 0,
      customerLoyaltyPoints = 0,
      paymentDetails = null,
    } = data;

    const POINTS_VALUE = 0.75;
    const isCreditSale = paymentMethod === "due" || (dueAmount != null && dueAmount > 0);
    const pointsEarned = isCreditSale ? 0 : Math.floor((total - pointsMonetaryValue) / 100);
    const hasLoyaltyData = !!(customer?.name && customer.name !== "Walk-in Customer" && customerLoyaltyPoints >= 0 && (customerLoyaltyPoints > 0 || pointsEarned > 0 || isCreditSale));

    // VAT calculation (7.5% standard rate)
    const vatRate = 0.075;
    const vatAmount = Math.round(subtotal * vatRate);
    const totalWithVat = subtotal - discount + vatAmount;
    const roundOff = total - totalWithVat;

    const formatPrice = (amount: number) => {
      return amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDateTime = (dateStr?: string) => {
      const date = dateStr ? new Date(dateStr) : new Date();
      return date.toLocaleString("en-GB", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    };

    const getPaymentLabel = (method: string | null) => {
      switch (method) {
        case "cash": return "Cash";
        case "card": return "Card";
        case "mobile_banking": return "bKash/Nagad";
        case "due": return "Credit Sale";
        default: return method || "N/A";
      }
    };

    // isCreditSale already defined above for loyalty logic
    const invoiceNo = orderId.slice(0, 8).toUpperCase();

    // Thermal paper width in mm
    const widthMm = settings.paperWidth === "58mm" ? "58mm" : "80mm";
    const pageHeightMm = settings.paperWidth === "58mm" ? "1200mm" : "1800mm";

    // Build items HTML
    const itemsHtml = items.map((item, index) => {
      const variantInfo = [item.selected_variation?.size, item.selected_variation?.color].filter(Boolean).join(" / ");
      return `
        <tr style="border-bottom: 1px dotted #ccc;">
          <td style="padding: 6px 0; text-align: center; color: #000;">${index + 1}</td>
          <td style="padding: 6px 0; color: #000;">
            <div style="line-height: 1.3;">
              <span style="display: block;">${item.product_name || "Product"}</span>
              ${variantInfo ? `<span style="font-size: 7px; color: #000;">${variantInfo}</span>` : ""}
            </div>
          </td>
          <td style="padding: 6px 0; text-align: center; color: #000;">${item.qty.toFixed(2)} Pc</td>
          <td style="padding: 6px 0; text-align: right; color: #000;">${formatPrice(item.price)}</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #000;">${formatPrice(item.price * item.qty)}</td>
        </tr>
      `;
    }).join("");

    // Build payment section HTML
    let paymentHtml = "";
    if (isCreditSale) {
      paymentHtml = `
        <div style="display: flex; justify-content: space-between; color: #000;">
          <span>Total Bill:</span>
          <span>${formatPrice(total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #000;">
          <span>Paid Now:</span>
          <span>${formatPrice(paidAmount || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #000;">
          <span>Due Balance:</span>
          <span>${formatPrice(dueAmount || 0)}</span>
        </div>
      `;
    } else if (paymentDetails && paymentDetails.length > 1) {
      // Split payment breakdown
      paymentHtml = paymentDetails.map((t) => `
        <div style="display: flex; justify-content: space-between; color: #000;">
          <span>${t.label || t.method}:</span>
          <span>${formatPrice(t.amount)}</span>
        </div>
      `).join("");
      const totalPaid = paymentDetails.reduce((s, t) => s + t.amount, 0);
      paymentHtml += `
        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #000; border-top: 1px dotted #000; padding-top: 2px; margin-top: 2px;">
          <span>Total Paid:</span>
          <span>${formatPrice(totalPaid)}</span>
        </div>
      `;
      if (changeAmount != null && changeAmount > 0) {
        paymentHtml += `
          <div style="display: flex; justify-content: space-between; font-weight: 600; color: #000;">
            <span>Change:</span>
            <span>${formatPrice(changeAmount)}</span>
          </div>
        `;
      }
    } else if (paymentMethod === "cash" && tenderedAmount != null && tenderedAmount > 0) {
      paymentHtml = `
        <div style="display: flex; justify-content: space-between; color: #000;">
          <span>${getPaymentLabel(paymentMethod)}:</span>
          <span>${formatPrice(tenderedAmount)}</span>
        </div>
        ${changeAmount != null && changeAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: 600; color: #000;">
            <span>Change:</span>
            <span>${formatPrice(changeAmount)}</span>
          </div>
        ` : ""}
      `;
    } else {
      paymentHtml = `
        <div style="display: flex; justify-content: space-between; color: #000;">
          <span>${getPaymentLabel(paymentMethod)}:</span>
          <span>${formatPrice(total)}</span>
        </div>
      `;
    }

    // Build terms HTML from settings
    const termsHtml = settings.termsAndConditions
      .map((term) => `<p style="color: #000; margin: 2px 0;">${term.text}</p>`)
      .join("");


    // Logo source
    const logoSrc = settings.logoUrl || frictionLogo;

    // Open print window
    const printWindow = window.open("", "_blank", "width=420,height=800");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Receipt ${invoiceNo}</title>
          <style>
            @page {
              size: ${widthMm} ${pageHeightMm};
              margin: 0 !important;
              padding: 0 !important;
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
              overflow: visible !important;
              padding: 0mm 2mm !important;
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

            h1 { font-size: 16px !important; }
            h2 { font-size: 14px !important; }

            .grand-total {
              font-size: 16px !important;
              font-weight: 700 !important;
            }

            .customer-info {
              white-space: normal !important;
              overflow: visible !important;
              word-wrap: break-word !important;
              max-width: 100% !important;
              display: block !important;
              text-align: right !important;
            }

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

            table {
              width: 100%;
              border-collapse: collapse;
            }

            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { break-inside: avoid; page-break-inside: avoid; }

            .receipt-logo {
              max-width: ${settings.paperWidth === "58mm" ? "35mm" : "45mm"} !important;
              height: auto !important;
              margin: 0 auto 2mm auto !important;
              display: block !important;
              /* logo already color */
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
                padding: 0mm 2mm !important;
              }
            }
          </style>
        </head>
        <body>
          ${settings.showMushakLabel ? `
            <div style="position: relative;">
              <span style="position: absolute; top: 0; right: 0; font-size: 8px; font-weight: bold; color: #000;">
                ${settings.mushakLabel}
              </span>
            </div>
          ` : ""}

          <div style="text-align: center; padding-top: 2mm;">
            ${settings.showLogo ? `<img src="${logoSrc}" alt="Logo" class="receipt-logo" />` : ""}
            
            ${settings.govtHeader1 ? `
              <p style="font-size: 9px; color: #000; font-family: 'Times New Roman', Georgia, serif;">
                ${settings.govtHeader1}
              </p>
            ` : ""}
            ${settings.govtHeader2 ? `
              <p style="font-size: 9px; color: #000; font-family: 'Times New Roman', Georgia, serif; margin-bottom: 2mm;">
                ${settings.govtHeader2}
              </p>
            ` : ""}

            <h1 style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2mm 0; color: #000;">
              ${settings.companyName}
            </h1>

            ${settings.registeredAddress ? `
              <p style="font-size: 8px; color: #000; line-height: 1.4; margin: 0;">
                ${settings.registeredAddress}
              </p>
            ` : ""}

            ${settings.vatRegNo ? `
              <p style="font-size: 9px; font-weight: 600; margin-top: 2mm; color: #000;">
                Central VAT Reg. No.: ${settings.vatRegNo}
              </p>
            ` : ""}

            ${(settings.contactMobile || settings.contactWebsite) ? `
              <p style="font-size: 8px; color: #000; margin-top: 2mm;">
                ${settings.contactMobile ? `Mobile: ${settings.contactMobile}` : ""}${settings.contactMobile && settings.contactWebsite ? ", " : ""}${settings.contactWebsite || ""}
              </p>
            ` : ""}
          </div>

          <hr style="border-top: 1px dashed #000; margin: 3mm 0;" />

          <div style="margin-bottom: 3mm;">
            <h2 style="font-size: 12px; font-weight: bold; margin-bottom: 2mm; color: #000;">Invoice</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #000;">Invoice No:</span>
                <span style="font-weight: 500; color: #000;">${invoiceNo}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #000;">Date:</span>
                <span style="color: #000;">${formatDateTime(createdAt)}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin-top: 2mm;">
              <span style="color: #000;">Customer:</span>
              <span class="customer-info">${customer?.name || "Walk-in Customer"}</span>
            </div>

            ${customer?.phone ? `
              <div style="font-size: 9px; margin-top: 2mm;">
                <span style="color: #000;">Mobile:</span>
                <span style="margin-left: 4px; color: #000;">${customer.phone}</span>
              </div>
            ` : ""}
          </div>

          <hr style="border-top: 1px solid #000; margin: 2mm 0;" />

          <table style="width: 100%; font-size: 9px; margin-bottom: 2mm; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="padding: 2mm 0; text-align: center; width: 8%; font-size: 8px; font-weight: 600; color: #000;">#</th>
                <th style="padding: 2mm 0; text-align: left; width: 40%; font-size: 8px; font-weight: 600; color: #000;">Product</th>
                <th style="padding: 2mm 0; text-align: center; width: 12%; font-size: 8px; font-weight: 600; color: #000;">Qty</th>
                <th style="padding: 2mm 0; text-align: right; width: 20%; font-size: 8px; font-weight: 600; color: #000;">Unit Price</th>
                <th style="padding: 2mm 0; text-align: right; width: 20%; font-size: 8px; font-weight: 600; color: #000;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <hr style="border-top: 1px dashed #000; margin: 2mm 0;" />

          <div style="font-size: 9px;">
            <div style="display: flex; justify-content: space-between; color: #000;">
              <span>Subtotal:</span>
              <span>${formatPrice(subtotal)}</span>
            </div>

            ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #000;">
                <span>Discount:</span>
                <span>(-) ${formatPrice(discount)}</span>
              </div>
            ` : ""}

            <div style="display: flex; justify-content: space-between; color: #000;">
              <span>Tax (VAT 7.5%):</span>
              <span>(+) ${formatPrice(vatAmount)}</span>
            </div>

            ${roundOff !== 0 ? `
              <div style="display: flex; justify-content: space-between; color: #000;">
                <span>Round Off:</span>
                <span>${roundOff >= 0 ? "+" : ""}${formatPrice(roundOff)}</span>
              </div>
            ` : ""}
          </div>

          <div class="grand-total" style="display: flex; justify-content: space-between; align-items: center; padding: 2mm 0; margin: 2mm 0; border-top: 2px solid #000; border-bottom: 2px solid #000; color: #000;">
            <span>Total:</span>
            <span>৳ ${formatPrice(total)}</span>
          </div>

          <div style="font-size: 9px;">
            ${paymentHtml}
          </div>

          ${pointsRedeemed > 0 ? `
            <hr style="border-top: 1px dashed #000; margin: 2mm 0;" />
            <div style="font-size: 9px;">
              <p style="font-size: 8px; font-weight: 600; text-transform: uppercase; color: #666; margin-bottom: 1mm;">Points Redemption</p>
              <div style="display: flex; justify-content: space-between; color: #000;">
                <span>Points Redeemed:</span>
                <span style="font-weight: bold;">(-) ${pointsRedeemed}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #000;">
                <span>Redemption Value:</span>
                <span style="font-weight: bold;">(-) ৳ ${formatPrice(pointsMonetaryValue)}</span>
              </div>
            </div>
          ` : ""}

          ${hasLoyaltyData ? `
            <hr style="border-top: 1px dashed #000; margin: 2mm 0;" />
            <div style="font-size: 9px;">
              <div style="display: flex; justify-content: space-between; color: #000;">
                <span>Points Earned:</span>
                <span style="font-weight: bold;">${isCreditSale ? "0 (Credit Sale)" : `(+) ${pointsEarned}`}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; color: #000;">
                <span>Total Points:</span>
                <span>${customerLoyaltyPoints.toLocaleString()}</span>
              </div>
            </div>
          ` : ""}

          <div style="text-align: center; margin: 4mm 0;">
            <svg id="barcode-${invoiceNo}"></svg>
          </div>

          <div style="font-size: 7px; color: #000; line-height: 1.5;">
            ${termsHtml}
          </div>

          <div style="text-align: center; margin-top: 4mm; font-size: 9px; font-family: monospace; color: #666;">
            Developed By www.shahnabil.com
          </div>


          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              if (typeof JsBarcode !== 'undefined') {
                JsBarcode("#barcode-${invoiceNo}", "${invoiceNo}", {
                  format: "CODE128",
                  width: 1.2,
                  height: 40,
                  fontSize: 10,
                  displayValue: true
                });
              }
              
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [settings]);

  return { printReceipt };
}
