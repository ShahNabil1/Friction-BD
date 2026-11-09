import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const PasswordInput = ({ className, ...props }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn(
          "pr-12 transition-all duration-200",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        <div className="relative w-5 h-5">
          <Eye 
            className={cn(
              "w-5 h-5 absolute inset-0 transition-all duration-200",
              showPassword ? "opacity-0 scale-75" : "opacity-100 scale-100"
            )} 
          />
          <EyeOff 
            className={cn(
              "w-5 h-5 absolute inset-0 transition-all duration-200",
              showPassword ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )} 
          />
        </div>
      </button>
    </div>
  );
};
