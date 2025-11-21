"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Quote } from 'lucide-react'

export function TestimonialsSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const testimonials = [
    {
      name: "Nguyễn Văn A",
      role: "Full-stack Developer",
      avatar: "/developer-avatar.png",
      rating: 5,
      content:
        "Qtusdev thực sự là một marketplace tuyệt vời! Mã nguồn chất lượng cao, giá cả hợp lý và hỗ trợ khách hàng rất tốt. Tôi đã mua nhiều project ở đây và đều rất hài lòng.",
    },
    {
      name: "Trần Thị B",
      role: "Mobile App Developer",
      avatar: "/female-developer-avatar.png",
      rating: 5,
      content:
        "Tôi đã tìm được rất nhiều mã nguồn mobile app chất lượng tại đây. Đặc biệt là các app React Native và Flutter đều rất hoàn thiện và dễ customize.",
    },
    {
      name: "Lê Văn C",
      role: "Startup Founder",
      avatar: "/startup-founder-avatar.png",
      rating: 5,
      content:
        "Qtusdev giúp startup của tôi tiết kiệm rất nhiều thời gian và chi phí phát triển. Thay vì code từ đầu, tôi có thể mua mã nguồn sẵn có và customize theo nhu cầu.",
    },
    {
      name: "Phạm Thị D",
      role: "Freelancer",
      avatar: "/freelancer-avatar.png",
      rating: 5,
      content:
        "Là một freelancer, tôi thường xuyên cần các template và mã nguồn để giao hàng nhanh cho khách. Qtusdev là nơi tôi tin tưởng nhất để tìm kiếm những gì mình cần.",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Khách hàng{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">nói gì</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Hàng nghìn khách hàng đã tin tưởng và hài lòng với dịch vụ của chúng tôi
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="text-center">
                <Quote className="w-12 h-12 text-purple-400 mx-auto mb-6" />

                <div className="mb-8">
                  <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                    "{testimonials[currentTestimonial].content}"
                  </p>

                  <div className="flex justify-center mb-4">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={testimonials[currentTestimonial].avatar || "/placeholder.svg"} />
                    <AvatarFallback>{testimonials[currentTestimonial].name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <h4 className="text-gray-900 dark:text-white font-semibold text-lg">{testimonials[currentTestimonial].name}</h4>
                    <p className="text-gray-600 dark:text-gray-400">{testimonials[currentTestimonial].role}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testimonial Indicators */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentTestimonial ? "bg-purple-500 w-8" : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
