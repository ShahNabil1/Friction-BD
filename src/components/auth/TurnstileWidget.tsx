import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  className?: string;
  theme?: "light" | "dark" | "auto";
};

export function TurnstileWidget({ siteKey, onTokenChange, className, theme = "auto" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const stableId = useId();

  useEffect(() => {
    let cancelled = false;

    const waitForTurnstile = () => {
      if (cancelled) return;
      if (window.turnstile?.render) {
        setIsReady(true);
        return;
      }
      setTimeout(waitForTurnstile, 50);
    };

    waitForTurnstile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!containerRef.current) return;
    if (!window.turnstile?.render) return;

    // Ensure a clean render.
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }

    onTokenChange(null);

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => onTokenChange(null),
    });

    widgetIdRef.current = widgetId;

    return () => {
      if (widgetIdRef.current) {
        try {
          window.turnstile?.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, siteKey, theme, stableId]);

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
}
