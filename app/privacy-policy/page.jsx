import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Efficiency",
  description: "Privacy Policy for Efficiency - Transfer Agent Services",
};

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: July 28, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              Efficiency ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services, including our transfer agent services, investor relations platform, and capital markets solutions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium text-foreground mb-3">2.1 Personal Information</h3>
            <p className="text-muted-foreground mb-4">We may collect the following types of personal information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Contact Information:</strong> Name, email address, phone number, mailing address</li>
              <li><strong>Account Information:</strong> Username, password, account preferences</li>
              <li><strong>Financial Information:</strong> Shareholder records, transaction history, dividend information</li>
              <li><strong>Corporate Information:</strong> Company details, tax identification numbers, regulatory filings</li>
              <li><strong>Professional Information:</strong> Job title, company affiliation, industry</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.2 Technical Information</h3>
            <p className="text-muted-foreground mb-4">We automatically collect certain technical information when you use our services:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent on site, click patterns</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies, analytics cookies, preference cookies</li>
              <li><strong>Log Files:</strong> Server logs, error logs, access logs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Service Provision:</strong> To provide and maintain our transfer agent and financial services</li>
              <li><strong>Account Management:</strong> To create and manage your account, process transactions</li>
              <li><strong>Communication:</strong> To send important updates, notifications, and respond to inquiries</li>
              <li><strong>Compliance:</strong> To meet regulatory requirements and legal obligations</li>
              <li><strong>Security:</strong> To protect against fraud, unauthorized access, and security threats</li>
              <li><strong>Improvement:</strong> To enhance our services, develop new features, and improve user experience</li>
              <li><strong>Analytics:</strong> To analyze usage patterns and optimize our platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-muted-foreground mb-4">We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Service Providers:</strong> With trusted third-party vendors who assist in providing our services</li>
              <li><strong>Regulatory Authorities:</strong> When required by law, regulation, or legal process</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
              <li><strong>Security:</strong> To protect our rights, property, or safety, or that of our users</li>
              <li><strong>Consent:</strong> With your explicit consent for specific purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
            <p className="text-muted-foreground mb-4">We implement appropriate technical and organizational measures to protect your information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Encryption:</strong> Data is encrypted in transit and at rest using industry-standard protocols</li>
              <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms</li>
              <li><strong>Regular Audits:</strong> Regular security assessments and vulnerability testing</li>
              <li><strong>Employee Training:</strong> Ongoing security training for all employees</li>
              <li><strong>Incident Response:</strong> Comprehensive incident response and breach notification procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground mb-4">We retain your information for as long as necessary to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide our services and maintain your account</li>
              <li>Comply with legal and regulatory requirements</li>
              <li>Resolve disputes and enforce our agreements</li>
              <li>Protect against fraud and security threats</li>
            </ul>
            <p className="text-muted-foreground mt-4">When we no longer need your information, we will securely delete or anonymize it.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground mb-4">We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Remember your preferences and settings</li>
              <li>Analyze website usage and performance</li>
              <li>Provide personalized content and advertisements</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
            <p className="text-muted-foreground mt-4">You can control cookie settings through your browser preferences, though disabling certain cookies may affect service functionality.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground mb-4">Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers, including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Standard contractual clauses approved by regulatory authorities</li>
              <li>Adequacy decisions by relevant data protection authorities</li>
              <li>Other appropriate safeguards as required by applicable law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected such information, we will take steps to delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground mb-4">We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Posting the updated policy on our website</li>
              <li>Sending email notifications to registered users</li>
              <li>Displaying prominent notices on our platform</li>
            </ul>
            <p className="text-muted-foreground mt-4">Your continued use of our services after such changes constitutes acceptance of the updated policy.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground mb-4">If you have any questions about this Privacy Policy or our data practices, please contact us at:</p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> info@useefficiency.com</li>
              <li><strong>Phone:</strong> (415) 340-6708</li>
              <li><strong>Address:</strong> 415 Mission St, San Francisco, CA</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Data Protection Officer</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries, you may also contact our Data Protection Officer at the same contact information above.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Regulatory Compliance</h2>
            <p className="text-muted-foreground mb-4">This Privacy Policy complies with applicable data protection laws and regulations, including but not limited to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>California Consumer Privacy Act (CCPA)</li>
              <li>General Data Protection Regulation (GDPR)</li>
              <li>Gramm-Leach-Bliley Act (GLBA)</li>
              <li>Other applicable federal and state privacy laws</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms-and-conditions" className="hover:text-foreground transition-colors">
              Terms and Conditions
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
