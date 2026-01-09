import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions | Efficiency",
  description: "Terms and Conditions for Efficiency - Transfer Agent Services",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/">
            <div className="relative w-[200px] h-12 mb-8">
              <Image
                src="/logo.png"
                fill
                alt="Efficiency"
                className="object-contain"
                priority
                sizes="200px"
              />
            </div>
          </Link>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms and Conditions</h1>
          <p className="text-muted-foreground mb-8">Last Updated: July 28, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using the services provided by Efficiency ("we," "us," or "our"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">Efficiency provides investor relations, capital markets, and transfer agent services, including but not limited to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Transfer agent services and shareholder record keeping</li>
              <li>Securities transaction processing and certificate management</li>
              <li>Dividend distribution and corporate actions coordination</li>
              <li>Investor relations management and communication</li>
              <li>Capital markets advisory services</li>
              <li>Financial technology solutions</li>
              <li>Regulatory compliance support</li>
              <li>Market analysis and reporting</li>
              <li>Proxy voting and shareholder communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Eligibility</h2>
            <p className="text-muted-foreground">
              You must be at least 18 years old to use our services. By using our services, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Account Registration and Security</h2>
            <p className="text-muted-foreground">
              When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Privacy Policy</h2>
            <p className="text-muted-foreground">
              Your privacy is important to us. Please review our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, which also governs your use of our services, to understand our practices regarding the collection and use of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Transfer Agent Services</h2>
            <p className="text-muted-foreground mb-4">As a registered transfer agent, Efficiency provides essential services for companies issuing securities, including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Record Keeping:</strong> Maintaining accurate master shareholder registers and ownership records</li>
              <li><strong>Transaction Processing:</strong> Handling the mechanics of securities transfers, purchases, and sales</li>
              <li><strong>Certificate Management:</strong> Issuing, replacing, and managing physical stock certificates</li>
              <li><strong>Dividend Distribution:</strong> Calculating and distributing dividend payments to shareholders</li>
              <li><strong>Corporate Actions:</strong> Coordinating mergers, acquisitions, stock splits, and other corporate events</li>
              <li><strong>Regulatory Compliance:</strong> Ensuring adherence to SEC and other regulatory requirements</li>
              <li><strong>Shareholder Communications:</strong> Managing proxy voting and investor communications</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Our transfer agent services are designed to modernize traditional processes, eliminating the need for medallion guarantees and providing faster, more efficient transaction processing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Financial Services Disclaimer</h2>
            <p className="text-muted-foreground">
              Our services are for informational and advisory purposes only. We do not provide investment advice, and any information provided should not be considered as such. Investment decisions should be made in consultation with qualified financial advisors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Intellectual Property Rights</h2>
            <p className="text-muted-foreground">
              The content, features, and functionality of our services are owned by Efficiency and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Prohibited Uses</h2>
            <p className="text-muted-foreground mb-4">You may not use our services:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
              <li>To upload or transmit viruses or any other type of malicious code</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall Efficiency, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to defend, indemnify, and hold harmless Efficiency and its affiliates from and against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses arising from your use of our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account and bar access to our services immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be interpreted and governed by the laws of the State of California, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground mb-4">If you have any questions about these Terms and Conditions, please contact us at:</p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> info@useefficiency.com</li>
              <li><strong>Phone:</strong> (415) 340-6708</li>
              <li><strong>Address:</strong> 415 Mission St, San Francisco, CA</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">16. Severability</h2>
            <p className="text-muted-foreground">
              If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law and the remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">17. Entire Agreement</h2>
            <p className="text-muted-foreground">
              These Terms constitute the entire agreement between you and Efficiency regarding the use of our services, superseding any prior agreements between you and Efficiency relating to your use of our services.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
