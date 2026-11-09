import featureImg from "@/assets/feature-signature-loafer.jpg";
import { Button } from "@/components/ui/button";
import { Check, Truck, ShieldCheck, RefreshCw, HeadphonesIcon } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const WHY_CHOOSE_US = [
  {
    icon: Truck,
    title: "Fast Delivery",
    desc: "Swift delivery across Bangladesh. Inside Dhaka in 24–48 hours.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payment",
    desc: "All transactions are encrypted & protected. Shop with confidence.",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    desc: "Hassle-free returns within 7 days. No questions asked.",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    desc: "Our team is always here to help you via phone or chat.",
  },
];

export function FeatureHighlight() {
  const { settings, isLoading } = useStoreSettings();
  const data = settings.signature_section;

  // Don't render if disabled
  if (!isLoading && !data.isEnabled) {
    return null;
  }

  const imageUrl = data.image || featureImg;
  const features = data.features?.length > 0 ? data.features : [
    "Genuine leather upper",
    "Memory foam insole",
    "Anti-slip rubber sole",
    "Lightweight & breathable",
  ];

  return (
    <>
      {/* Why Choose Us Section */}
      <section className="py-14 md:py-20 bg-muted/30" id="why-us">
        <div className="container">
          <div className="mb-10 text-center">
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-bubu-red mb-3">Our Promise</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">Why Choose Us</h2>
            <div className="mx-auto mt-4 h-0.5 w-12 bg-bubu-red rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {WHY_CHOOSE_US.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-elegant hover:-translate-y-1.5 transition-all duration-300"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground mb-1.5">{title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signature Feature Section */}
      <section className="py-14 md:py-20 bg-background" id="smart">
        <div className="container">
          <div className="grid items-center gap-10 rounded-3xl border border-border/60 bg-card p-7 shadow-soft md:grid-cols-12 md:p-10 overflow-hidden">
            <div className="md:col-span-6">
              <div className="relative overflow-hidden rounded-2xl shadow-elegant">
                <img
                  src={imageUrl}
                  alt={data.title || "Signature product"}
                  className="h-[380px] md:h-[460px] w-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
            </div>

            <div className="md:col-span-6">
              <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-bubu-red mb-3">
                {data.badge || "Signature Drop"}
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {data.title || "The Classic Signature Loafer"}
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {data.desc || "Timeless elegance meets everyday comfort. Handcrafted from premium leather for the modern gentleman."}
              </p>

              <ul className="mt-6 grid gap-3">
                {features.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bubu-red/10">
                      <Check className="h-3.5 w-3.5 text-bubu-red" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm text-foreground/80">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-end justify-between gap-4 border-t border-border pt-6">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Starting at</div>
                  <div className="text-3xl font-bold tracking-tight text-foreground">৳ {data.price || "2,500"}</div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  Free laces<br />Gift box included
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button variant="brand" size="lg" asChild>
                  <a href={data.link || "#"}>Buy Now</a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#deals">View Details</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
