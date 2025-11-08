import HeroSection from "@/components/landing/HeroSection";
import SocialProof from "@/components/landing/SocialProof";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import LeaderboardPreview from "@/components/landing/LeaderboardPreview";
import Testimonials from "@/components/landing/Testimonials";
import Benefits from "@/components/landing/Benefits";
import ClubsPromo from "@/components/landing/ClubsPromo";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <HeroSection />
      <SocialProof />
      <FeaturesGrid />
      <LeaderboardPreview />
      <Testimonials />
      <Benefits />
      <ClubsPromo />
      <FinalCTA />
      <Footer />
    </div>
  );
}

