"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Star, Download, Users } from 'lucide-react'
import Link from "next/link"
import dynamic from "next/dynamic"

// Lazy load Three.js components để tối ưu performance
const ThreeDFallback = dynamic(
  () => import("@/components/3d-fallback").then(mod => ({ default: mod.ThreeDFallback })),
  { ssr: false }
)

const ThreeJSBackground = dynamic(
  () => import("@/components/three-js-background").then(mod => ({ default: mod.ThreeJSBackground })),
  { 
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-gradient-to-b from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900" />
  }
)

export function HeroSection() {
  const [currentText, setCurrentText] = useState(0)
  const texts = ["Mã nguồn chất lượng cao", "Giá cả phải chăng", "Hỗ trợ 24/7", "Cập nhật liên tục"]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentText((prev) => (prev + 1) % texts.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [texts.length])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-gray-900">
      {/* 3D Background */}
      <div className="absolute inset-0">
        <ThreeJSBackground />
        <ThreeDFallback />
      </div>

      <div className="relative z-10 container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto hero-responsive">
          {/* Badge */}
          <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full glass-card animate-fade-in-down hover-lift mb-6 sm:mb-8">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 mr-2 animate-pulse-glow" />
            <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-medium">Marketplace mã nguồn #1 Việt Nam</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 animate-fade-in-up delay-100">
            <span className="bg-gradient-to-r from-gray-900 via-purple-600 to-pink-600 dark:from-white dark:via-purple-200 dark:to-pink-200 bg-clip-text text-transparent animate-gradient">
              Qtusdev
            </span>
            <br />
            <span className="text-gray-900 dark:text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl animate-fade-in-up delay-200">
              Source Marketplace
            </span>
          </h1>

          {/* Animated Subheading */}
          <div className="h-12 sm:h-14 md:h-16 mb-6 sm:mb-8 flex items-center justify-center">
            <p 
              key={currentText}
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 animate-fade-in-up animate-gradient bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent font-semibold"
            >
              {texts[currentText]}
            </p>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0 animate-fade-in-up delay-300">
            Khám phá hàng nghìn mã nguồn chất lượng cao từ các developer hàng đầu. Từ website, ứng dụng mobile đến game
            và tools - tất cả đều có tại Qtusdev.
          </p>

          {/* CTA Buttons */}
          <div className="hero-buttons flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-14 md:mb-16 px-4 sm:px-0 animate-fade-in-up delay-400">
            <Link href="/products">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg group hover-lift hover-glow animate-gradient"
              >
                Khám phá ngay
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-gray-300 dark:border-white/30 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg bg-transparent glass-card hover-lift"
              >
                Đăng ký miễn phí
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="hero-stats grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto px-4 sm:px-0 animate-fade-in-up delay-500">
            <div className="text-center glass-card rounded-lg p-4 hover-lift">
              <div className="flex items-center justify-center mb-2">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 mr-2 animate-float" />
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">1000+</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Mã nguồn</p>
            </div>
            <div className="text-center glass-card rounded-lg p-4 hover-lift">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500 mr-2 animate-float-reverse" />
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">5000+</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Khách hàng</p>
            </div>
            <div className="text-center glass-card rounded-lg p-4 hover-lift">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mr-2 animate-pulse-glow" />
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">4.9</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Đánh giá</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
