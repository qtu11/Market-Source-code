"use client"

import { useState, useEffect } from "react"
import { logger } from "@/lib/logger-client"
import { Logo } from "@/components/logo"
import Link from 'next/link'
import { User, Deposit } from "@/types"
import { getLocalStorage, setLocalStorage } from "@/lib/localStorage-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Wallet, CreditCard, Smartphone, Copy, CheckCircle, Clock, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { getDeviceInfo, getIPAddress } from "@/lib/auth"
import { FloatingHeader } from "@/components/floating-header"
import { Footer } from "@/components/footer"
import { apiPost, apiGet } from "@/lib/api-client"
import Image from "next/image"
import dynamic from "next/dynamic"

// Lazy load Three.js components để tối ưu performance
const ThreeJSProductShowcase = dynamic(
  async () => {
    try {
      const mod = await import("@/components/three-js-product-showcase")
      return { default: mod.ThreeJSProductShowcase }
    } catch (error) {
      logger.error('Failed to load ThreeJS Product Showcase component', error)
      throw error
    }
  },
  { 
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-gradient-to-b from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900" />
  }
)

const ThreeDFallback = dynamic(
  async () => {
    try {
      const mod = await import("@/components/3d-fallback")
      return { default: mod.ThreeDFallback }
    } catch (error) {
      logger.error('Failed to load 3D Fallback component', error)
      throw error
    }
  },
  { ssr: false }
)

const PAYMENT_METHODS = [
  {
    id: "mbbank",
    name: "MB Bank",
    icon: CreditCard,
    accountNumber: "0328551707",
    accountName: "NGUYEN QUANG TU",
    qrCode: "https://files.catbox.moe/wox1o7.jpg",
    logo: "https://files.catbox.moe/fq9mki.png",
  },
  {
    id: "momo",
    name: "Momo",
    icon: Smartphone,
    accountNumber: "0328551707",
    accountName: "NGUYEN QUANG TU",
    qrCode: "https://files.catbox.moe/s565tf.jpg",
    logo: "https://files.catbox.moe/4204yj.png",
  },
  {
    id: "techcombank",
    name: "Techcombank",
    icon: CreditCard,
    accountNumber: "2002200710",
    accountName: "NGUYEN QUANG TU",
    qrCode: "https://files.catbox.moe/pb65ti.jpg",
    logo: "https://files.catbox.moe/y54uf2.jpg",
  },
  {
    id: "tpbank",
    name: "TPBank",
    icon: CreditCard,
    accountNumber: "00005372546",
    accountName: "NGUYEN QUANG TU",
    qrCode: "https://files.catbox.moe/9q3jn5.jpg",
    logo: "https://files.catbox.moe/hxmo0s.png",
  }
]

