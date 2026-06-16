import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Privacy Policy</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 max-w-2xl mx-auto prose prose-sm dark:prose-invert pb-28">
        <p className="text-muted-foreground text-sm mb-6">
          Last updated: January 22, 2026
        </p>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            We collect information you provide directly to us, including:
          </p>
          <ul className="text-muted-foreground text-sm leading-relaxed list-disc pl-5 space-y-2">
            <li>Account information (name, email, password)</li>
            <li>Profile data (age, height, weight, fitness goals)</li>
            <li>Health and fitness data (workouts, meals, sleep, activity)</li>
            <li>Community content (posts, comments, messages)</li>
            <li>Device and usage information</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
          <ul className="text-muted-foreground text-sm leading-relaxed list-disc pl-5 space-y-2">
            <li>Provide personalized fitness and nutrition recommendations</li>
            <li>Track your progress and achievements</li>
            <li>Improve our AI coaching algorithms</li>
            <li>Send relevant notifications and updates</li>
            <li>Ensure the security and integrity of our services</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">3. Data Storage and Security</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your data is stored securely using industry-standard encryption and security practices. 
            We use secure cloud infrastructure and implement appropriate technical and organizational 
            measures to protect your personal information.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">4. Data Sharing</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            We do not sell your personal information. We may share your data in the following circumstances:
          </p>
          <ul className="text-muted-foreground text-sm leading-relaxed list-disc pl-5 space-y-2">
            <li>With your consent</li>
            <li>With service providers who assist in operating our services</li>
            <li>When required by law or to protect our rights</li>
            <li>In connection with a business transfer or acquisition</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">5. Your Rights</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            You have the right to:
          </p>
          <ul className="text-muted-foreground text-sm leading-relaxed list-disc pl-5 space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">6. Cookies and Tracking</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
            and deliver personalized content. You can manage your cookie preferences through your 
            browser settings.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">7. Children's Privacy</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Our services are not intended for children under 18 years of age. We do not knowingly 
            collect personal information from children.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">8. Changes to This Policy</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">9. Contact Us</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:privacy@hiit.ai" className="text-primary hover:underline">
              privacy@hiit.ai
            </a>
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}