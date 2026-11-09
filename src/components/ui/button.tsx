import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-[transform,box-shadow,background-color,color,border-color] duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero:
          "bg-primary text-primary-foreground shadow-elegant hover:bg-gold hover:text-gold-foreground hover:shadow-soft hover:-translate-y-0.5 hover:scale-105",
        brand:
          "bg-primary text-primary-foreground shadow-elegant hover:bg-primary/90 hover:shadow-soft hover:-translate-y-0.5",
        cart:
          "border-2 border-primary bg-transparent text-primary shadow-soft hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground hover:-translate-y-0.5",
        "outline-gold":
          "border-2 border-gold/60 bg-transparent text-foreground hover:bg-gold hover:text-gold-foreground active:bg-gold active:text-gold-foreground",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4",
        lg: "h-11 px-7 text-[0.95rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
