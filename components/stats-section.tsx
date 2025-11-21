"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Shield, Clock, Award } from 'lucide-react'

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById("stats-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const stats = [
    {
      icon: TrendingUp,
      value: "99.9%",
      label: "Uptime",
      description: "Đảm bảo hoạt động ổn định",
    },
    {
      icon: Shield,
      value: "100%",
      label: "Bảo mật",
      description: "Mã nguồn được kiểm tra kỹ lưỡng",
    },
    {
      icon: Clock,
      value: "24/7",
      label: "Hỗ trợ",
      description: "Luôn sẵn sàng giúp đỡ bạn",
    },
    {
      icon: Award,
      value: "5★",
      label: "Chất lượng",
      description: "Đánh giá cao từ khách hàng",
    },
  ]

  return (
    <section id="stats-section" className="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tại sao chọn{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Qtusdev</span>?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Chúng tôi cam kết mang đến trải nghiệm tốt nhất cho khách hàng
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`text-center p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-all duration-500 ${
                isVisible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6">
                <stat.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
              <div className="text-xl font-semibold text-purple-500 mb-2">{stat.label}</div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}