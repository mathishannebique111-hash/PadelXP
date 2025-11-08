import ClubsHeroSection from "@/components/landing/clubs/ClubsHeroSection";
import ProblemSolution from "@/components/landing/clubs/ProblemSolution";
import FeaturesDetailed from "@/components/landing/clubs/FeaturesDetailed";
import Pricing from "@/components/landing/clubs/Pricing";
import FAQ from "@/components/landing/clubs/FAQ";
import Footer from "@/components/landing/Footer";

export default function ClubsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <ClubsHeroSection />
      <ProblemSolution />
      <FeaturesDetailed />
      <FAQ />
      <Pricing />
      <Footer />
    </div>
  );
}

