/**
 * Formats an order's display number.
 * Prefers the sequential Friction order number (e.g. "FT-42").
 * Falls back to the first 8 chars of the UUID for legacy orders
 * that haven't been backfilled yet.
 */
export function formatOrderNumber(order: {
  order_number?: string | null;
  id?: string | null;
}): string {
  if (order?.order_number && order.order_number.trim().length > 0) {
    return order.order_number;
  }
  if (order?.id) {
    return order.id.slice(0, 8).toUpperCase();
  }
  return "";
}
