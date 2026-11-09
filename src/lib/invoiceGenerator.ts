import { jsPDF } from "jspdf";
import frictionLogoWhite from "@/assets/friction-logo-white.jpg";


interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  order_number?: string | null;
  total_amount: number;
  subtotal?: number | null;
  shipping_cost?: number | null;
  delivery_fee?: number | null;
  discount?: number | null;
  status?: string;
  payment_status?: string | null;
  payment_method?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | Record<string, string> | null;
  shipping_city?: string | null;
  shipping_area?: string | null;
  created_at: string;
}

// Friction brand colors
const BRAND_BLACK = { r: 26, g: 26, b: 26 }; // #1a1a1a
const BRAND_RED = { r: 236, g: 32, b: 39 };   // #ec2027
const BRAND_PURPLE = BRAND_BLACK; // alias for legacy references
const WHITE = { r: 255, g: 255, b: 255 };
const LIGHT_GRAY = { r: 245, g: 245, b: 245 };
const DARK_TEXT = { r: 26, g: 26, b: 26 };


// Helper to load image as base64 and get dimensions
const loadImageWithDimensions = (src: string): Promise<{ base64: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          base64: canvas.toDataURL("image/png"),
          width: img.width,
          height: img.height,
        });
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const parseShippingAddress = (address: string | Record<string, string> | null): string => {
  if (!address) return "Not provided";

  try {
    const addressObj = typeof address === "string" ? JSON.parse(address) : address;

    const parts: string[] = [];

    const roadParts = [
      addressObj.road_no && `Road ${addressObj.road_no}`,
      addressObj.road,
      addressObj.house_no && `House ${addressObj.house_no}`,
      addressObj.flat_no && `Flat ${addressObj.flat_no}`,
    ].filter(Boolean);
    if (roadParts.length > 0) parts.push(roadParts.join(", "));

    if (addressObj.village || addressObj.area) {
      parts.push(addressObj.village || addressObj.area);
    }

    const locationParts = [
      addressObj.thana,
      addressObj.upazilla,
      addressObj.zilla || addressObj.district,
    ].filter(Boolean);
    if (locationParts.length > 0) parts.push(locationParts.join(", "));

    if (addressObj.post_office) {
      parts.push(`P.O: ${addressObj.post_office}`);
    }
    if (addressObj.postal_code) {
      parts.push(addressObj.postal_code);
    }

    return parts.join(", ") || "Not provided";
  } catch {
    if (typeof address === "string") {
      return address;
    }
    return "Not provided";
  }
};

// Helper to draw rounded rectangle
const drawRoundedRect = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: { r: number; g: number; b: number }
) => {
  doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
  doc.roundedRect(x, y, width, height, radius, radius, "F");
};

const DEFAULT_TERMS = [
  "Returns are accepted within 3 days of delivery for unused items in original packaging.",
  "Exchange requests must be initiated within 3 days of receiving the product.",
  "Refunds will be processed within 7-10 business days after receiving the returned item.",
  "Delivery charges are non-refundable unless the return is due to a defective product.",
  "For any queries, contact us at 01929-110024.",
];

