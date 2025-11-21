"use client"

import { Code, Zap, Shield, Headphones, Gift, CreditCard } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"

export function FeaturesSection() {
  const features = [
    {
      icon: Code,
      title: "Mã nguồn chất lượng",
      description: "Tất cả mã nguồn đều được kiểm tra và đảm bảo chất lượng cao nhất",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Zap,
      title: "Tải về ngay lập tức",
      description: "Sau khi thanh toán, bạn có thể tải về mã nguồn ngay lập tức",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Shield,
      title: "Bảo mật tuyệt đối",
      description: "Thông tin và giao dịch của bạn được bảo vệ với công nghệ mã hóa tiên tiến",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Headphones,
      title: "Hỗ trợ 24/7",
      description: "Đội ngũ hỗ trợ chuyên nghiệp luôn sẵn sàng giúp đỡ bạn mọi lúc",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Gift,
      title: "Gifcode giảm giá",
      description: "Thường xuyên có các chương trình khuyến mãi và gifcode hấp dẫn",
      gradient: "from-pink-500 to-rose-500",
    },
    {
      icon: CreditCard,
      title: "Thanh toán đa dạng",
      description: "Hỗ trợ nhiều phương thức thanh toán: Banking, Momo, ZaloPay...",
      gradient: "from-indigo-500 to-purple-500",
    },
  ]

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tính năng{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">nổi bật</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Khám phá những tính năng tuyệt vời mà Qtusdev mang lại cho bạn
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-all duration-300 group"
            >
              <CardContent className="p-8">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-purple-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
