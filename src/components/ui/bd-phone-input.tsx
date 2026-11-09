import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Bangladesh phone input:
 *  - Accepts only digits (strips symbols, spaces, +, -, etc.)
 *  - Converts Bengali/Arabic-Indic digits to English (০-৯ / ٠-٩)
 *  - Hard limit: 11 digits
 *  - Valid prefixes: 013, 014, 015, 016, 017, 018, 019
 *  - Exposes plain digits via onChange (no formatting)
 *
 * Drop-in for shadcn <Input> — accepts value/onChange like a normal input.
 */

const BENGALI_MAP: Record<string, string> = {
  "০": "0","১": "1","২": "2","৩": "3","৪": "4",
  "৫": "5","৬": "6","৭": "7","৮": "8","৯": "9",
  "٠": "0","١": "1","٢": "2","٣": "3","٤": "4",
  "٥": "5","٦": "6","٧": "7","٨": "8","٩": "9",
};

export function normalizeBDPhone(raw: string): string {
  if (!raw) return "";
  let out = "";
  for (const ch of raw) {
    const mapped = BENGALI_MAP[ch] ?? ch;
    if (/\d/.test(mapped)) out += mapped;
    if (out.length >= 11) break;
  }
  return out;
}

export function isValidBDPhone(digits: string): boolean {
  return /^01[3-9]\d{8}$/.test(digits);
}

export interface BDPhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (value: string) => void;
  invalidClassName?: string;
  showValidationHint?: boolean;
}

export const BDPhoneInput = React.forwardRef<HTMLInputElement, BDPhoneInputProps>(
  ({ value, onChange, className, invalidClassName, showValidationHint = false, onBlur, ...rest }, ref) => {
    const digits = normalizeBDPhone(value || "");
    const isEmpty = digits.length === 0;
    const isValid = isValidBDPhone(digits);
    const showInvalid = showValidationHint && !isEmpty && !isValid;

    return (
      <>
        <Input
          {...rest}
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={11}
          value={digits}
          placeholder={rest.placeholder ?? "01XXXXXXXXX"}
          className={cn(className, showInvalid && (invalidClassName || "border-destructive focus-visible:ring-destructive"))}
          onChange={(e) => {
            const next = normalizeBDPhone(e.target.value);
            onChange(next);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text");
            onChange(normalizeBDPhone(pasted));
          }}
          onKeyDown={(e) => {
            // Allow control keys
            if (
              e.key.length > 1 ||
              e.ctrlKey ||
              e.metaKey ||
              e.altKey
            ) return;
            const mapped = BENGALI_MAP[e.key] ?? e.key;
            if (!/\d/.test(mapped)) {
              e.preventDefault();
            }
          }}
          onBlur={onBlur}
        />
        {showInvalid && (
          <p className="text-xs text-destructive mt-1">
            Enter a valid Bangladesh number (11 digits starting with 013-019).
          </p>
        )}
      </>
    );
  }
);
BDPhoneInput.displayName = "BDPhoneInput";