export const generateInvoicePDF = async (
  order: Order, 
  orderItems: OrderItem[],
  customTerms?: string[]
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 0;
  
  // Use custom terms if provided, otherwise use defaults
  const terms = customTerms && customTerms.length > 0 ? customTerms : DEFAULT_TERMS;

  // ===== HEADER SECTION (Deep Purple Background) =====
  const headerHeight = 50;
  drawRoundedRect(doc, 0, 0, pageWidth, headerHeight, 0, BRAND_PURPLE);

  // Add Friction logo with proper aspect ratio
  try {
    const logoData = await loadImageWithDimensions(frictionLogoWhite);
    const maxLogoWidth = 42;
    const aspectRatio = logoData.width / logoData.height;
    const logoWidth = maxLogoWidth;
    const logoHeight = logoWidth / aspectRatio;
    const logoY = (headerHeight - logoHeight) / 2;
    doc.addImage(logoData.base64, "JPEG", margin, logoY, logoWidth, logoHeight);
  } catch (error) {
    // Fallback to text if logo fails to load
    doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("FRICTION", margin, 26);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.text("NO FEAR", margin, 34);
  }


  // Company Info (Right aligned) - WHITE text on purple background
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const companyInfo = [
    "Shop No #02-03, Beside of Sena Cinema Hall",
    "Nabinagar, Savar, Dhaka, 1344",
    "",
    "Phone: 01929-110024",
  ];

  let infoY = 14;
  companyInfo.forEach((line) => {
    doc.text(line, pageWidth - margin, infoY, { align: "right" });
    infoY += 5;
  });

  // ===== INVOICE TITLE SECTION =====
  yPos = headerHeight + 15;

  // Invoice badge
  doc.setFillColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.roundedRect(margin, yPos - 6, 50, 12, 2, 2, "F");
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", margin + 25, yPos + 2, { align: "center" });

  // Order details (Right side)
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const orderDate = new Date(order.created_at).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayNumber = order.order_number || order.id.slice(0, 8).toUpperCase();
  doc.text(`Order #${displayNumber}`, pageWidth - margin, yPos - 2, { align: "right" });
  doc.setFontSize(9);
  doc.text(`Date: ${orderDate}`, pageWidth - margin, yPos + 5, { align: "right" });

  // Status badge
  yPos += 18;
  const statusText = order.status?.charAt(0).toUpperCase() + (order.status?.slice(1) || "Pending");
  const paymentText = order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method || "N/A";

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Status: ${statusText}  |  Payment: ${paymentText}`, margin, yPos);

  // ===== DIVIDER LINE =====
  yPos += 8;
  doc.setDrawColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ===== BILL TO SECTION =====
  yPos += 12;
  doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
  doc.roundedRect(margin, yPos - 5, contentWidth, 35, 3, 3, "F");

  doc.setTextColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin + 5, yPos + 3);

  yPos += 10;
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(order.customer_name || "N/A", margin + 5, yPos);

  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Phone: ${order.customer_phone || "N/A"}`, margin + 5, yPos);

  yPos += 5;
  const address = parseShippingAddress(order.shipping_address);
  const addressLines = doc.splitTextToSize(address, contentWidth - 15);
  doc.text(addressLines, margin + 5, yPos);
  yPos += addressLines.length * 4 + 10;

  // ===== ITEMS TABLE =====
  // Table Header
  const tableStartY = yPos;
  const colWidths = {
    item: 85,
    qty: 25,
    price: 35,
    total: 35,
  };

  // Header row
  doc.setFillColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.rect(margin, yPos, contentWidth, 10, "F");

  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  let xPos = margin + 3;
  doc.text("ITEM", xPos, yPos + 7);
  xPos += colWidths.item;
  doc.text("QTY", xPos, yPos + 7, { align: "center" });
  xPos += colWidths.qty;
  doc.text("PRICE", xPos + colWidths.price / 2, yPos + 7, { align: "center" });
  xPos += colWidths.price;
  doc.text("TOTAL", pageWidth - margin - 3, yPos + 7, { align: "right" });

  yPos += 10;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  orderItems.forEach((item, index) => {
    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
      doc.rect(margin, yPos, contentWidth, 10, "F");
    }

    const itemName = item.product_name || "Unknown Item";
    const truncatedName = itemName.length > 45 ? itemName.substring(0, 42) + "..." : itemName;
    const qty = item.quantity || 1;
    const unitPrice = item.unit_price || 0;
    const lineTotal = qty * unitPrice;

    doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);

    xPos = margin + 3;
    doc.text(truncatedName, xPos, yPos + 7);
    xPos += colWidths.item;
    doc.text(qty.toString(), xPos, yPos + 7, { align: "center" });
    xPos += colWidths.qty;
    doc.text(formatCurrency(unitPrice), xPos + colWidths.price / 2, yPos + 7, { align: "center" });
    doc.text(formatCurrency(lineTotal), pageWidth - margin - 3, yPos + 7, { align: "right" });

    yPos += 10;

    // Check if we need a new page
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }
  });

  // Table bottom border
  doc.setDrawColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ===== TOTALS SECTION =====
  yPos += 10;

  const subtotal = order.subtotal || 0;
  const deliveryCharge = order.shipping_cost || order.delivery_fee || 0;
  const discount = order.discount || 0;

  // Right-aligned totals box
  const totalsBoxX = pageWidth - margin - 80;
  const totalsBoxWidth = 80;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);

  // Subtotal
  doc.text("Subtotal:", totalsBoxX, yPos);
  doc.text(formatCurrency(subtotal), pageWidth - margin, yPos, { align: "right" });

  yPos += 6;
  doc.text("Delivery:", totalsBoxX, yPos);
  doc.text(`+ ${formatCurrency(deliveryCharge)}`, pageWidth - margin, yPos, { align: "right" });

  if (discount > 0) {
    yPos += 6;
    doc.setTextColor(0, 128, 0);
    doc.text("Discount:", totalsBoxX, yPos);
    doc.text(`- ${formatCurrency(discount)}`, pageWidth - margin, yPos, { align: "right" });
    doc.setTextColor(DARK_TEXT.r, DARK_TEXT.g, DARK_TEXT.b);
  }

  // Grand Total (Highlighted with Friction Red)
  yPos += 10;
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.roundedRect(totalsBoxX - 5, yPos - 5, totalsBoxWidth + 5, 14, 2, 2, "F");


  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL", totalsBoxX, yPos + 4);
  doc.text(formatCurrency(order.total_amount), pageWidth - margin - 3, yPos + 4, { align: "right" });

  // ===== THANK YOU MESSAGE =====
  yPos += 25;
  doc.setTextColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for shopping with Friction!", pageWidth / 2, yPos, { align: "center" });

  // ===== TERMS & CONDITIONS SECTION =====
  yPos += 15;
  
  // Terms box
  doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b);
  doc.roundedRect(margin, yPos - 3, contentWidth, 45, 3, 3, "F");
  
  doc.setTextColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS", margin + 5, yPos + 4);
  
  yPos += 10;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  
  // Render numbered terms
  terms.forEach((term, index) => {
    const numberedTerm = `${index + 1}. ${term}`;
    const termLines = doc.splitTextToSize(numberedTerm, contentWidth - 10);
    doc.text(termLines, margin + 5, yPos);
    yPos += termLines.length * 3.5 + 2;
  });

  // ===== FOOTER SECTION (Deep Purple Background) =====
  const footerHeight = 20;
  const footerY = pageHeight - footerHeight;

  doc.setFillColor(BRAND_PURPLE.r, BRAND_PURPLE.g, BRAND_PURPLE.b);
  doc.rect(0, footerY, pageWidth, footerHeight, "F");

  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FRICTION", pageWidth / 2 - 12, footerY + 12);
  doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.setFont("helvetica", "normal");
  doc.text("— NO FEAR", pageWidth / 2 + 8, footerY + 12);


  // Save the PDF
  doc.save(`invoice-${displayNumber}.pdf`);
};
