import PlayerHeroSection from "@/components/landing/PlayerHeroSection";
import SocialProof from "@/components/landing/SocialProof";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import LeaderboardPreview from "@/components/landing/LeaderboardPreview";
import Testimonials from "@/components/landing/Testimonials";
import Benefits from "@/components/landing/Benefits";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import AuthRedirectHandler from "@/components/AuthRedirectHandler";
import HideSplashScreen from "@/components/HideSplashScreen";

export default function PlayersHome() {
    return (
        <div className="min-h-screen bg-black text-white">
            <HideSplashScreen />
            <AuthRedirectHandler />
            <PlayerHeroSection />
            <SocialProof />
            <FeaturesGrid />
            <LeaderboardPreview />
            <Testimonials />
            <Benefits />
            <FinalCTA />
            <Footer />
        </div>
    );
}
