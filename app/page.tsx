"use client"

import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { ProductsSection } from "@/components/products-section"
import { StatsSection } from "@/components/stats-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { FloatingHeader } from "@/components/floating-header"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <FloatingHeader />
      <main className="pt-20 md:pt-24">
        <div className="animate-fadeIn">
          <HeroSection />
        </div>
        <div className="animate-fadeInUp delay-100">
          <StatsSection />
        </div>
        <div className="animate-fadeInUp delay-200">
          <FeaturesSection />
        </div>
        <div className="animate-fadeInUp">
          <div className="animate-fadeInUp delay-300">
            <ProductsSection />
          </div>
        </div>
        <div className="animate-fadeInUp delay-100">
          <TestimonialsSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
