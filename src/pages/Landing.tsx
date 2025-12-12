import React from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingStats from "@/components/landing/LandingStats";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600">
      <LandingNavbar />
      <LandingHero />
      <LandingFeatures />
      <LandingStats />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
};

export default Landing;
