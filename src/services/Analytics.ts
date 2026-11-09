import { supabase } from "@/integrations/supabase/client";

interface AnalyticsConfig {
  metaPixelId: string | null;
  metaConversionToken: string | null;
  googleAnalyticsId: string | null;
  googleTagManagerId: string | null;
}

interface EventData {
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  currency?: string;
  value?: number;
  num_items?: number;
  order_id?: string;
  user_email?: string;
  user_phone?: string;
  [key: string]: unknown;
}

// Global config cache
let analyticsConfig: AnalyticsConfig | null = null;
let isInitialized = false;

// SHA-256 hash function for user data (required by Meta CAPI)
async function hashUserData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate unique event ID for deduplication
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Fetch analytics config from store_settings
export async function fetchAnalyticsConfig(): Promise<AnalyticsConfig> {
  if (analyticsConfig) return analyticsConfig;

  const { data, error } = await supabase
    .from("store_settings")
    .select("meta_pixel_id, google_analytics_id, google_tag_manager_id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch analytics config:", error);
    analyticsConfig = {
      metaPixelId: null,
      metaConversionToken: null,
      googleAnalyticsId: null,
      googleTagManagerId: null,
    };
  } else {
    analyticsConfig = {
      metaPixelId: data?.meta_pixel_id || null,
      metaConversionToken: null, // stored in admin-only secure_settings; fetched server-side by capi-event
      googleAnalyticsId: data?.google_analytics_id || null,
      googleTagManagerId: data?.google_tag_manager_id || null,
    };
  }

  return analyticsConfig;
}

// Inject Meta Pixel script
function injectMetaPixel(pixelId: string) {
  if (document.getElementById("fb-pixel-script")) return;

  // fbq base code
  const script = document.createElement("script");
  script.id = "fb-pixel-script";
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
  `;
  document.head.appendChild(script);

  // No-script fallback
  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);
}

// Inject Google Analytics script
function injectGoogleAnalytics(measurementId: string) {
  if (document.getElementById("ga-script")) return;

  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  const configScript = document.createElement("script");
  configScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(configScript);
}

// Inject Google Tag Manager script
function injectGoogleTagManager(containerId: string) {
  if (document.getElementById("gtm-script")) return;

  // Head script
  const script = document.createElement("script");
  script.id = "gtm-script";
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `;
  document.head.insertBefore(script, document.head.firstChild);

  // Body noscript fallback
  const noscript = document.createElement("noscript");
  noscript.id = "gtm-noscript";
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  
  // Insert right after body opening
  if (document.body.firstChild) {
    document.body.insertBefore(noscript, document.body.firstChild);
  } else {
    document.body.appendChild(noscript);
  }
}

// Initialize analytics (call once on app load)
export async function initAnalytics(): Promise<void> {
  if (isInitialized) return;

  const config = await fetchAnalyticsConfig();

  // GTM should be injected first as it may manage other tags
  if (config.googleTagManagerId) {
    injectGoogleTagManager(config.googleTagManagerId);
  }

  if (config.metaPixelId) {
    injectMetaPixel(config.metaPixelId);
  }

  if (config.googleAnalyticsId) {
    injectGoogleAnalytics(config.googleAnalyticsId);
  }

  isInitialized = true;
}

// Track PageView
export function trackPageView(path?: string) {
  const config = analyticsConfig;
  if (!config) return;

  // GTM dataLayer
  if (config.googleTagManagerId && typeof window !== "undefined") {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "page_view",
      page_path: path || window.location.pathname,
      page_url: window.location.href,
    });
  }

  // Meta Pixel
  if (config.metaPixelId && typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", "PageView");
  }

  // Google Analytics
  if (config.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "page_view", {
      page_path: path || window.location.pathname,
    });
  }
}

