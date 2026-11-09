import { Facebook, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import bubuLogoWhite from "@/assets/bubu-logo-white.png";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container max-w-7xl py-14 lg:py-20">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <img
              src={bubuLogoWhite}
              alt="Friction"
              className="h-12 w-auto object-contain mb-5"
            />
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              Your go-to destination for premium footwear with authentic quality and fast delivery across Bangladesh.
            </p>

            <div className="mt-6 space-y-3">
              <a href="tel:+8801929110024" className="flex items-center gap-3 text-sm text-primary-foreground/70 hover:text-bubu-green transition-colors">
                <Phone className="h-4 w-4 text-bubu-green shrink-0" />
                01929-110024
              </a>
              <div className="flex items-start gap-3 text-sm text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-bubu-green shrink-0 mt-0.5" />
                <span>Shop No #02-03, Beside of Sena Cinema Hall, Nabinagar, Savar, Dhaka, Bangladesh, 1344</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-5">Quick Links</h3>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><Link to="/categories" className="hover:text-bubu-green transition-colors">All Products</Link></li>
              <li><Link to="/brands" className="hover:text-bubu-green transition-colors">Brands</Link></li>
              <li><Link to="/track-order" className="hover:text-bubu-green transition-colors">Track Order</Link></li>
              <li><a href="#deals" className="hover:text-bubu-green transition-colors">New Arrivals</a></li>
              <li><a href="#offers" className="hover:text-bubu-green transition-colors">Offers & Deals</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-5">Customer Service</h3>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><a href="#" className="hover:text-bubu-green transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-bubu-green transition-colors">Shipping & Delivery</a></li>
              <li><a href="#" className="hover:text-bubu-green transition-colors">Returns & Exchanges</a></li>
              <li><Link to="/privacypolicy" className="hover:text-bubu-green transition-colors">Privacy Policy</Link></li>
              <li><Link to="/termsofservice" className="hover:text-bubu-green transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-5">Follow Us</h3>
            <p className="text-sm text-primary-foreground/70 mb-5 leading-relaxed">
              Stay connected for the latest collections, offers, and lifestyle inspiration.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61590861472459"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary-foreground/20 bg-white/5 hover:bg-[#1877F2]/20 hover:border-[#1877F2]/50 transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5 text-primary-foreground/70 group-hover:text-[#1877F2] transition-colors" />
              </a>
              <a
                href="https://wa.me/8801929110024"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary-foreground/20 bg-white/5 hover:bg-[#25D366]/20 hover:border-[#25D366]/50 transition-all duration-300"
                aria-label="WhatsApp"
              >
                <svg className="h-5 w-5 text-primary-foreground/70 group-hover:text-[#25D366] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-primary-foreground/15 pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-primary-foreground/50 text-center sm:text-left">
            © {new Date().getFullYear()} Friction. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-primary-foreground/50">
            <Link to="/privacypolicy" className="hover:text-primary-foreground/80 transition-colors">Privacy</Link>
            <span>·</span>
            <Link to="/termsofservice" className="hover:text-primary-foreground/80 transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Developer Credit Strip */}
      <div className="border-t border-primary-foreground/10 bg-black/30">
        <div className="container max-w-7xl py-4">
          <a
            href="https://www.shahnabil.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.25em] text-primary-foreground/40 transition-colors hover:text-[hsl(var(--bubu-red))]"
          >
            <span className="h-px w-8 bg-primary-foreground/20 transition-colors group-hover:bg-[hsl(var(--bubu-red))]" />
            <span>Crafted by</span>
            <span className="font-bold text-primary-foreground/80 transition-colors group-hover:text-[hsl(var(--bubu-red))]">
              Shahriar Nabil
            </span>
            <span className="h-px w-8 bg-primary-foreground/20 transition-colors group-hover:bg-[hsl(var(--bubu-red))]" />
          </a>
        </div>
      </div>
    </footer>
  );
}
