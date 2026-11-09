import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  orderId: string;
  status: string;
  trackingCode?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  sendAdminNotification?: boolean;
  productInfo?: {
    productId: string;
    productName: string;
    productSlug: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, status, trackingCode, customerEmail, customerName, customerPhone, totalAmount, sendAdminNotification, productInfo }: EmailRequest = await req.json();
    console.log("Processing email for order:", orderId, "status:", status, "sendAdminNotification:", sendAdminNotification, "productInfo:", productInfo);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ message: "Email service not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order details from database to ensure we have the phone number and product info
    let phoneNumber = customerPhone || "N/A";
    let orderProducts: Array<{ product_id: string; product_name: string }> = [];
    
    if (!customerPhone || customerPhone === "N/A" || status === "delivered") {
      const { data: orderData } = await supabase
        .from("orders")
        .select(`
          customer_phone, 
          shipping_address,
          order_items(product_id, product_name)
        `)
        .eq("id", orderId)
        .maybeSingle();
      
      if (orderData) {
        phoneNumber = orderData.customer_phone || "N/A";
        orderProducts = orderData.order_items || [];
        console.log("Phone from database:", phoneNumber, "Products:", orderProducts.length);
      }
    }

    // Get the product slug for review link (use first product if multiple)
    let reviewLink = "";
    if (status === "delivered" && orderProducts.length > 0) {
      const firstProduct = orderProducts[0];
      if (firstProduct.product_id) {
        const { data: productData } = await supabase
          .from("products")
          .select("slug, category, subcategory")
          .eq("id", firstProduct.product_id)
          .maybeSingle();
        
        if (productData) {
          // Build the product URL
          const baseUrl = "https://fashion-elegance.lovable.app";
          reviewLink = `${baseUrl}/${productData.category}/${productData.subcategory}/${productData.slug}`;
          console.log("Review link:", reviewLink);
        }
      }
    }

    const formatCurrency = (amount: number) => `৳${amount.toLocaleString()}`;
    const orderIdShort = orderId.slice(0, 8).toUpperCase();

    // Map status to trigger event
    const triggerEventMap: Record<string, string> = {
      pending: "order_created",
      confirmed: "order_confirmed",
      processing: "order_processing",
      shipped: "order_shipped",
      delivered: "order_delivered",
      cancelled: "order_cancelled",
      hold: "order_on_hold",
    };

    const triggerEvent = triggerEventMap[status] || "order_created";
    const results: { customer?: boolean; admin?: boolean } = {};

    // Verified domain sender
    const emailSender = "Bubu Lifestyle <noreply@bubu.com.bd>";

    // Send customer email if template exists
    if (customerEmail) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, html_body")
        .eq("trigger_event", triggerEvent)
        .eq("is_active", true)
        .maybeSingle();

      if (template) {
        // Get first product name for review email
        const productName = orderProducts.length > 0 ? orderProducts[0].product_name : "your purchase";
        
        const htmlBody = template.html_body
          .replace(/\{\{customer_name\}\}/g, customerName || "Customer")
          .replace(/\{\{order_id\}\}/g, orderIdShort)
          .replace(/\{\{total_amount\}\}/g, formatCurrency(totalAmount))
          .replace(/\{\{tracking_code\}\}/g, trackingCode || "N/A")
          .replace(/\{\{customer_email\}\}/g, customerEmail || "N/A")
          .replace(/\{\{customer_phone\}\}/g, phoneNumber)
          .replace(/\{\{product_name\}\}/g, productName)
          .replace(/\{\{review_link\}\}/g, reviewLink);

        const subject = template.subject
          .replace(/\{\{order_id\}\}/g, orderIdShort)
          .replace(/\{\{customer_name\}\}/g, customerName || "Customer");

        const customerRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: emailSender,
            to: [customerEmail],
            subject,
            html: htmlBody,
          }),
        });

        const customerData = await customerRes.json();
        console.log("Customer email result:", customerData);
        results.customer = customerRes.ok;
      } else {
        console.log("No active template found for trigger:", triggerEvent);
      }
    }

    // Send admin notification for new orders
    if (sendAdminNotification && status === "pending") {
      const { data: adminTemplate } = await supabase
        .from("email_templates")
        .select("subject, html_body")
        .eq("trigger_event", "admin_new_order")
        .eq("is_active", true)
        .maybeSingle();

      // Get admin emails from site_settings or use a default
      const { data: adminSetting } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "admin_notification_email")
        .maybeSingle();

      const adminEmail = adminSetting?.setting_value?.email || null;

      if (adminTemplate && adminEmail) {
        const adminHtml = adminTemplate.html_body
          .replace(/\{\{customer_name\}\}/g, customerName || "Customer")
          .replace(/\{\{customer_email\}\}/g, customerEmail || "N/A")
          .replace(/\{\{customer_phone\}\}/g, phoneNumber)
          .replace(/\{\{order_id\}\}/g, orderIdShort)
          .replace(/\{\{total_amount\}\}/g, formatCurrency(totalAmount));

        const adminSubject = adminTemplate.subject.replace(/\{\{order_id\}\}/g, orderIdShort);

        const adminRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: emailSender,
            to: [adminEmail],
            subject: adminSubject,
            html: adminHtml,
          }),
        });

        const adminData = await adminRes.json();
        console.log("Admin email result:", adminData);
        results.admin = adminRes.ok;
      } else {
        console.log("No admin template or email configured");
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
