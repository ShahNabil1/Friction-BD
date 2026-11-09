import Barcode from "react-barcode";
import { POSSettings } from "@/hooks/usePOSSettings";
import frictionLogo from "@/assets/friction-logo-color.jpg";

interface ReceiptPreviewProps {
  settings: POSSettings;
  scale?: number;
}

export function ReceiptPreview({ settings, scale = 1 }: ReceiptPreviewProps) {
  
  // Sample data for preview
  const sampleItems = [
    { name: "Premium Watch", variant: "Black / M", qty: 1, unitPrice: 2500 },
    { name: "Leather Belt", variant: "Brown", qty: 2, unitPrice: 850 },
  ];
  
  const subtotal = sampleItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const discount = 200;
  const vatRate = 0.075;
  const vatAmount = Math.round(subtotal * vatRate);
  const totalWithVat = subtotal - discount + vatAmount;
  const total = Math.round(totalWithVat);
  const roundOff = total - totalWithVat;
  
  const invoiceNo = "PREVIEW1";
  const formatPrice = (amount: number) => amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
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

  const logoSrc = settings.logoUrl || frictionLogo;

  return (
    <div 
      className="bg-white border-2 border-dashed border-muted rounded-lg shadow-inner overflow-hidden transition-all duration-300"
      style={{
        width: settings.paperWidth === "58mm" ? `${180 * scale}px` : `${260 * scale}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
    >
      <div
        className="p-3 text-black font-bold"
        style={{ 
          fontSize: settings.paperWidth === "58mm" ? "9px" : "11px",
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
        }}
      >
        {/* Mushak Label */}
        {settings.showMushakLabel && (
          <div className="relative">
            <span className="absolute top-0 right-0 text-[7px] font-bold text-gray-600">
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
              className="h-8 mx-auto mb-1"
              style={{ maxWidth: settings.paperWidth === "58mm" ? "30mm" : "40mm" }}
            />
          )}
          
          {/* Government Text */}
          {settings.govtHeader1 && (
            <p className="text-[7px] text-gray-600" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
              {settings.govtHeader1}
            </p>
          )}
          {settings.govtHeader2 && (
            <p className="text-[7px] text-gray-600 mb-1" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
              {settings.govtHeader2}
            </p>
          )}

          {/* Company Name */}
          <h1 className="text-[10px] font-bold uppercase tracking-wide mb-1">
            {settings.companyName}
          </h1>

          {/* Registered Address */}
          {settings.registeredAddress && (
            <p className="text-[6px] text-gray-600 leading-tight">
              {settings.registeredAddress}
            </p>
          )}

          {/* VAT Number */}
          {settings.vatRegNo && (
            <p className="text-[7px] font-semibold mt-1">
              Central VAT Reg. No.: {settings.vatRegNo}
            </p>
          )}

          {/* Contact */}
          {(settings.contactMobile || settings.contactWebsite) && (
            <p className="text-[6px] text-gray-600 mt-1">
              {settings.contactMobile && `Mobile: ${settings.contactMobile}`}
              {settings.contactMobile && settings.contactWebsite && ", "}
              {settings.contactWebsite}
            </p>
          )}
        </div>

        {/* Divider */}
        <hr className="border-t border-dashed border-black my-2" />

        {/* Invoice Details */}
        <div className="mb-2">
          <h2 className="text-[9px] font-bold mb-1">Invoice</h2>
          
          <div className="grid grid-cols-2 gap-x-2 text-[7px]">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice No:</span>
              <span className="font-medium">{invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span>{formatDateTime()}</span>
            </div>
          </div>

          <div className="text-[7px] mt-1 flex items-start justify-between gap-2">
            <span className="text-gray-600 shrink-0">Customer:</span>
            <span className="font-medium text-right break-words">Sample Customer</span>
          </div>

          <div className="text-[7px] mt-0.5">
            <span className="text-gray-600">Mobile:</span>
            <span className="ml-1">01700000000</span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-t border-solid border-black my-1" />

        {/* Product Table */}
        <table className="w-full text-[7px] mb-1" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="border-b border-black">
              <th className="py-0.5 text-center w-[8%] text-[6px] font-semibold">#</th>
              <th className="py-0.5 text-left w-[42%] text-[6px] font-semibold">Product</th>
              <th className="py-0.5 text-center w-[12%] text-[6px] font-semibold">Qty</th>
              <th className="py-0.5 text-right w-[18%] text-[6px] font-semibold">Price</th>
              <th className="py-0.5 text-right w-[20%] text-[6px] font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sampleItems.map((item, index) => (
              <tr key={index} className="border-b border-dotted border-gray-300">
                <td className="py-1 text-center">{index + 1}</td>
                <td className="py-1">
                  <div className="leading-tight">
                    <span className="block truncate">{item.name}</span>
                    {item.variant && (
                      <span className="text-[5px] text-gray-500">{item.variant}</span>
                    )}
                  </div>
                </td>
                <td className="py-1 text-center">{item.qty.toFixed(2)} Pc</td>
                <td className="py-1 text-right">{formatPrice(item.unitPrice)}</td>
                <td className="py-1 text-right font-semibold">
                  {formatPrice(item.unitPrice * item.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <hr className="border-t border-dashed border-black my-1" />

        <div className="space-y-0.5 text-[7px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>(-) {formatPrice(discount)}</span>
          </div>

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
        <div className="flex justify-between items-center py-1 my-1 border-t-2 border-b-2 border-black text-[9px] font-bold">
          <span>Total:</span>
          <span>৳ {formatPrice(total)}</span>
        </div>

        {/* Payment Info */}
        <div className="text-[7px]">
          <div className="flex justify-between">
            <span>Cash:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Barcode */}
        <div className="flex justify-center my-2">
          <Barcode
            value={invoiceNo}
            format="CODE128"
            width={0.8}
            height={25}
            fontSize={8}
            displayValue
            renderer="svg"
          />
        </div>

        {/* Terms & Conditions */}
        <div className="text-[8px] leading-relaxed space-y-1">
          {settings.termsAndConditions.map((term) => (
            <p key={term.id}>{term.text}</p>
          ))}
        </div>

      </div>
    </div>
  );
}
