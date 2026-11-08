import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { FeatureSection } from "@/components/FeatureSection";
import { TrustSection } from "@/components/TrustSection";
import { WaitlistSection } from "@/components/WaitlistSection";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
export default function HomePage() {
  return (
    <div className="landing-v3">
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <FeatureSection />
        <HowItWorks />
        <TrustSection />
        <WaitlistSection />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
