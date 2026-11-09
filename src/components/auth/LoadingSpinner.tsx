import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  return (
    <Loader2 className={cn("animate-spin", sizeMap[size], className)} />
  );
};
