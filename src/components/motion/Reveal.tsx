import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
};

export function Reveal({ children, className, as = "div" }: RevealProps) {
  const Comp = as as any;
  const { ref, inView } = useInViewOnce<HTMLElement>({ rootMargin: "0px 0px -10% 0px" });

  return (
    <Comp ref={ref} className={cn("reveal", inView && "is-visible", className)}>
      {children}
    </Comp>
  );
}