// Send server-side CAPI event
async function sendServerEvent(
  eventName: string,
  eventData: EventData,
  eventId: string
) {
  try {
    const userData: Record<string, string> = {};
    
    if (eventData.user_email) {
      userData.em = await hashUserData(eventData.user_email);
    }
    if (eventData.user_phone) {
      // Normalize phone: remove spaces, dashes, etc.
      const normalizedPhone = eventData.user_phone.replace(/[^\d+]/g, "");
      userData.ph = await hashUserData(normalizedPhone);
    }

    await supabase.functions.invoke("capi-event", {
      body: {
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: userData,
        custom_data: {
          currency: eventData.currency || "BDT",
          value: eventData.value,
          content_ids: eventData.content_ids,
          content_name: eventData.content_name,
          content_type: eventData.content_type,
          num_items: eventData.num_items,
          order_id: eventData.order_id,
        },
      },
    });
  } catch (error) {
    console.error("Server-side tracking failed:", error);
  }
}

// Generic track event function
export async function trackEvent(
  eventName: string,
  data: EventData = {},
  options: { serverSide?: boolean } = {}
): Promise<void> {
  const config = analyticsConfig;
  if (!config) {
    await fetchAnalyticsConfig();
  }

  const eventId = data.order_id || generateEventId();

  // GTM dataLayer push
  if (config?.googleTagManagerId && typeof window !== "undefined") {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: eventName,
      ecommerce: {
        currency: data.currency || "BDT",
        value: data.value,
        items: data.content_ids?.map((id, index) => ({
          item_id: id,
          item_name: data.content_name || undefined,
          quantity: data.num_items || 1,
          price: data.value,
        })),
        transaction_id: data.order_id,
      },
      event_id: eventId,
    });
  }

  // Client-side Meta Pixel
  if (config?.metaPixelId && typeof window !== "undefined" && (window as any).fbq) {
    const fbData: Record<string, unknown> = {
      content_ids: data.content_ids,
      content_name: data.content_name,
      content_type: data.content_type || "product",
      currency: data.currency || "BDT",
      value: data.value,
      num_items: data.num_items,
    };
    
    // Add eventID for deduplication
    (window as any).fbq("track", eventName, fbData, { eventID: eventId });
  }

  // Client-side Google Analytics
  if (config?.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
    const gaEventName = eventName.toLowerCase().replace(/([A-Z])/g, "_$1").replace(/^_/, "");
    (window as any).gtag("event", gaEventName, {
      currency: data.currency || "BDT",
      value: data.value,
      items: data.content_ids?.map((id) => ({ item_id: id })),
      transaction_id: data.order_id,
    });
  }

  // Server-side for critical events (bypasses ad blockers)
  const serverSideEvents = ["Purchase", "InitiateCheckout", "AddToCart"];
  if (options.serverSide !== false && serverSideEvents.includes(eventName)) {
    sendServerEvent(eventName, data, eventId);
  }
}

// Convenience functions for common events
export function trackAddToCart(
  productId: string,
  productName: string,
  value: number,
  currency = "BDT"
) {
  return trackEvent("AddToCart", {
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    currency,
    value,
    num_items: 1,
  });
}

export function trackInitiateCheckout(
  productIds: string[],
  value: number,
  numItems: number,
  currency = "BDT"
) {
  return trackEvent("InitiateCheckout", {
    content_ids: productIds,
    content_type: "product",
    currency,
    value,
    num_items: numItems,
  });
}

export function trackPurchase(
  orderId: string,
  productIds: string[],
  value: number,
  numItems: number,
  userEmail?: string,
  userPhone?: string,
  currency = "BDT"
) {
  return trackEvent("Purchase", {
    order_id: orderId,
    content_ids: productIds,
    content_type: "product",
    currency,
    value,
    num_items: numItems,
    user_email: userEmail,
    user_phone: userPhone,
  });
}

export function trackViewContent(
  productId: string,
  productName: string,
  value: number,
  currency = "BDT"
) {
  return trackEvent("ViewContent", {
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    currency,
    value,
  }, { serverSide: false });
}

// Reset config cache (useful when admin updates settings)
export function resetAnalyticsConfig() {
  analyticsConfig = null;
  isInitialized = false;
}
