import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ScanRequest = {
  dryRun?: boolean;
  prefix?: string; // e.g. "products/" or "" for all
  max?: number; // max orphans to return
  paths?: string[]; // paths to delete
  confirmDelete?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripToPath(url: string, supabaseUrl: string, bucket: string): string | null {
  if (!url) return null;
  const u = url.trim();
  const marker = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`;
  const idx = u.indexOf(marker);
  if (idx === -1) return null;
  const rest = u.slice(idx + marker.length);
  const path = rest.split("?")[0].split("#")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function extractUrlsFromUnknown(value: unknown): string[] {
  const out: string[] = [];
  if (!value) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) out.push(...extractUrlsFromUnknown(v));
    return out;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      out.push(...extractUrlsFromUnknown(v));
    }
  }
  return out;
}

async function listAllObjects(supabase: any, bucket: string, prefix: string) {
  const files: Array<{ path: string; updated_at: string | null; metadata: any }> = [];
  const queue: string[] = [prefix];
  const visited = new Set<string>();

  while (queue.length) {
    const currentPrefix = queue.shift()!;
    if (visited.has(currentPrefix)) continue;
    visited.add(currentPrefix);

    const { data, error } = await supabase.storage.from(bucket).list(currentPrefix, { limit: 1000 });
    if (error) throw error;

    for (const item of data ?? []) {
      // Folder objects come back with id=null and metadata=null
      const isFolder = item?.id === null;
      if (isFolder) {
        queue.push(`${currentPrefix}${item.name}/`);
        continue;
      }
      files.push({
        path: `${currentPrefix}${item.name}`,
        updated_at: item.updated_at ?? null,
        metadata: item.metadata ?? null,
      });
    }
  }

  return files;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as ScanRequest;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    // Auth client (verifies JWT, gives us user id)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { data: isAdmin, error: adminErr } = await authClient.rpc("is_admin", { _user_id: userId });
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client (for storage + reading all tables)
    const svc = createClient(supabaseUrl, serviceKey);
    const bucket = "ecommerce-assets";

    // Delete mode
    if (body.confirmDelete) {
      const paths = (body.paths ?? []).filter(Boolean);
      if (!paths.length) {
        return new Response(JSON.stringify({ ok: true, deleted: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove in chunks (Supabase limits payload sizes)
      let deleted = 0;
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        const { error: delErr } = await svc.storage.from(bucket).remove(chunk);
        if (delErr) throw delErr;
        deleted += chunk.length;
      }

      return new Response(JSON.stringify({ ok: true, deleted }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scan mode
    const prefix = (body.prefix ?? "").replace(/^\//, "");
    const max = Math.min(Math.max(body.max ?? 500, 1), 2000);

    const [allFiles, brandsRes, productsRes, orderItemsRes, settingsRes] = await Promise.all([
      listAllObjects(svc, bucket, prefix),
      svc.from("brands").select("logo_url"),
      svc.from("products").select("images"),
      svc.from("order_items").select("product_image"),
      svc.from("site_settings").select("setting_key, setting_value"),
    ]);

    if (brandsRes.error) throw brandsRes.error;
    if (productsRes.error) throw productsRes.error;
    if (orderItemsRes.error) throw orderItemsRes.error;
    if (settingsRes.error) throw settingsRes.error;

    const referenced = new Set<string>();

    for (const b of brandsRes.data ?? []) {
      const p = stripToPath(b.logo_url ?? "", supabaseUrl, bucket);
      if (p) referenced.add(p);
    }

    for (const p of productsRes.data ?? []) {
      const imgs = Array.isArray(p.images) ? p.images : [];
      for (const url of imgs) {
        const path = stripToPath(String(url ?? ""), supabaseUrl, bucket);
        if (path) referenced.add(path);
      }
    }

    for (const oi of orderItemsRes.data ?? []) {
      const path = stripToPath(oi.product_image ?? "", supabaseUrl, bucket);
      if (path) referenced.add(path);
    }

    for (const s of settingsRes.data ?? []) {
      const urls = extractUrlsFromUnknown(s.setting_value);
      for (const u of urls) {
        const path = stripToPath(u, supabaseUrl, bucket);
        if (path) referenced.add(path);
      }
    }

    const publicBase = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`;

    const orphans = allFiles
      .filter((f) => !referenced.has(f.path))
      .slice(0, max)
      .map((f) => ({
        path: f.path,
        url: `${publicBase}${encodeURI(f.path)}`,
        updated_at: f.updated_at,
        size: f.metadata?.size ?? null,
        mimetype: f.metadata?.mimetype ?? null,
      }));

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: allFiles.length,
        referenced: referenced.size,
        orphanCount: allFiles.length - referenced.size,
        returned: orphans.length,
        orphans,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("cleanup-ecommerce-assets error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
