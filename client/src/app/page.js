"use client";

import { motion } from "framer-motion";
import {
  Check,
  Database,
  Globe,
  Lock,
  MapPin,
  Shield,
  Truck,
  Users,
  Leaf,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Grid Background */}
      <section className="relative bg-gradient-to-br from-green-900 to-emerald-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-12 h-full">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className="border border-emerald-700/20"></div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="z-10">
          {/* <header className="fixed top-5 left-50 container mx-auto px-4 py-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Link href="/" className="flex items-center gap-2">
              <Database className="h-6 w-6 text-green-400" />
              <span className="font-bold text-xl">Grainlyy</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm hover:text-green-300 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm hover:text-green-300 transition-colors">
                How It Works
              </Link>
              <Link href="#stakeholders" className="text-sm hover:text-green-300 transition-colors">
                Stakeholders
              </Link>
              <Link href="#faq" className="text-sm hover:text-green-300 transition-colors">
                FAQ
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm rounded-md border border-emerald-700 hover:bg-emerald-700/30 transition-colors"
              >
                Log In
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="px-4 py-2 text-sm rounded-md bg-green-500 hover:bg-green-400 text-emerald-900 font-medium transition-colors">
                  Get Started
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Get started as</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/signup/delivery" className="w-full">
                    <DropdownMenuItem className="cursor-pointer">
                      Delivery
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/signup/vendor" className="w-full">
                    <DropdownMenuItem className="cursor-pointer">
                      Vendor
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/signup/ngo" className="w-full">
                    <DropdownMenuItem className="cursor-pointer">
                      NGO
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/signup/consumer" className="w-full">
                    <DropdownMenuItem className="cursor-pointer">
                      Consumer
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header> */}
          <header className="shadow-2xl fixed left-50 top-5 w-[80%] mx-auto px-5 rounded-xl border-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-[101] text-black">
            <div className=" flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2">
                  <Image
                    src="/image2.png"
                    alt="Grainlyy Logo"
                    width={100}
                    height={100}
                    className="w-full h-full mt-1"
                  />
                </Link>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="#features"
                  className="text-sm font-medium hover:text-green-600 transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="#how-it-works"
                  className="text-sm font-medium hover:text-green-600 transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  href="#stakeholders"
                  className="text-sm font-medium hover:text-green-600 transition-colors"
                >
                  Stakeholders
                </Link>
                <Link
                  href="#faq"
                  className="text-sm font-medium hover:text-green-600 transition-colors"
                >
                  FAQ
                </Link>
              </nav>
              <div className="flex items-center gap-4">
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="hidden md:flex hover:cursor-pointer"
                  >
                    Log In
                  </Button>
                </Link>
                {/* <Button className="bg-green-600 hover:bg-green-800">
              Get Started
            </Button> */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="bg-green-600 px-5 py-1.5 rounded-sm text-white hover:bg-green-700 hover:cursor-pointer">
                    Get Started
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Get started as</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/signup/delivery" className="w-full">
                      <DropdownMenuItem className="cursor-pointer">
                        Delivery
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/signup/vendor" className="w-full">
                      <DropdownMenuItem className="cursor-pointer">
                        Vendor
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/signup/ngo" className="w-full">
                      <DropdownMenuItem className="cursor-pointer">
                        NGO
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/signup/consumer" className="w-full">
                      <DropdownMenuItem className="cursor-pointer">
                        Consumer
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 pt-32 pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div
                variants={fadeIn}
                className="inline-block px-3 py-1 text-xs bg-emerald-700/50 rounded-full"
              >
                Blockchain-Powered Public Distribution
              </motion.div>

              <motion.h1
                variants={fadeIn}
                className="text-4xl md:text-6xl font-bold leading-tight"
              >
                Transforming Public Distribution
                <br />
                With Blockchain
              </motion.h1>

              <motion.p
                variants={fadeIn}
                className="text-emerald-100 max-w-2xl mx-auto"
              >
                Making government ration delivery transparent, tamper-proof, and
                publicly verifiable through blockchain technology.
              </motion.p>

              <motion.div
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4 justify-center pt-6"
              >
                <Link
                  href="#"
                  className="px-6 py-3 bg-green-100 text-emerald-900 font-medium rounded-md hover:bg-green-300 transition-colors"
                >
                  Learn More
                </Link>
                <Link
                  href="#"
                  className="px-6 py-3 bg-emerald-800 border border-emerald-700 rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Get Started
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* User Count Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute bottom-12 left-12 bg-white text-black rounded-lg p-3 shadow-lg hidden md:block"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-800">
                Deliveries Tracked
              </span>
            </div>
            <div className="font-bold text-2xl">20K+</div>
          </motion.div>

          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute bottom-12 right-12 bg-emerald-800/80 rounded-full p-1 hidden md:flex"
          >
            <button className="px-4 py-1 rounded-full bg-green-400 text-emerald-900 text-sm font-medium">
              Public
            </button>
            <button className="px-4 py-1 rounded-full text-white text-sm">
              Government
            </button>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 border-b border-gray-200 pb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-6xl font-bold mb-2 text-emerald-700">
                20K<sup>+</sup>
              </h2>
              <p className="text-gray-600">
                Deliveries successfully tracked
                <br />
                across distribution networks
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center border-x border-gray-200 px-4"
            >
              <h2 className="text-6xl font-bold mb-2 text-emerald-700">
                98<span className="text-5xl">%</span>
              </h2>
              <p className="text-gray-600">
                Reduction in fraud across
                <br />
                all distribution channels
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-6xl font-bold mb-2 text-emerald-700">
                85<span className="text-5xl">%</span>
              </h2>
              <p className="text-gray-600">
                Increased transparency in
                <br />
                public distribution systems
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="inline-block px-3 py-1 text-xs bg-gray-200 rounded-full mb-4">
                Features
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Empowering Your
                <br />
                Distribution Journey
              </h2>
              <p className="text-gray-600">
                Our blockchain-based system ensures transparency and
                accountability at every step of the ration distribution process.
              </p>

              <div className="relative mt-12">
                <Image
                  src="/image.png"
                  width={300}
                  height={300}
                  alt="Blockchain distribution"
                  className="mx-auto w-full h-full rounded-2xl"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="p-2 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Lock className="text-emerald-600 h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Immutable Records
                </h3>
                <p className="text-gray-600">
                  All transactions are permanently recorded on the blockchain,
                  preventing tampering. Once recorded, delivery data cannot be
                  altered, ensuring a trustworthy system for all stakeholders.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="p-2 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <MapPin className="text-emerald-600 h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">GPS Verification</h3>
                <p className="text-gray-600">
                  Real-time location tracking ensures deliveries reach their
                  intended destinations. Our system verifies the exact location
                  of deliveries, preventing diversion of supplies.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="p-2 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Users className="text-emerald-600 h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Trust Scores</h3>
                <p className="text-gray-600">
                  Dealers receive trust scores based on their delivery
                  performance and compliance. Incentivize good behavior and
                  identify potential issues before they become problems.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-16">
            <div className="inline-block px-3 py-1 text-xs bg-gray-200 rounded-full mb-4">
              How It Works
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Your Advantages of Adopting Grainlyy
            </h2>
            <p className="text-gray-600">
              See how our blockchain solution transforms the public distribution
              system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-xl shadow-md"
            >
              <h3 className="text-xl font-semibold mb-4">
                Complete Transparency
              </h3>
              <p className="text-gray-600 mb-6">
                All stakeholders can view the entire supply chain in real-time,
                from warehouse to end recipient.
              </p>

              <h3 className="text-xl font-semibold mb-4">Fraud Prevention</h3>
              <p className="text-gray-600 mb-6">
                Immutable blockchain records and GPS verification make it
                impossible to falsify delivery data.
              </p>

              <Link
                href="#"
                className="inline-flex items-center text-emerald-700 font-medium"
              >
                VIEW DETAILS
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-emerald-50 p-8 rounded-xl"
            >
              <h3 className="text-xl font-semibold mb-4">
                Public Accountability
              </h3>
              <p className="text-gray-600 mb-6">
                Citizens can verify that government resources are being
                distributed fairly and efficiently.
              </p>

              <h3 className="text-xl font-semibold mb-4">
                Data-Driven Decisions
              </h3>
              <p className="text-gray-600 mb-6">
                Comprehensive analytics help optimize distribution routes and
                identify areas for improvement.
              </p>

              <div className="mt-6 flex justify-end">
                <div className="bg-emerald-100 rounded-xl p-4 max-w-xs">
                  <p className="text-sm font-medium">Verified Distribution</p>
                  <div className="flex mt-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex-shrink-0"></div>
                    <div className="w-8 h-8 rounded-full bg-green-400 flex-shrink-0 -ml-2"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stakeholders Section */}
      <section id="stakeholders" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-16">
            <div className="inline-block px-3 py-1 text-xs bg-gray-200 rounded-full mb-4">
              Stakeholders
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Everything Your Platform Needs
            </h2>
            <p className="text-gray-600">
              Tailored dashboards for every stakeholder in the distribution
              system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-emerald-50 p-8 rounded-xl"
            >
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Globe className="h-5 w-5 text-emerald-600" />
                Government
              </h3>
              <p className="text-gray-600 mb-6">
                Complete oversight of distribution networks with performance
                analytics and trust score monitoring.
              </p>

              <div className="flex flex-wrap gap-2">
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Complete oversight
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  Analytics
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Performance tracking
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-blue-50 p-8 rounded-xl"
            >
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Dealers
              </h3>
              <p className="text-gray-600 mb-6">
                Simplified inventory management with transparent delivery
                verification and trust score improvements.
              </p>

              <div className="flex flex-wrap gap-2">
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Inventory management
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Verification
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Trust scores
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-purple-50 p-8 rounded-xl"
            >
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Public
              </h3>
              <p className="text-gray-600 mb-6">
                Real-time delivery tracking with verification of ration quality
                and quantity, plus feedback systems.
              </p>

              <div className="flex flex-wrap gap-2">
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Real-time tracking
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  Verification
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Feedback
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-amber-50 p-8 rounded-xl"
            >
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" />
                NGOs
              </h3>
              <p className="text-gray-600 mb-6">
                Independent verification capabilities with data for advocacy and
                policy recommendations.
              </p>

              <div className="flex flex-wrap gap-2">
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Verification tools
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Advocacy
                </div>
                <div className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                  Integration
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-2xl mb-16"
          >
            <div className="inline-block px-3 py-1 text-xs bg-gray-200 rounded-full mb-4">
              Testimonials
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Showcasing Remarkable Success Stories
            </h2>
            <p className="text-gray-600">
              See how Grainlyy is transforming public distribution systems
              across regions.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold">District Officer</h4>
                  <p className="text-sm text-gray-500">Eastern Region</p>
                </div>
                <div className="flex text-emerald-500">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
              </div>
              <p className="text-gray-600">
                "Grainlyy has transformed our distribution system. We've seen a
                95% reduction in complaints and complete transparency in our
                operations."
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold">Ration Shop Owner</h4>
                  <p className="text-sm text-gray-500">Western District</p>
                </div>
                <div className="flex text-emerald-500">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
              </div>
              <p className="text-gray-600">
                "The trust score system has helped me improve my service. My
                customers now have complete faith in my shop's operations."
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-emerald-900 text-white p-6 rounded-xl shadow-sm"
            >
              <div className="mb-6">
                <div className="w-full h-40 bg-emerald-800 rounded-lg mb-4 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg w-3/4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="bg-green-400 text-emerald-900 text-center py-1 rounded-full text-sm font-medium">
                      Verified ✓
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold text-white">NGO Director</h4>
                <p className="text-sm text-emerald-200">
                  Food Security Alliance
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto mb-16 text-center">
            <div className="inline-block px-3 py-1 text-xs bg-gray-200 rounded-full mb-4">
              FAQ
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Find answers to common questions about Grainlyy's blockchain
              distribution system.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem
                value="item-1"
                className="bg-white rounded-xl shadow-sm px-6"
              >
                <AccordionTrigger className="text-lg font-medium py-4">
                  How does blockchain ensure transparency?
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-gray-600">
                  Blockchain creates an immutable, tamper-proof record of all
                  transactions. Every delivery is recorded on the blockchain
                  with timestamps, locations, and quantities, creating a
                  permanent and publicly verifiable record that cannot be
                  altered.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="bg-white rounded-xl shadow-sm px-6"
              >
                <AccordionTrigger className="text-lg font-medium py-4">
                  What hardware is required for implementation?
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-gray-600">
                  The system requires minimal hardware - just smartphones for
                  dealers and distribution centers to record deliveries and
                  verify GPS locations. Government offices and NGOs can access
                  the system through any internet-connected device.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="bg-white rounded-xl shadow-sm px-6"
              >
                <AccordionTrigger className="text-lg font-medium py-4">
                  How are trust scores calculated?
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-gray-600">
                  Trust scores are calculated based on multiple factors
                  including delivery accuracy, timeliness, customer feedback,
                  and compliance with GPS verification. The algorithm is
                  transparent and dealers can see exactly how their actions
                  affect their score.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="bg-white rounded-xl shadow-sm px-6"
              >
                <AccordionTrigger className="text-lg font-medium py-4">
                  Can the system work offline?
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-gray-600">
                  Yes, the mobile application has offline capabilities that
                  store transaction data locally until connectivity is restored.
                  Once back online, the data is synchronized with the blockchain
                  to maintain the integrity of the record.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-5"
                className="bg-white rounded-xl shadow-sm px-6"
              >
                <AccordionTrigger className="text-lg font-medium py-4">
                  How is user privacy protected?
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-gray-600">
                  While the system ensures transparency of the distribution
                  process, personal data of recipients is protected through
                  encryption and access controls. The public can verify that
                  deliveries occurred without accessing sensitive personal
                  information.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-green-900 to-emerald-800 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Transform Your Distribution System?
            </h2>
            <p className="mt-6 text-lg text-emerald-100 max-w-2xl mx-auto">
              Join the growing network of governments and organizations using
              Grainlyy to ensure transparent and efficient public distribution.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="px-6 py-3 bg-green-100 text-emerald-900 font-medium rounded-md hover:bg-green-300 transition-colors"
              >
                Request Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-6 py-3 bg-emerald-800 border border-emerald-700 rounded-md hover:bg-emerald-700 transition-colors"
              >
                Contact Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <Database className="h-6 w-6 text-emerald-700" />
                <span className="font-bold text-xl text-emerald-900">
                  Grainlyy
                </span>
              </Link>
              <p className="text-sm text-gray-600 mb-4">
                Making government ration delivery transparent, tamper-proof, and
                publicly verifiable through blockchain technology.
              </p>
              <div className="flex gap-4">
                <Link
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-emerald-100"
                >
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </Link>
                <Link
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-emerald-100"
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path>
                  </svg>
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    API
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    Guides
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-gray-600 hover:text-emerald-700"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500">
            © {new Date().getFullYear()} Grainlyy. All rights reserved.
            Blockchain-powered transparency for public distribution.
          </div>
        </div>
      </footer>
    </div>
  );
}
