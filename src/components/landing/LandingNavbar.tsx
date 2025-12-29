import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat } from "lucide-react";
import BidzaroLogo from "@/assets/bidzaro_logo1.png";
import { motion } from "framer-motion";

const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 bg-white ${scrolled ? "shadow-md" : "shadow-sm"}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
          >
            <img src={BidzaroLogo} alt="Bidzaro" className="h-8" />
          </motion.div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <motion.button
              onClick={() => navigate("/auth?mode=register")}
              className="px-4 sm:px-6 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition shadow-md text-sm sm:text-base"
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.12)" }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default LandingNavbar;
