import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface LabelPrintPortalProps {
  children: ReactNode;
  /** DOM id used for the portal container */
  portalId?: string;
}

const DEFAULT_PORTAL_ID = "label-print-portal";

function getOrCreatePortalEl(id: string) {
  let el = document.getElementById(id);
  if (el) return el;

  el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

export function LabelPrintPortal({
  children,
  portalId = DEFAULT_PORTAL_ID,
}: LabelPrintPortalProps) {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(() => {
    if (typeof document === "undefined") return null;
    return getOrCreatePortalEl(portalId);
  });

  useEffect(() => {
    // In case portalId changes, re-point the portal.
    if (typeof document === "undefined") return;
    setPortalEl(getOrCreatePortalEl(portalId));
  }, [portalId]);

  if (!portalEl) return null;
  return createPortal(children, portalEl);
}
