import { ProductBenefit } from "@/hooks/useProducts";
import {
  ShieldCheck,
  ShieldOff,
  BadgeCheck,
  Gift,
  BoxSelect,
  RefreshCcw,
  Truck,
  CheckCircle2,
  Crown,
  LucideIcon,
} from "lucide-react";

interface BenefitMapping {
  icon: LucideIcon;
  text: string;
}

// Bengali translations with icons for known benefit titles
const benefitsMapping: Record<string, BenefitMapping> = {
  "1 Year Warranty": { icon: ShieldCheck, text: "১ বছরের ওয়ারেন্টি" },
  "No Warranty": { icon: ShieldOff, text: "ওয়ারেন্টি নেই" },
  "100% Original": { icon: BadgeCheck, text: "১০০% অরিজিনাল" },
  "Free Box & Bag": { icon: Gift, text: "সাথে ফ্রি বক্স এবং ব্যাগ" },
  "Open Box Check": { icon: BoxSelect, text: "ওপেন বক্স চেক সুবিধা" },
  "5 Days Replacement": { icon: RefreshCcw, text: "৫ দিনের রিপ্লেসমেন্ট গ্যারান্টি" },
  "7 Days Replacement": { icon: RefreshCcw, text: "৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি" },
  "Fast Delivery": { icon: Truck, text: "সারা দেশে দ্রুত ডেলিভারি" },
};

const defaultMapping: BenefitMapping = {
  icon: CheckCircle2,
  text: "",
};

interface PremiumBenefitsProps {
  benefits: ProductBenefit[];
}

export function PremiumBenefits({ benefits }: PremiumBenefitsProps) {
  if (!benefits || benefits.length === 0) return null;

  return (
    <div className="rounded-2xl border border-orange-100/50 bg-orange-50/70 p-5 shadow-sm">
      {/* Header with Crown icon */}
      <div className="mb-5 flex items-center justify-center gap-2">
        <Crown className="h-5 w-5 text-gold" fill="currentColor" />
        <span className="text-base font-bold tracking-tight text-foreground">
          Premium Benefits
        </span>
        <Crown className="h-5 w-5 text-gold" fill="currentColor" />
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {benefits.map((benefit, idx) => {
          const mapping = benefitsMapping[benefit.title] || defaultMapping;
          const Icon = mapping.icon;
          const displayText = mapping.text || benefit.title;

          return (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-lg bg-white/60 px-3 py-2.5 transition-colors hover:bg-white/80"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-maroon/10">
                <Icon className="h-4 w-4 text-maroon" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight text-gray-800">
                  {displayText}
                </span>
                {benefit.desc && (
                  <span className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {benefit.desc}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
