import React from "react";
import { TrendingUp, Zap, Award, Users, BarChart3, Shield } from "lucide-react";
import { motion } from "framer-motion";

const LandingFeatures: React.FC = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Real-Time Bidding",
      desc: "Smart bidding engine to maximize win rate and compete effectively.",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      icon: Zap,
      title: "Order Automation",
      desc: "Streamline order management effortlessly with intelligent workflows.",
      gradient: "from-purple-500 to-purple-600",
    },
    {
      icon: Award,
      title: "Advanced Analytics",
      desc: "Revenue insights and performance dashboards to drive growth.",
      gradient: "from-orange-500 to-orange-600",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      desc: "Coordinate seamlessly with your team and manage assignments.",
      gradient: "from-green-500 to-green-600",
    },
    {
      icon: BarChart3,
      title: "Performance Tracking",
      desc: "Monitor KPIs and optimize your business operations in real-time.",
      gradient: "from-pink-500 to-pink-600",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      desc: "Enterprise-grade security with 99.9% uptime guarantee.",
      gradient: "from-indigo-500 to-indigo-600",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-block mb-4"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-600 text-sm font-semibold">
              Features
            </span>
          </motion.div>
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl mb-4">
            Why Caterers Love VendorBid
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to help you win more bids and grow your business
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              whileHover={{ 
                y: -8, 
                transition: { type: "spring", stiffness: 300, damping: 20 } 
              }}
              className="group relative"
            >
              <div className="h-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Animated gradient background on hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />
                
                <div className="relative">
                  <motion.div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 shadow-md`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>

                  {/* Animated arrow */}
                  <motion.div
                    className="mt-4 flex items-center text-orange-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    Learn more
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="ml-1"
                    >
                      →
                    </motion.span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-gray-600 text-lg mb-6">
            Trusted by over 5,000+ caterers worldwide
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.span
                key={star}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + star * 0.1 }}
              >
                <svg
                  className="w-6 h-6 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              </motion.span>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">4.9/5 rating from our users</p>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingFeatures;
