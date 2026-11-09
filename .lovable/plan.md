# Refactor: Lead Recovery → Incomplete Orders

Turn the separate "Lead Recovery" page into a first-class `Incomplete` status inside Order Management. Abandoned checkouts stop being a parallel entity — they become real orders that flow through the same pipeline as regular/manual orders (edit, confirm, assign outlet, send to Steadfast, POS fulfillment).

## Behavior

1. **Capture on Checkout**
  - When a customer starts checkout and enters phone + at least one address field (existing trigger), we now create a real row in `orders` with:
    - `status = 'incomplete'`
    - `payment_status = 'pending'`, `payment_method = 'cod'` (default, editable)
    - `source = 'abandoned'` so we can distinguish origin if needed
    - Items snapshot from cart (same shape as normal orders)
    - `order_number` auto-assigned (FT-xxxx)
  - Debounce/upsert: if the same phone has an existing `incomplete` order within 24h, update it instead of creating a new one — prevents duplicates as the user types.
  - When the customer actually completes checkout, if an `incomplete` order exists for that session/phone, upgrade it to `pending` instead of creating a new order.
2. **Order Management UI**
  - Add `Incomplete` tab (positioned before `Pending`) with count badge.
  - Incomplete orders render in the same list/table/cards as every other status, use the same detail dialog, same edit flow (address, phone, items, notes — all existing pending-edit tooling works because it's the same row).
  - Status transitions from `Incomplete`:
    - → `Confirmed` (requires outlet assignment, exactly like today's pending→confirmed)
    - → `Cancelled` (with note)
    - → `On Hold` (with note)
  - Once confirmed, it behaves identically to any confirmed order — Steadfast, POS fulfillment, timeline, etc.
3. **Retire Lead Recovery page**
  - Remove `/admin/abandoned-checkouts` route, sidebar entry, mobile menu entry, permission slug UI.
  - Delete `AbandonedCheckouts.tsx`, `useAbandonedCheckouts.tsx`.
  - Keep `abandoned_checkouts` table untouched (historical data). New captures no longer write to it.
  - Optional cleanup migration can come later; not part of this change.

## Technical Details

**Database migration**

- No new enum needed — `orders.status` is text.
- Add `orders.status` value `'incomplete'` implicitly (already free-form text).
- Update `manage_inventory_on_status_change` trigger: treat `incomplete` like `pending` (no stock deduction). Deduction still happens on `pending`→`confirmed` transition. Confirming from `incomplete` must also deduct — extend the trigger's OLD status guard to `('pending', 'incomplete', NULL)`.
- Update `assign_order_number` trigger — already fires on insert regardless of status, no change.

**Checkout capture (`save-abandoned-checkout` edge function)**

- Rewrite to insert/upsert into `orders` instead of `abandoned_checkouts`.
- Lookup by phone + `status='incomplete'` created within 24h; update if found, insert otherwise.
- Compute subtotal/total from cart items using the same logic Checkout uses (variant price fallback, integer BDT).
- Set `items` JSONB + create matching `order_items` rows so both views work.

**Checkout completion (`src/pages/Checkout.tsx`)**

- Before creating a new order, look for an existing `incomplete` order for this user/phone. If found, `UPDATE` it to `status='pending'` and refresh items/address instead of `INSERT`.

**Orders page (`src/pages/admin/Orders.tsx`)**

- Add `incomplete` to `tabStatuses` array (first position after `all`).
- Add color/label mapping for `incomplete` (slate/gray badge, label "Incomplete").
- Confirm-flow already handles outlet assignment when moving out of pending — reuse untouched; the guard just needs to allow `incomplete` as a valid source status (single-line change).
- Default active tab remains `pending` (per existing memory).

**Cleanup**

- Remove route in `src/App.tsx`.
- Remove nav entries in `AdminLayout.tsx` + `AdminMobileMenu.tsx`.
- Remove `abandoned_checkouts` permission from `permissions.ts` UI list (keep in DB for backward compat).
- Delete `AbandonedCheckouts.tsx` + `useAbandonedCheckouts.tsx`.

## Out of Scope

- Migrating existing `abandoned_checkouts` rows into `orders` (kept as read-only history; can add a one-off migration later on request).
- Changing the customer-facing checkout UI.
- Changing Steadfast / POS logic (already status-driven, works unchanged once status becomes `confirmed`).  
  
When a customer starts checkout and enters phone + at least one address field (existing trigger) এটার বদলে এ্যাড্রেস ফিল্ডে কিছুর প্রয়োজন নেই, ফোন নাম্বার হইলেই হবে এটা করো