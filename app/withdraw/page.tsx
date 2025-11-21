"use client"

import { useState, useEffect } from "react"
import { getDeviceInfo, getIPAddress } from "@/lib/auth"
import { apiPost, apiGet } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Wallet, CreditCard, Smartphone, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

// Danh sách đầy đủ ngân hàng Việt Nam
const BANKS_LIST = [
  { id: "agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", shortName: "Agribank" },
  { id: "bidv", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", shortName: "BIDV" },
  { id: "vietcombank", name: "Ngân hàng TMCP Ngoại thương Việt Nam", shortName: "Vietcombank" },
  { id: "vietinbank", name: "Ngân hàng TMCP Công thương Việt Nam", shortName: "VietinBank" },
  { id: "acb", name: "Ngân hàng TMCP Á Châu", shortName: "ACB" },
  { id: "techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam", shortName: "Techcombank" },
  { id: "mbbank", name: "Ngân hàng TMCP Quân đội", shortName: "MB Bank" },
  { id: "vpbank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", shortName: "VPBank" },
  { id: "sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín", shortName: "Sacombank" },
  { id: "tpbank", name: "Ngân hàng TMCP Tiên Phong", shortName: "TPBank" },
  { id: "ocb", name: "Ngân hàng TMCP Phương Đông", shortName: "OCB" },
  { id: "msb", name: "Ngân hàng TMCP Hàng Hải Việt Nam", shortName: "MSB" },
  { id: "vib", name: "Ngân hàng TMCP Quốc tế Việt Nam", shortName: "VIB" },
  { id: "shb", name: "Ngân hàng TMCP Sài Gòn – Hà Nội", shortName: "SHB" },
  { id: "dongabank", name: "Ngân hàng TMCP Đông Á", shortName: "DongA Bank" },
  { id: "namabank", name: "Ngân hàng TMCP Nam Á", shortName: "Nam A Bank" },
  { id: "bacabank", name: "Ngân hàng TMCP Bắc Á", shortName: "Bac A Bank" },
  { id: "vietcapitalbank", name: "Ngân hàng TMCP Bản Việt", shortName: "Viet Capital Bank" },
  { id: "kienlongbank", name: "Ngân hàng TMCP Kiên Long", shortName: "KienlongBank" },
  { id: "eximbank", name: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam", shortName: "Eximbank" },
  { id: "vietabank", name: "Ngân hàng TMCP Việt Á", shortName: "VietABank" },
  { id: "abbank", name: "Ngân hàng TMCP An Bình", shortName: "ABBANK" },
  { id: "scb", name: "Ngân hàng TMCP Sài Gòn", shortName: "SCB" },
  { id: "baovietbank", name: "Ngân hàng TMCP Bảo Việt", shortName: "BaoViet Bank" },
  { id: "gpbank", name: "Ngân hàng TMCP Dầu Khí Toàn Cầu", shortName: "GPBank" },
  { id: "pvcombank", name: "Ngân hàng TMCP Đại Chúng Việt Nam", shortName: "PVcomBank" },
  { id: "seabank", name: "Ngân hàng TMCP Đông Nam Á", shortName: "SeABank" },
  { id: "trustbank", name: "Ngân hàng TMCP Đại Tín (CB Bank)", shortName: "TrustBank" },
  { id: "vietbank", name: "Ngân hàng TMCP Việt Nam Thương Tín", shortName: "VietBank" },
  { id: "lienvietpostbank", name: "Ngân hàng TMCP Liên Việt Post Bank", shortName: "LienVietPostBank" },
  { id: "saigonbank", name: "Ngân hàng TMCP Sài Gòn Công Thương", shortName: "Saigonbank" },
  { id: "pgbank", name: "Ngân hàng TMCP Xăng Dầu Petrolimex", shortName: "PG Bank" },
  { id: "ncb", name: "Ngân hàng TMCP Nam Việt (Navibank)", shortName: "NCB" },
  { id: "tinnghiabank", name: "Ngân hàng TMCP Việt Nam Tín Nghĩa", shortName: "TinNghia Bank" },
  { id: "standardchartered", name: "Ngân hàng TNHH MTV Standard Chartered Việt Nam", shortName: "Standard Chartered" },
  { id: "hsbc", name: "Ngân hàng TNHH MTV HSBC Việt Nam", shortName: "HSBC" },
  { id: "anz", name: "Ngân hàng TNHH MTV ANZ Việt Nam", shortName: "ANZ" },
  { id: "shinhan", name: "Ngân hàng TNHH MTV Shinhan Việt Nam", shortName: "Shinhan" },
  { id: "woori", name: "Ngân hàng TNHH MTV Woori Bank Việt Nam", shortName: "Woori Bank" },
  { id: "vrb", name: "Ngân hàng Liên doanh Việt – Nga", shortName: "VRB" },
]

export default function WithdrawPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [withdrawData, setWithdrawData] = useState({
    selectedBank: "",
    accountNumber: "",
    accountName: "",
    amount: "",
    note: ""
  })
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if user is logged in và sync với userManager
    const checkAndLoadUser = async () => {
      const { userManager } = await import('@/lib/userManager');
      
      if (!userManager.isLoggedIn()) {
        router.push("/auth/login?returnUrl=/withdraw")
        return
      }

      // Load user từ userManager để đảm bảo sync
      const userData = await userManager.getUser()
      if (userData) {
        setUser(userData)
        loadUserWithdrawals(userData.email || '')
      } else {
        router.push("/auth/login?returnUrl=/withdraw")
      }
    }

    checkAndLoadUser()

    // Listen for real-time updates
    const handleUserUpdate = async () => {
      const { userManager } = await import('@/lib/userManager');
      const updatedUser = await userManager.getUser()
      if (updatedUser) {
        setUser(updatedUser)
        loadUserWithdrawals(updatedUser.email || '')
      }
    }

    window.addEventListener("userUpdated", handleUserUpdate)
    
    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate)
    }
  }, [router])

  const loadUserWithdrawals = async (email: string) => {
    try {
      // Gọi API để lấy withdrawals từ PostgreSQL
      const result = await apiGet('/api/withdrawals');
      const userWithdrawals = result.withdrawals?.filter((w: any) => 
        w.userEmail === email || w.user_email === email
      ) || [];
      
      // Map để đồng nhất format
      const mappedWithdrawals = userWithdrawals.map((w: any) => ({
        id: w.id,
        userId: w.user_id,
        userEmail: w.userEmail || w.user_email,
        userName: w.userName || w.user_name,
        amount: w.amount,
        bankName: w.bank_name,
        bankShortName: w.bank_name, // Fallback
        accountNumber: w.account_number,
        accountName: w.account_name,
        status: w.status,
        requestTime: w.created_at || w.requestTime,
        requestTimeFormatted: w.created_at 
          ? new Date(w.created_at).toLocaleString("vi-VN")
          : (w.requestTimeFormatted || new Date().toLocaleString("vi-VN"))
      }));
      
      setWithdrawals(mappedWithdrawals.sort((a: any, b: any) => 
        new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime()
      ));
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      // Fallback to localStorage nếu API fail
      try {
        const allWithdrawals = JSON.parse(localStorage.getItem("withdrawals") || "[]");
        const userWithdrawals = allWithdrawals.filter((w: any) => w.userEmail === email);
        setWithdrawals(userWithdrawals.sort((a: any, b: any) => 
          new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime()
        ));
      } catch (localError) {
        console.error("Error loading from localStorage:", localError);
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isLoading) return

    setIsLoading(true)
    
    try {
      // Validate input
      if (!withdrawData.selectedBank) {
        throw new Error("Vui lòng chọn ngân hàng")
      }
      if (!withdrawData.accountNumber || !/^[0-9]{8,15}$/.test(withdrawData.accountNumber)) {
        throw new Error("Vui lòng nhập số tài khoản hợp lệ (8-15 chữ số)")
      }
      if (!withdrawData.accountName || withdrawData.accountName.trim().length < 3) {
        throw new Error("Vui lòng nhập họ tên chủ tài khoản (tối thiểu 3 ký tự)")
      }
      if (!withdrawData.amount || parseInt(withdrawData.amount) < 10000) {
        throw new Error("Số tiền rút tối thiểu là 10,000đ")
      }

      const withdrawAmount = parseInt(withdrawData.amount)
      const selectedBank = BANKS_LIST.find(b => b.id === withdrawData.selectedBank)
      
      if (!selectedBank) {
        throw new Error("Ngân hàng không hợp lệ")
      }

      if (withdrawAmount > (user.balance || 0)) {
        throw new Error(`Số dư không đủ. Số dư hiện tại: ${(user.balance || 0).toLocaleString("vi-VN")}đ`)
      }

      // Get device info and IP address trước
      const deviceInfo = getDeviceInfo()
      const ipAddress = await getIPAddress()
      const timestamp = new Date().toISOString()

      // Gọi API để lưu withdrawal vào PostgreSQL
      let withdrawRequest: any;
      try {
        const result = await apiPost('/api/withdrawals', {
          userId: user.uid || user.id,
          amount: withdrawAmount,
          bankName: selectedBank.name,
          accountNumber: withdrawData.accountNumber,
          accountName: withdrawData.accountName,
          userEmail: user.email,
          deviceInfo,
          ipAddress,
        });

        // Tạo withdrawal object từ response
        withdrawRequest = {
          id: result.withdrawal?.id || Date.now(),
          userId: user.uid || user.id,
          userEmail: user.email,
          userName: user.name,
          bankId: selectedBank.id,
          bankName: selectedBank.name,
          bankShortName: selectedBank.shortName,
          accountNumber: withdrawData.accountNumber,
          accountName: withdrawData.accountName,
          amount: withdrawAmount,
          note: withdrawData.note || "",
          requestTime: result.withdrawal?.created_at || timestamp,
          requestTimeFormatted: result.withdrawal?.created_at
            ? new Date(result.withdrawal.created_at).toLocaleString("vi-VN")
            : new Date(timestamp).toLocaleString("vi-VN"),
          ipAddress: ipAddress,
          deviceInfo: deviceInfo,
          userAgent: navigator.userAgent,
          status: "pending",
          approvedBy: null,
          approvedTime: null,
          processed: false
        };

        console.log('✅ Withdrawal saved to PostgreSQL:', result);
      } catch (apiError: any) {
        console.error('❌ API error, saving to localStorage as fallback:', apiError);
        
        // Fallback: Save to localStorage nếu API fail
        withdrawRequest = {
          id: Date.now(),
          userId: user.uid || user.id,
          userEmail: user.email,
          userName: user.name,
          bankId: selectedBank.id,
          bankName: selectedBank.name,
          bankShortName: selectedBank.shortName,
          accountNumber: withdrawData.accountNumber,
          accountName: withdrawData.accountName,
          amount: withdrawAmount,
          note: withdrawData.note || "",
          requestTime: timestamp,
          requestTimeFormatted: new Date(timestamp).toLocaleString("vi-VN"),
          ipAddress: ipAddress,
          deviceInfo: deviceInfo,
          userAgent: navigator.userAgent,
          status: "pending",
          approvedBy: null,
          approvedTime: null,
          processed: false
        };

        const allWithdrawals = JSON.parse(localStorage.getItem("withdrawals") || "[]")
        allWithdrawals.push(withdrawRequest)
        localStorage.setItem("withdrawals", JSON.stringify(allWithdrawals))

        const pendingWithdrawals = JSON.parse(localStorage.getItem("pendingWithdrawals") || "[]")
        pendingWithdrawals.push(withdrawRequest)
        localStorage.setItem("pendingWithdrawals", JSON.stringify(pendingWithdrawals))
      }

      // Send notification to admin
      const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
      notifications.push({
        id: Date.now(),
        type: "withdrawal_request",
        title: "Yêu cầu rút tiền mới",
        message: `${user.name} yêu cầu rút ${withdrawAmount.toLocaleString("vi-VN")}đ qua ${selectedBank.shortName}`,
        user: { email: user.email, name: user.name },
        timestamp: timestamp,
        read: false,
        withdrawalInfo: withdrawRequest
      })
      localStorage.setItem("notifications", JSON.stringify(notifications))

      // Dispatch events for real-time updates
      window.dispatchEvent(new Event("withdrawalsUpdated"))
      window.dispatchEvent(new Event("notificationsUpdated"))

      // Reset form
      setWithdrawData({
        selectedBank: "",
        accountNumber: "",
        accountName: "",
        amount: "",
        note: ""
      })

      // Reload withdrawals (debounce để tránh duplicate calls)
      setTimeout(() => {
        if (user.email) {
          loadUserWithdrawals(user.email);
        }
      }, 500);

      alert("Yêu cầu rút tiền đã được gửi! Vui lòng chờ admin xử lý.")

    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Đã chuyển</Badge>
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

  const withdrawAmount = parseInt(withdrawData.amount) || 0
  const selectedBank = BANKS_LIST.find(b => b.id === withdrawData.selectedBank)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Withdraw Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Rút tiền từ tài khoản
            </CardTitle>
            <CardDescription>
              Số dư hiện tại: <span className="font-bold text-green-600">{user.balance?.toLocaleString("vi-VN") || "0"}đ</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Chọn ngân hàng */}
              <div className="space-y-2">
                <Label htmlFor="bank">Ngân hàng*</Label>
                <Select 
                  value={withdrawData.selectedBank} 
                  onValueChange={(value) => setWithdrawData(prev => ({ ...prev, selectedBank: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngân hàng" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {BANKS_LIST.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div>
                          <div className="font-medium">{bank.shortName}</div>
                          <div className="text-xs text-muted-foreground">{bank.name}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Số tài khoản */}
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Số tài khoản*</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  placeholder="Nhập số tài khoản"
                  value={withdrawData.accountNumber}
                  onChange={(e) => setWithdrawData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  pattern="[0-9]{8,15}"
                  required
                />
                <p className="text-xs text-muted-foreground">8-15 chữ số</p>
              </div>

              {/* Tên chủ tài khoản */}
              <div className="space-y-2">
                <Label htmlFor="accountName">Họ và tên chủ tài khoản*</Label>
                <Input
                  id="accountName"
                  type="text"
                  placeholder="Nhập họ tên đầy đủ"
                  value={withdrawData.accountName}
                  onChange={(e) => setWithdrawData(prev => ({ ...prev, accountName: e.target.value }))}
                  required
                />
              </div>

              {/* Số tiền */}
              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền muốn rút*</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Nhập số tiền (VNĐ)"
                  value={withdrawData.amount}
                  onChange={(e) => setWithdrawData(prev => ({ ...prev, amount: e.target.value }))}
                  min="10000"
                  step="1000"
                  required
                />
                <p className="text-xs text-muted-foreground">Tối thiểu 10,000đ</p>
              </div>

              {/* Ghi chú */}
              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú (nếu có)</Label>
                <Textarea
                  id="note"
                  placeholder="Ghi chú thêm (không bắt buộc)"
                  value={withdrawData.note}
                  onChange={(e) => setWithdrawData(prev => ({ ...prev, note: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Thông báo số dư */}
              {withdrawAmount > 0 && (
                <div className={`p-4 rounded-lg ${withdrawAmount > (user.balance || 0) ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className="text-sm">
                    <strong>Số tiền rút:</strong> {withdrawAmount.toLocaleString("vi-VN")}đ
                  </p>
                  <p className="text-sm">
                    <strong>Số dư hiện tại:</strong> {(user.balance || 0).toLocaleString("vi-VN")}đ
                  </p>
                  {withdrawAmount <= (user.balance || 0) && (
                    <p className="text-sm font-semibold text-green-600">
                      Số dư còn lại: {(user.balance || 0) - withdrawAmount}đ
                    </p>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !withdrawData.selectedBank || withdrawAmount > (user.balance || 0)}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  "Gửi yêu cầu rút tiền"
                )}
              </Button>

              {withdrawAmount > (user.balance || 0) && withdrawAmount > 0 && (
                <p className="text-red-600 text-sm text-center">
                  Số dư không đủ để thực hiện giao dịch này
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Withdraw History */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử rút tiền</CardTitle>
            <CardDescription>
              Theo dõi trạng thái các yêu cầu rút tiền của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {withdrawals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Chưa có lịch sử rút tiền
                </p>
              ) : (
                withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{withdrawal.amount.toLocaleString("vi-VN")}đ</p>
                      <p className="text-sm text-gray-500">{withdrawal.bankShortName || withdrawal.bankName}</p>
                      <p className="text-xs text-gray-400">Số TK: {withdrawal.accountNumber}</p>
                      <p className="text-xs text-gray-400">{withdrawal.requestTimeFormatted}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(withdrawal.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}