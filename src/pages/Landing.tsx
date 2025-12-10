import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  ChefHat,
  TrendingUp,
  Users,
  Award,
  Clock,
  Shield,
} from "lucide-react";
import { motion, Variants } from "framer-motion";

const Landing = () => {
  const navigate = useNavigate();

  const sectionFade: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        delay,
      },
    }),
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 25, scale: 0.97 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        delay: 0.1 + i * 0.08,
      },
    }),
  };

  const statVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 120,
        damping: 14,
        delay: 0.2 + i * 0.1,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 relative overflow-hidden">
      {/* Soft animated blobs */}
      <motion.div
        className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, delay: 0.2, ease: "easeOut" }}
      />

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-orange-100/60 z-50"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.02 }}
            >
              <ChefHat className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                VendorBid
              </span>
            </motion.div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth?mode=login")}
                className="text-gray-700 hover:text-orange-600 transition-all hover:-translate-y-0.5"
              >
                Login
              </Button>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={() => navigate("/auth?mode=register")}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-500/30"
                >
                  Get Started
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={sectionFade}
            custom={0.1}
          >
            {/* Glow behind title */}
            <motion.div
              className="pointer-events-none absolute inset-x-0 -top-6 mx-auto h-32 max-w-xl bg-gradient-to-r from-orange-200/50 via-amber-100/40 to-orange-200/40 blur-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3 }}
            />
            <motion.h1
              className="relative text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            >
              Revolutionize Your{" "}
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Catering Business
              </span>
            </motion.h1>
            <motion.p
              className="relative text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            >
              Join the leading platform connecting caterers with event
              organizers. Bid on events, manage orders, and grow your business
              with powerful analytics.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth?mode=register")}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-lg px-8 py-6 shadow-xl shadow-orange-500/30"
                >
                  Start Free Trial
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth?mode=login")}
                  className="border-2 border-orange-600 text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
                >
                  Sign In
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={sectionFade}
            custom={0.1}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose VendorBid?
            </h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              Everything you need to manage and grow your catering business in
              one powerful platform
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "Real-Time Bidding",
                desc: "Compete for lucrative catering contracts with our intelligent bidding system. Get instant notifications and never miss an opportunity.",
                bg: "bg-orange-100",
                color: "text-orange-600",
              },
              {
                icon: Users,
                title: "Order Management",
                desc: "Streamline your operations with comprehensive order tracking, customer management, and automated workflows.",
                bg: "bg-amber-100",
                color: "text-amber-600",
              },
              {
                icon: Award,
                title: "Advanced Analytics",
                desc: "Make data-driven decisions with detailed insights into revenue, popular items, and customer trends.",
                bg: "bg-orange-100",
                color: "text-orange-600",
              },
              {
                icon: Clock,
                title: "24/7 Support",
                desc: "Our dedicated support team is always available to help you succeed. Get answers when you need them.",
                bg: "bg-amber-100",
                color: "text-amber-600",
              },
              {
                icon: Shield,
                title: "Secure Payments",
                desc: "Rest easy with enterprise-grade security and encrypted payment processing. Your data is always protected.",
                bg: "bg-orange-100",
                color: "text-orange-600",
              },
              {
                icon: ChefHat,
                title: "Menu Builder",
                desc: "Create and manage your menu with ease. Update prices, add photos, and showcase your specialties.",
                bg: "bg-amber-100",
                color: "text-amber-600",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={cardVariants}
              >
                <Card className="p-6 hover:shadow-xl transition-all border-2 hover:border-orange-200/70 bg-gradient-to-br from-white to-orange-50/40 hover:-translate-y-1">
                  <div
                    className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-600 to-amber-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            {[
              { label: "Active Vendors", value: "5,000+" },
              { label: "Orders Completed", value: "50,000+" },
              { label: "Satisfaction Rate", value: "98%" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={statVariants}
              >
                <div className="text-5xl font-bold mb-2 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xl opacity-90">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={sectionFade}
          custom={0.1}
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of successful caterers already using VendorBid
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              onClick={() => navigate("/auth?mode=register")}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-lg px-8 py-6 shadow-xl shadow-orange-500/30"
            >
              Get Started Today
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-7xl mx-auto text-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ChefHat className="h-6 w-6 text-orange-600" />
            <span className="text-xl font-bold text-white">VendorBid</span>
          </div>
          <p className="mb-4">© 2025 VendorBid. All rights reserved.</p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="#" className="hover:text-orange-400 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-orange-400 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-orange-400 transition-colors">
              Contact
            </a>
          </div>
        </motion.div>
      </footer>
    </div>
  );
};

export default Landing;
