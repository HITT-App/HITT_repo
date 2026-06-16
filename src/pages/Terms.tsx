import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Terms of Service</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 max-w-2xl mx-auto prose prose-sm dark:prose-invert pb-28">
        <p className="text-muted-foreground text-sm mb-6">
          Last updated: January 22, 2026
        </p>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            By accessing and using HIIT Fitness ("the App"), you accept and agree to be bound by the terms 
            and provision of this agreement. If you do not agree to these terms, please do not use the App.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            HIIT Fitness provides personalized fitness coaching, workout plans, nutrition guidance, and 
            health tracking features. The App uses AI technology to deliver customized recommendations 
            based on your goals and progress.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">3. User Responsibilities</h2>
          <ul className="text-muted-foreground text-sm leading-relaxed list-disc pl-5 space-y-2">
            <li>You must be at least 18 years old to use this App</li>
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>You agree to provide accurate and complete information</li>
            <li>You will not use the App for any unlawful purpose</li>
            <li>Consult a healthcare professional before starting any fitness program</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">4. Health Disclaimer</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The information provided by HIIT Fitness is for general informational purposes only and is 
            not intended as medical advice. Always consult with a qualified healthcare provider before 
            beginning any exercise or nutrition program. We are not responsible for any injuries or 
            health issues that may result from following our recommendations.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">5. Intellectual Property</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            All content, features, and functionality of the App are owned by HIIT Fitness and are 
            protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">6. Limitation of Liability</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            HIIT Fitness shall not be liable for any indirect, incidental, special, consequential, or 
            punitive damages resulting from your use of or inability to use the App.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">7. Changes to Terms</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We reserve the right to modify these terms at any time. Your continued use of the App 
            following any changes constitutes acceptance of those changes.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">8. Contact Us</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            If you have any questions about these Terms, please contact us at{' '}
            <a href="mailto:legal@hiit.ai" className="text-primary hover:underline">
              legal@hiit.ai
            </a>
          </p>
        </section>
      </div>
      </div>
    </div>
  );
}