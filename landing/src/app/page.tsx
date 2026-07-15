import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { HowItWorks } from "@/components/HowItWorks";
import { AnalysisPreview } from "@/components/AnalysisPreview";
import { FeatureSection } from "@/components/FeatureSection";
import { PersonalizationSection } from "@/components/PersonalizationSection";
import { TrustSection } from "@/components/TrustSection";
import { WaitlistSection } from "@/components/WaitlistSection";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-cream-50">
      <SiteHeader />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <AnalysisPreview />
        <FeatureSection />
        <PersonalizationSection />
        <TrustSection />
        <WaitlistSection />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
