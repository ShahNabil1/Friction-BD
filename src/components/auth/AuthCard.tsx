import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthCard = ({ children, className }: AuthCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "w-full max-w-md bg-card rounded-2xl shadow-xl border border-primary/10 p-8 md:p-10",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
