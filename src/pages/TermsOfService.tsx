import { Footer } from "@/components/landing/Footer";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { motion } from "framer-motion";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <HeaderNav />
      
      <main className="container py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Terms of Service
          </h1>
          
          <div className="mt-8 space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="mt-3 leading-relaxed">
                By accessing and using Friction (www.bubulifestyle.com), you agree to comply with these Terms of Service. If you do not agree with any part of these terms, please do not use our website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Products and Pricing</h2>
              <p className="mt-3 leading-relaxed">
                Friction sells premium footwear and lifestyle accessories. We strive to display product colors and images accurately. However, actual colors may vary slightly due to monitor settings. All prices are listed in Bangladeshi Taka (BDT) and are subject to change without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Orders and Payment</h2>
              <p className="mt-3 leading-relaxed">
                We reserve the right to refuse or cancel any order. Orders are confirmed via phone call before dispatch. We accept Cash on Delivery (COD) for all orders within Bangladesh. In case of order cancellation, we will notify you via phone.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Shipping and Delivery</h2>
              <p className="mt-3 leading-relaxed">
                We deliver across Bangladesh through trusted courier partners. Delivery times vary based on location: 1-3 days inside Dhaka and 3-5 days outside Dhaka. Delivery charges apply and are displayed at checkout.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Returns and Exchanges</h2>
              <p className="mt-3 leading-relaxed">
                If you receive a defective or incorrect product, please contact us within 24 hours of delivery. Returns are accepted for manufacturing defects only. Products must be unused and in original packaging. Exchange requests are subject to stock availability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
              <p className="mt-3 leading-relaxed">
                Friction shall not be liable for any indirect, incidental, or consequential damages arising from the use of our service or products. Our liability is limited to the purchase price of the product.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Governing Law</h2>
              <p className="mt-3 leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of the People's Republic of Bangladesh. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bogura, Bangladesh.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Contact Information</h2>
              <p className="mt-3 leading-relaxed">
                For any questions regarding these terms, please contact us at{" "}
                <a href="tel:+8801929110024" className="font-medium text-primary hover:underline">
                  01929-110024
                </a>
                {" "}or visit us at Shop No #02-03, Beside of Sena Cinema Hall, Nabinagar, Savar, Dhaka, Bangladesh, 1344.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
