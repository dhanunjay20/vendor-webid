import React from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const LandingStats: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { value: "5,000+", label: "Active Vendors", suffix: "", color: "from-blue-500 to-blue-600" },
    { value: "50,000+", label: "Orders Completed", suffix: "", color: "from-purple-500 to-purple-600" },
    { value: "98%", label: "Satisfaction Rate", suffix: "", color: "from-orange-500 to-orange-600" },
    { value: "$2M+", label: "Revenue Processed", suffix: "", color: "from-green-500 to-green-600" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section className="relative bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 sm:py-16 md:py-20 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" ref={ref}>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-block mb-4"
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <span className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold shadow-lg">
              Our Impact
            </span>
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
            Trusted by Thousands
          </h2>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Join the community of successful caterers growing their business with VendorBid
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ 
                y: -10, 
                scale: 1.05,
                transition: { type: "spring", stiffness: 300, damping: 20 } 
              }}
              className="group relative"
            >
              <div className="relative h-full rounded-2xl bg-white p-6 sm:p-8 text-center shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden">
                {/* Gradient overlay on hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />
                
                {/* Animated border */}
                <motion.div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1, opacity: 0.2 }}
                  transition={{ duration: 0.3 }}
                />

                <div className="relative z-10">
                  {/* Icon/Badge */}
                  <motion.div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-4 shadow-md`}
                    animate={isInView ? {
                      rotate: [0, 360],
                    } : {}}
                    transition={{
                      delay: 0.5 + index * 0.1,
                      duration: 1,
                      ease: "easeOut",
                    }}
                  >
                    <span className="text-white text-xl font-bold">
                      {index === 0 ? "👥" : index === 1 ? "📦" : index === 2 ? "⭐" : "💰"}
                    </span>
                  </motion.div>

                  {/* Animated Counter */}
                  <motion.div
                    className={`text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent mb-2`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={isInView ? { scale: 1, rotate: 0 } : {}}
                    transition={{
                      delay: 0.3 + index * 0.1,
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                    }}
                  >
                    {stat.value}
                  </motion.div>

                  <div className="text-gray-600 font-medium text-sm sm:text-base lg:text-lg">{stat.label}</div>

                  {/* Pulse effect */}
                  <motion.div
                    className="absolute bottom-0 left-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    animate={{
                      scaleX: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Info */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white shadow-md border border-gray-200">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-2xl">🚀</span>
            </motion.div>
            <span className="text-gray-700 font-medium">
              Growing by <span className="text-orange-600 font-bold">25% month over month</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingStats;
