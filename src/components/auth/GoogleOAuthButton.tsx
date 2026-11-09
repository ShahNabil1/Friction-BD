import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GoogleGIcon = React.forwardRef<SVGSVGElement, { className?: string }>(
  ({ className }, ref) => (
    <svg
      ref={ref}
      width="18"
      height="18"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.653 32.657 29.184 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.956 3.044l5.657-5.657C34.008 6.053 29.247 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.656 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.956 3.044l5.657-5.657C34.008 6.053 29.247 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.083 0 9.757-1.952 13.34-5.127l-6.161-5.214C29.152 35.41 26.703 36 24 36c-5.163 0-9.62-3.316-11.284-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.198-2.276 4.07-4.124 5.305l.003-.002 6.161 5.214C36.903 39.02 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  )
);
GoogleGIcon.displayName = "GoogleGIcon";

export function GoogleOAuthButton({
  onClick,
  isLoading,
  className,
  disabled,
}: {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={!!isLoading || disabled}
      className={cn(
        "w-full h-12 justify-center gap-3 bg-white text-gray-900 border border-gray-300 shadow-sm hover:bg-gray-50 hover:text-primary hover:border-primary transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <GoogleGIcon className="shrink-0" />
      <span className="font-semibold">Continue with Google</span>
    </Button>
  );
}

export function OrDivider({ className }: { className?: string }) {
  return (
    <div className={cn("relative py-2", className)} aria-hidden="true">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-3 text-xs font-semibold tracking-wider text-muted-foreground">
          OR
        </span>
      </div>
    </div>
  );
}
