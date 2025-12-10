import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import HeroArt from "@/assets/landing-hero-art.png";

const LandingHero: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 },
    },
  };

  const stats = [
    { value: "5k+", label: "Vendors" },
    { value: "50k+", label: "Orders" },
    { value: "98%", label: "Satisfaction" },
  ];

  return (
    <section className="relative bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600 py-20 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-800/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left Content */}
          <motion.div
            className="space-y-6 z-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur border border-white/30">
                <span className="text-sm font-medium">✨ NEW</span>
                <span className="text-sm">14-day free trial</span>
              </div>
            </motion.div>

            <motion.h1 
              className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl"
              variants={itemVariants}
            >
              Manage teams, tasks and orders{" "}
              <span className="relative inline-block">
                <span className="relative z-10">faster than ever</span>
                <motion.span
                  className="absolute bottom-2 left-0 w-full h-3 bg-white/30 -z-0"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1, duration: 0.8 }}
                />
              </span>
            </motion.h1>

            <motion.p 
              className="max-w-xl text-lg opacity-95 leading-relaxed"
              variants={itemVariants}
            >
              VendorBid connects caterers with event organizers. Smart bidding, order automation and analytics all in one platform.
            </motion.p>

            <motion.div 
              className="flex flex-col gap-4 sm:flex-row sm:items-center"
              variants={itemVariants}
            >
              <motion.button
                onClick={() => navigate("/auth?mode=register")}
                className="rounded-lg bg-white px-8 py-3 font-semibold text-orange-600 hover:bg-orange-50 transition shadow-lg"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
                whileTap={{ scale: 0.95 }}
              >
                Start Free Trial
              </motion.button>
              <motion.button
                onClick={() => navigate("/auth?mode=login")}
                className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white hover:bg-white/10 transition"
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                whileTap={{ scale: 0.95 }}
              >
                Sign In
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div 
              className="grid grid-cols-3 gap-4 pt-8"
              variants={itemVariants}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="rounded-lg bg-white/10 p-4 backdrop-blur border border-white/20"
                  whileHover={{ 
                    scale: 1.05, 
                    backgroundColor: "rgba(255,255,255,0.2)",
                    transition: { duration: 0.2 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                >
                  <motion.div 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2 + index * 0.1, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-sm opacity-90">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            className="flex justify-center lg:justify-end z-10 items-center"
            initial={{ opacity: 0, x: 100, rotate: -5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 80 }}
          >
            <motion.div 
              className="w-full max-w-md transform lg:translate-x-6 flex items-center justify-center"
              whileHover={{ scale: 1.02, rotate: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.img 
                src={HeroArt} 
                alt="Hero" 
                className="w-full rounded-lg object-contain h-auto max-h-[520px]"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
