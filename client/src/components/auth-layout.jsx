"use client"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Leaf } from "lucide-react"
export function AuthLayout({ children, title, description }) {
  return (
    <div className="flex min-h-screen bg-green-50/30">
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-600 text-white">
                <Leaf className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold text-green-900">Grainlyy</div>
            </Link>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <h2 className="text-3xl font-bold tracking-tight text-green-900">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </motion.div>
          </div>
          {children}
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 h-full w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/20 to-green-900/40 z-10" />
          <Image
            className="h-full w-full object-contain"
            src="/image3.png"
            alt="Green technology illustration"
            width={1920}
            height={1080}
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 p-12 z-20">
            <blockquote className="space-y-2">
              <p className="text-lg text-white">
                "Sustainable practices today for a greener tomorrow. Join us in our mission to create a more
                environmentally conscious world."
              </p>
              <footer className="text-sm text-white/70">Grainlyy Initiative</footer>
            </blockquote>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
