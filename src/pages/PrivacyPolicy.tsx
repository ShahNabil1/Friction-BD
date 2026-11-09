import { Footer } from "@/components/landing/Footer";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          
          <div className="mt-8 space-y-8 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
              <p className="mt-3 leading-relaxed">
                Welcome to Friction. We are committed to protecting your personal information and ensuring a safe shopping experience. This policy explains how we collect, use, and safeguard your data when you visit www.bubulifestyle.com.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
                <li>
                  <strong className="text-foreground">Personal Information:</strong> When you place an order, we collect your name, phone number, and shipping address to process and deliver your order within Bangladesh.
                </li>
                <li>
                  <strong className="text-foreground">Authentication Data:</strong> We use secure authentication services. We do not store your passwords.
                </li>
                <li>
                  <strong className="text-foreground">Payment Information:</strong> We primarily accept Cash on Delivery (COD). Any digital payment details are processed securely by our payment partners.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <p className="mt-3 leading-relaxed">We use your data to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
                <li>Process and deliver your orders across Bangladesh.</li>
                <li>Contact you regarding order updates and delivery status.</li>
                <li>Improve our website and customer experience.</li>
                <li>Ensure website security and prevent fraud.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
              <p className="mt-3 leading-relaxed">
                We do not sell your personal data. We only share necessary information with trusted third parties for:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
                <li>Courier and delivery services (Steadfast, Pathao, etc.).</li>
                <li>Payment processing when applicable.</li>
                <li>Legal compliance if required by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Contact Us</h2>
              <p className="mt-3 leading-relaxed">
                If you have questions about this policy, please contact us:
              </p>
              <ul className="mt-3 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-foreground">Phone:</strong>{" "}
                  <a href="tel:+8801929110024" className="font-medium text-primary hover:underline">
                    01929-110024
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Address:</strong> Shop No #02-03, Beside of Sena Cinema Hall, Nabinagar, Savar, Dhaka, Bangladesh, 1344
                </li>
              </ul>
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