export default function DepositPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [amount, setAmount] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedField, setCopiedField] = useState("")

  useEffect(() => {
    // Check if user is logged in và sync với userManager
    const checkAndLoadUser = async () => {
      const { userManager } = await import('@/lib/userManager');
      
      if (!userManager.isLoggedIn()) {
        router.push("/auth/login?returnUrl=/deposit")
        return
      }

      // Load user từ userManager để đảm bảo sync
      const userData = await userManager.getUser()
      if (userData) {
        // Map UserData to User type
        const mappedUser: User = {
          id: userData.uid || (userData as { id?: string | number }).id || userData.email || '',
          email: userData.email || '',
          name: userData.name || (userData as { displayName?: string }).displayName || null,
          displayName: (userData as { displayName?: string }).displayName || null,
          balance: typeof userData.balance === 'string' ? parseFloat(userData.balance) : (userData.balance || 0),
          role: (userData as { role?: string }).role as 'user' | 'admin' | 'superadmin' | undefined,
          status: (userData as { status?: string }).status as 'active' | 'banned' | 'pending' | undefined,
          provider: (userData as { provider?: string }).provider,
          lastActivity: (userData as { lastActivity?: string | Date }).lastActivity,
          loginCount: (userData as { loginCount?: number }).loginCount,
          uid: userData.uid
        };
        setUser(mappedUser)
        loadUserDeposits(userData.email || '')
      } else {
        router.push("/auth/login?returnUrl=/deposit")
      }
    }

    checkAndLoadUser()

    // Listen for real-time updates
    const handleUserUpdate = async () => {
      const { userManager } = await import('@/lib/userManager');
      const updatedUser = await userManager.getUser()
      if (updatedUser) {
        // Map UserData to User type
        const mappedUser: User = {
          id: updatedUser.uid || (updatedUser as { id?: string | number }).id || updatedUser.email || '',
          email: updatedUser.email || '',
          name: updatedUser.name || (updatedUser as { displayName?: string }).displayName || null,
          displayName: (updatedUser as { displayName?: string }).displayName || null,
          balance: typeof updatedUser.balance === 'string' ? parseFloat(updatedUser.balance) : (updatedUser.balance || 0),
          role: (updatedUser as { role?: string }).role as 'user' | 'admin' | 'superadmin' | undefined,
          status: (updatedUser as { status?: string }).status as 'active' | 'banned' | 'pending' | undefined,
          provider: (updatedUser as { provider?: string }).provider,
          lastActivity: (updatedUser as { lastActivity?: string | Date }).lastActivity,
          loginCount: (updatedUser as { loginCount?: number }).loginCount,
          uid: updatedUser.uid
        };
        setUser(mappedUser)
        loadUserDeposits(updatedUser.email || '')
      }
    }

    window.addEventListener("userUpdated", handleUserUpdate)
    
    // ✅ FIX: Auto-refresh deposits mỗi 5 giây để có real-time updates
    const refreshInterval = setInterval(() => {
      if (user?.email) {
        loadUserDeposits(user.email);
      }
    }, 5000);
    
    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate)
      clearInterval(refreshInterval);
    }
  }, [router, user?.email])

  const loadUserDeposits = async (email: string) => {
    try {
      // Gọi API để lấy deposits từ PostgreSQL
      const result = await apiGet('/api/deposits');
      const userDeposits = result.deposits?.filter((d: Deposit | { userEmail?: string; user_email?: string }) => 
        d.userEmail === email || (d as { user_email?: string }).user_email === email
      ) || [];
      
      // Map để đồng nhất format
      const mappedDeposits: Deposit[] = userDeposits.map((d: Deposit | Record<string, unknown>) => ({
        id: (d as Deposit).id,
        userId: (d as { user_id?: number | string }).user_id || (d as Deposit).userId,
        userEmail: (d as Deposit).userEmail || (d as { user_email?: string }).user_email || null,
        userName: (d as Deposit).userName || (d as { user_name?: string }).user_name || null,
        amount: (d as Deposit).amount,
        method: (d as Deposit).method || null,
        transactionId: (d as Deposit).transactionId || (d as { transaction_id?: string }).transaction_id || null,
        status: (d as Deposit).status || 'pending',
        timestamp: (d as { timestamp?: string | Date }).timestamp || (d as Deposit).timestamp || (d as { created_at?: string | Date }).created_at || new Date(),
        created_at: (d as { created_at?: string | Date }).created_at || (d as Deposit).created_at
      }));
      
      setDeposits(mappedDeposits.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      }));
    } catch (error) {
      logger.error("Error loading deposits", error);
      // Fallback to localStorage nếu API fail
      try {
        const allDeposits = getLocalStorage<Deposit[]>("deposits", []);
        const userDeposits = allDeposits.filter((d) => d.userEmail === email);
        setDeposits(userDeposits.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        }));
      } catch (localError) {
        logger.error("Error loading from localStorage", localError);
      }
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(""), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isLoading) return

    setIsLoading(true)
    
    try {
      if (!amount || !selectedMethod || !transactionId) {
        throw new Error("Vui lòng điền đầy đủ thông tin")
      }

      const depositAmount = parseInt(amount)
      if (depositAmount < 5000) {
        throw new Error("Số tiền nạp tối thiểu là 5,000đ")
      }

      const method = PAYMENT_METHODS.find(m => m.id === selectedMethod)
      if (!method) {
        throw new Error("Phương thức thanh toán không hợp lệ")
      }

      // Get device info and IP address trước
      const deviceInfo = getDeviceInfo()
      const ipAddress = await getIPAddress()

      // Gọi API để lưu deposit vào PostgreSQL
      let depositRequest: Deposit & { accountName?: string; accountNumber?: string; requestTimeFormatted?: string; ipAddress?: string };
      try {
        const result = await apiPost('/api/deposits', {
          userId: user.uid || user.id,
          amount: depositAmount,
          method: method.name,
          transactionId: transactionId,
          userEmail: user.email,
          userName: user.name || user.displayName || user.email,
          deviceInfo,
          ipAddress,
        });

        // Tạo deposit object từ response
        depositRequest = {
          id: result.deposit?.id || Date.now(),
          userId: user.uid || user.id,
          userEmail: user.email || null,
          userName: user.name || user.displayName || user.email || null,
          amount: depositAmount,
          method: method.name,
          accountName: method.accountName,
          accountNumber: method.accountNumber,
          transactionId: transactionId,
          status: "pending",
          timestamp: result.deposit?.timestamp || new Date().toISOString(),
          requestTimeFormatted: result.deposit?.timestamp 
            ? new Date(result.deposit.timestamp).toLocaleString("vi-VN")
            : new Date().toLocaleString("vi-VN"),
          created_at: result.deposit?.created_at || result.deposit?.timestamp || new Date().toISOString(),
          ipAddress: ipAddress
        };

        logger.debug('Deposit saved to PostgreSQL', { result });
      } catch (apiError: unknown) {
        logger.error('API error, saving to localStorage as fallback', apiError);
        
        // Fallback: Save to localStorage nếu API fail
        depositRequest = {
          id: Date.now(),
          userId: user.uid || user.id,
          userEmail: user.email || null,
          userName: user.name || user.displayName || user.email || null,
          amount: depositAmount,
          method: method.name,
          accountName: method.accountName,
          accountNumber: method.accountNumber,
          transactionId: transactionId,
          status: "pending",
          timestamp: new Date().toISOString(),
          requestTimeFormatted: new Date().toLocaleString("vi-VN"),
          created_at: new Date().toISOString(),
          ipAddress: ipAddress
        };

        const allDeposits = getLocalStorage<Deposit[]>("deposits", []);
        allDeposits.push(depositRequest as Deposit);
        setLocalStorage("deposits", allDeposits);

        const pendingDeposits = getLocalStorage<Deposit[]>("pendingDeposits", []);
        pendingDeposits.push(depositRequest as Deposit);
        setLocalStorage("pendingDeposits", pendingDeposits);
      }

      // Send notification to admin
      const notifications = getLocalStorage<Array<Record<string, unknown>>>("notifications", []);
      notifications.push({
        id: Date.now(),
        type: "deposit_request",
        title: "Yêu cầu nạp tiền mới",
        message: `${user.name} yêu cầu nạp ${depositAmount.toLocaleString("vi-VN")}đ qua ${method.name}`,
        user: { email: user.email, name: user.name, ipAddress },
        timestamp: new Date().toISOString(),
        read: false,
        depositInfo: depositRequest
      });
      setLocalStorage("notifications", notifications);

      // Dispatch events for real-time updates
      window.dispatchEvent(new Event("depositsUpdated"))
      window.dispatchEvent(new Event("notificationsUpdated"))

      // Reset form
      setAmount("")
      setTransactionId("")
      setSelectedMethod("")

      // Reload deposits (debounce để tránh duplicate calls)
      setTimeout(() => {
        if (user.email) {
          loadUserDeposits(user.email);
        }
      }, 500);

      alert("Yêu cầu nạp tiền đã được gửi! Vui lòng chờ admin duyệt.")

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Từ chối</Badge>
      default:
        return <Badge>Không xác định</Badge>
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const selectedMethodInfo = PAYMENT_METHODS.find(m => m.id === selectedMethod)

  return (
    <>
      <FloatingHeader />
      <div className="min-h-screen bg-white dark:bg-gray-900 relative">
        {/* 3D Background */}
        <div className="absolute inset-0">
          <ThreeJSProductShowcase />
          <ThreeDFallback />
        </div>
        
        <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deposit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Nạp tiền vào tài khoản
            </CardTitle>
            <CardDescription>
              Số dư hiện tại: <span className="font-bold text-green-600">{user.balance?.toLocaleString("vi-VN") || "0"}đ</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền nạp (VNĐ)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Nhập số tiền (tối thiểu 5,000đ)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="5000"
                  step="1000"
                  required
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[5000,10000,20000,50000, 100000, 200000, 500000, 1000000].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(preset.toString())}
                    >
                      {preset.toLocaleString("vi-VN")}đ
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phương thức thanh toán</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phương thức thanh toán" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center">
                          <method.icon className="w-4 h-4 mr-2" />
                          {method.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMethodInfo && (
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-sm">Thông tin chuyển khoản</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Ngân hàng:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{selectedMethodInfo.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedMethodInfo.name, "bankName")}
                        >
                          {copiedField === "bankName" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Số tài khoản:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{selectedMethodInfo.accountNumber}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedMethodInfo.accountNumber, "accountNumber")}
                        >
                          {copiedField === "accountNumber" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Chủ tài khoản:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{selectedMethodInfo.accountName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedMethodInfo.accountName, "accountName")}
                        >
                          {copiedField === "accountName" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Nội dung CK:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">NAP {user.email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`NAP ${user.email}`, "content")}
                        >
                          {copiedField === "content" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    {selectedMethodInfo.qrCode && (
                      <div className="flex flex-col items-center mt-4">
                        <span className="text-sm text-gray-600 mb-2">Mã QR:</span>
                        <Image
                          src={selectedMethodInfo.qrCode}
                          alt="QR Code"
                          width={192}
                          height={192}
                          className="w-48 h-48 object-contain border rounded"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="transactionId">Mã giao dịch</Label>
                <Input
                  id="transactionId"
                  type="text"
                  placeholder="Nhập mã giao dịch từ ngân hàng/ví"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required
                />
                <div className="text-sm text-gray-500">
                  <p>Vui lòng nhập mã giao dịch chính xác để được duyệt nhanh chóng.</p>
                  <p><i>(Nếu không có mã giao dịch có thể thử nhập nội dung chuyển khoản!.)</i></p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  "Gửi yêu cầu nạp tiền"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Deposit History */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử nạp tiền</CardTitle>
            <CardDescription>
              Theo dõi trạng thái các yêu cầu nạp tiền của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {deposits.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Chưa có lịch sử nạp tiền
                </p>
              ) : (
                deposits.map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{deposit.amount.toLocaleString("vi-VN")}đ</p>
                      <p className="text-sm text-gray-500">{deposit.method}</p>
                      <p className="text-xs text-gray-400">{(deposit as Deposit & { requestTimeFormatted?: string }).requestTimeFormatted || (deposit.timestamp ? new Date(deposit.timestamp).toLocaleString("vi-VN") : '')}</p>
                      <p className="text-xs text-gray-400">Mã GD: {(deposit.transactionId || '').toString()}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(deposit.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
      </div>
      <Footer />
    </>
  )
}