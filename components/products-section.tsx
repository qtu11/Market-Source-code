"use client"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Download, Eye, ShoppingCart } from 'lucide-react'
import Link from "next/link"
import Image from "next/image"
import { Product } from "@/types/product"
import { apiGet } from "@/lib/api-client"
import { mapBackendProductsToFrontend } from "@/lib/product-mapper"
import { logger } from "@/lib/logger-client"

export function ProductsSection() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState([
    { id: "all", name: "Tất cả", count: 0 },
    { id: "website", name: "Website", count: 0 },
    { id: "mobile", name: "Mobile App", count: 0 },
    { id: "game", name: "Game", count: 0 },
    { id: "tool", name: "Tools", count: 0 },
  ])
  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
      return null
    }
    const parsedValue = typeof value === "number" ? value : Number.parseFloat(String(value))
    return Number.isNaN(parsedValue) ? null : parsedValue
  }

  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
      const uploadedProducts = JSON.parse(localStorage.getItem("uploadedProducts") || "[]")
      return uploadedProducts.map((product: any) => ({
        ...product,
        tags: Array.isArray(product.tags) ? product.tags : [],
        rating: product.rating || 0,
        downloads: product.downloads || 0,
        price: product.price || 0,
        originalPrice: product.originalPrice || product.price || 0,
      }))
      } catch (error) {
        logger.error('Error parsing localStorage products:', error);
        return [];
      }
    }

    const updateCategoryCounts = (validatedProducts: Product[]) => {
      setCategories((prev) =>
        prev.map((category) => {
          if (category.id === "all") {
            return { ...category, count: validatedProducts.length }
          }
          return {
            ...category,
            count: validatedProducts.filter((p: any) => p.category === category.id).length
          }
        })
      )
    }

    const loadProducts = async () => {
      try {
        const result = await apiGet('/api/products')
        if (result?.success && Array.isArray(result.products)) {
          const mapped = mapBackendProductsToFrontend(result.products).map((product: any) => ({
            ...product,
            tags: Array.isArray(product.tags) ? product.tags : [],
            rating: product.rating || product.averageRating || 0,
            downloads: product.downloads || product.downloadCount || 0,
            price: product.price || 0,
            originalPrice: product.originalPrice || product.price || 0,
          }))
          setProducts(mapped)
          updateCategoryCounts(mapped)
          return
        }
        throw new Error('Invalid response')
      } catch {
        const fallbackProducts = loadFromLocalStorage()
        setProducts(fallbackProducts)
        updateCategoryCounts(fallbackProducts)
      }
    }

    loadProducts()

    const handleProductsUpdate = () => {
      loadProducts()
    }

    window.addEventListener("productsUpdated", handleProductsUpdate)
    
    return () => {
      window.removeEventListener("productsUpdated", handleProductsUpdate)
    }
  }, [])

  const filteredProducts =
    activeCategory === "all" ? products : products.filter((product) => product.category === activeCategory)

  const handleAddToCart = (product: any) => {
    if (typeof window !== "undefined" && (window as any).addToCart) {
      ;(window as any).addToCart(product)
    } else {
      // Fallback if addToCart is not available
      try {
      const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]")
      const existingItem = cartItems.find((item: any) => item.id === product.id)

      if (existingItem) {
        existingItem.quantity += 1
      } else {
        cartItems.push({ ...product, quantity: 1 })
      }

      localStorage.setItem("cartItems", JSON.stringify(cartItems))
      window.dispatchEvent(new Event("cartUpdated"))
      alert(`Đã thêm "${product.title}" vào giỏ hàng!`)
      } catch (error) {
        logger.error('Error adding to cart:', error);
        alert('Lỗi khi thêm sản phẩm vào giỏ hàng. Vui lòng thử lại!');
      }
    }
  }

  if (products.length === 0) {
    return (
      <section className="py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Mã nguồn{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                nổi bật
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
              Chưa có sản phẩm nào được upload. Admin vui lòng upload sản phẩm mới.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-800/50">
      <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Mã nguồn{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">nổi bật</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
            Khám phá những mã nguồn chất lượng cao được yêu thích nhất
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 sm:mb-10 md:mb-12 px-4 sm:px-0">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                onClick={() => setActiveCategory(category.id)}
                size="sm"
                className={`text-xs sm:text-sm ${
                  activeCategory === category.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {category.name} ({category.count})
              </Button>
            ))}
          </div>
        </div>

        <div className="products-grid grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {filteredProducts.map((product) => {
            const priceValue = toNumber(product.price) ?? 0
            const rawOriginalPrice = product.originalPrice ?? product.original_price ?? null
            const originalPriceValue = toNumber(rawOriginalPrice)
            const imageSrc = product.image || product.imageUrl || product.image_url || "/placeholder.svg"
            const ratingValue =
              typeof product.rating === "number"
                ? product.rating
                : typeof product.average_rating === "number"
                ? product.average_rating
                : 0
            const downloadsValue =
              typeof product.downloads === "number"
                ? product.downloads
                : typeof product.download_count === "number"
                ? product.download_count
                : 0
            const demoLink = product.demoLink || product.demoUrl || product.demo_url || null

            return (
            <Card
              key={product.id}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-all duration-300 group overflow-hidden card-hover glass-card"
            >
              <div className="relative overflow-hidden">
                <Image
                    src={imageSrc}
                  alt={product.title}
                  width={400}
                  height={225}
                  className="w-full card-img-responsive object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {product.featured && (
                  <Badge className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                    Nổi bật
                  </Badge>
                )}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex items-center space-x-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 mr-1" />
                      <span className="text-white text-xs sm:text-sm">{ratingValue}</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 sm:p-5 md:p-6">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-2">
                  {product.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{product.description}</p>

                <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                  {Array.isArray(product.tags) &&
                    product.tags.length > 0 &&
                    product.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1">
                        {tag}
                      </Badge>
                    ))}
                  {Array.isArray(product.tags) && product.tags.length > 3 && (
                    <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1">
                      +{product.tags.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                          {priceValue.toLocaleString("vi-VN")}đ
                    </span>
                        {originalPriceValue && originalPriceValue > priceValue && (
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-through">
                            {originalPriceValue.toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {downloadsValue}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs sm:text-sm py-2 hover-lift hover-glow animate-gradient"
                  >
                    <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:animate-bounce" />
                    <span className="hidden sm:inline">Mua ngay</span>
                    <span className="sm:hidden">Mua</span>
                  </Button>
                    {demoLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent px-2 sm:px-3 hover-lift"
                        onClick={() => window.open(demoLink, "_blank")}
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>

        <div className="text-center mt-8 sm:mt-10 md:mt-12">
          <Link href="/products">
            <Button
              size="lg"
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 px-6 sm:px-8 bg-transparent text-sm sm:text-base"
            >
              Xem tất cả mã nguồn
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
