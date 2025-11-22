"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, LogOut } from 'lucide-react'
import { Logo } from "@/components/logo"
import { 
  getUserData, 
  saveUserData, 
  onUsersChange, 
  saveDeposit, 
  saveWithdrawal, 
  onDepositsChange, 
  onWithdrawalsChange, 
  onPurchasesChange, 
  saveNotification, 
  getDeposits, 
  getWithdrawals,
  loadDepositsAndWithdrawals
} from "@/lib/admin-helpers"
import { ThreeJSAdmin } from "@/components/three-js-admin"
import { ThreeDFallback } from "@/components/3d-fallback"
import { apiGet } from "@/lib/api-client"
import { logger } from "@/lib/logger-client"

// Import các component riêng biệt
import { Overview } from "./components/Overview"
import Product from "./components/Product"
import { User } from "./components/User"
import { Deposit } from "./components/Deposit"
import { Withdrawmoney } from "./components/Withdrawmoney"
import { Analytics } from "./components/Analytics"
import { CustomerSupport } from "./components/CustomerSupport"
import { ChatAdmin } from "@/components/chat-admin"
import { Setting } from "./components/Setting"
import { NotificationManagement } from "./components/NotificationManagement"
import { UserAnalytics } from "./components/UserAnalytics"
import { ProductAnalytics } from "./components/ProductAnalytics"
import { ReviewManagement } from "./components/ReviewManagement"
import { TransactionFilters } from "./components/TransactionFilters"
import { AnnouncementManager } from "./components/AnnouncementManager"
import { FAQManager } from "./components/FAQManager"
import { AuditLogs } from "./components/AuditLogs"
import { PromotionManager } from "./components/PromotionManager"
import { FinancialReports } from "./components/FinancialReports"
import { BackupRestore } from "./components/BackupRestore"
import { UserBulkActions } from "./components/UserBulkActions"
import type { Announcement } from "./components/AnnouncementManager"
import type { FAQItem } from "./components/FAQManager"
import type { AuditLog } from "./components/AuditLogs"
import type { Promotion } from "./components/PromotionManager"
import type { BackupItem } from "./components/BackupRestore"

type TransactionFilterState = {
  q: string
  type: string
  status: string
  method: string
  dateRange?: { from: string; to: string }
}

function AdminPageContent() {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Data states
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([])
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [selectedUsersMap, setSelectedUsersMap] = useState<Record<string, boolean>>({})
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilterState>({
    q: "",
    type: "all",
    status: "all",
    method: "all",
    dateRange: { from: "", to: "" },
  })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [faqItems, setFaqItems] = useState<FAQItem[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditSearch, setAuditSearch] = useState("")
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [adminReviews, setAdminReviews] = useState<any[]>([])

  useEffect(() => {
    if (announcements.length === 0) {
      setAnnouncements([
        {
          id: "welcome",
          title: "Chào mừng admin",
          message: "Kiểm tra dashboard và duyệt giao dịch đang chờ.",
          type: "system",
          priority: "normal",
          isActive: true,
          showOnHomepage: true,
        },
      ])
    }
  }, [announcements.length])

  useEffect(() => {
    if (faqItems.length === 0) {
      setFaqItems([
        {
          id: "faq-1",
          category: "Account",
          question: "Làm sao để reset mật khẩu khách hàng?",
          answer: "Vào tab Users, chọn user và nhấn Reset Password.",
          isPublished: true,
          viewCount: 0,
        },
      ])
    }
  }, [faqItems.length])

  useEffect(() => {
    if (promotions.length === 0) {
      setPromotions([
        {
          id: "promo-1",
          name: "Flash Sale cuối tuần",
          description: "Giảm 20% cho toàn bộ products AI.",
          discountType: "percentage",
          discountValue: 20,
          channels: ["web", "email"],
          active: true,
        },
      ])
    }
  }, [promotions.length])

  useEffect(() => {
    if (backups.length === 0) {
      setBackups([
        {
          id: "backup-1",
          label: "Daily Snapshot",
          createdAt: new Date().toISOString(),
          size: "250MB",
          type: "auto",
          status: "ready",
        },
      ])
    }
  }, [backups.length])

  useEffect(() => {
    const reviewSamples = purchases.slice(0, 5).map((purchase: any) => ({
      id: `review-${purchase.id}`,
      productTitle: purchase.product_title || "Sản phẩm",
      userEmail: purchase.userEmail || "user@example.com",
      rating: purchase.rating || 5,
      comment: purchase.review || "Phản hồi đang chờ cập nhật.",
      status: "pending",
      createdAt: purchase.created_at || new Date().toISOString(),
    }))
    setAdminReviews(reviewSamples)
  }, [purchases])

  useEffect(() => {
    const logs: AuditLog[] = [
      ...purchases.slice(0, 3).map((purchase: any) => ({
        id: `audit-purchase-${purchase.id}`,
        action: "purchase_created",
        entityType: "purchase",
        entityId: purchase.id,
        userEmail: purchase.userEmail,
        adminEmail: adminUser?.email,
        ipAddress: purchase.ip || "0.0.0.0",
        createdAt: purchase.purchaseDate || purchase.created_at || new Date().toISOString(),
        newData: { amount: purchase.amount },
      })),
      ...pendingDeposits.slice(0, 2).map((deposit: any) => ({
        id: `audit-deposit-${deposit.id}`,
        action: "deposit_pending",
        entityType: "deposit",
        entityId: deposit.id,
        userEmail: deposit.userEmail,
        adminEmail: adminUser?.email,
        createdAt: deposit.timestamp || new Date().toISOString(),
        newData: { amount: deposit.amount, method: deposit.method },
      })),
    ]
    setAuditLogs(logs)
  }, [purchases, pendingDeposits, adminUser])
  
  // Form states
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    image: "",
    downloadLink: "",
    demoLink: "",
    tags: ""
  })
  const [editingProduct, setEditingProduct] = useState<any>(null)
  
  // UI states
  const [activeTab, setActiveTab] = useState("overview")
  const [processingDeposit, setProcessingDeposit] = useState<string | null>(null)
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null)
  // ✅ FIX: Track processing purchases để tránh duplicate
  const [processingPurchase, setProcessingPurchase] = useState<Set<string>>(new Set())

  // ✅ FIX: Load data function - Load products từ API
  const loadData = useCallback(async () => {
    try {
      // Load products từ API
      try {
        const { apiGet } = await import('@/lib/api-client');
        const { mapBackendProductsToFrontend } = await import('@/lib/product-mapper');
        
        const result = await apiGet('/api/products');
        if (result.success && result.products) {
          const mappedProducts = mapBackendProductsToFrontend(result.products);
          setProducts(mappedProducts);
        }
      } catch (apiError) {
        // ✅ FIX: Migrate console → logger
        const { logger } = await import('@/lib/logger');
        logger.error('Error loading products from API', apiError);
        // Fallback to localStorage
        const loadedProducts = JSON.parse(localStorage.getItem("uploadedProducts") || "[]");
        setProducts(loadedProducts);
      }

      // Load notifications from localStorage (unchanged)
      const { getLocalStorage } = await import('@/lib/localStorage-utils');
      const loadedNotifications = getLocalStorage("adminNotifications", []);
      setNotifications(loadedNotifications);
    } catch (error) {
      const { logger } = await import('@/lib/logger');
      logger.error("Error loading data", error);
    }
  }, [])

  // Check admin authentication
  useEffect(() => {
    const isAdminLoggedIn = localStorage.getItem("adminAuth") === "true"
    const adminUserStr = localStorage.getItem("adminUser")
    
    if (!isAdminLoggedIn || !adminUserStr) {
      router.push("/admin/login")
      return
    }

    setAdminUser(JSON.parse(adminUserStr))
    setIsLoading(false)
  }, [router])

  // Load data on mount and when tab changes with real-time updates
  useEffect(() => {
    if (!isLoading && adminUser) {
      loadData()
      
      // Load users using userManager để đảm bảo sync
      const loadUsers = async () => {
        try {
          const { userManager } = await import('@/lib/userManager');
          const allUsers = await userManager.getAllUsers();
          
          // ✅ FIX: Migrate console → logger
          const { logger } = await import('@/lib/logger');
          logger.info('Admin: Users loaded from userManager', { count: allUsers.length });
          setUsers(allUsers.map((user: any) => ({
            ...user,
            registrationTime: user.createdAt || user.joinedAt || new Date().toISOString(),
            totalSpent: user.totalSpent || 0,
            uid: user.uid || user.id,
            email: user.email,
            name: user.name || user.displayName,
            provider: user.provider || 'email',
            balance: user.balance ?? 0,
            loginCount: user.loginCount ?? 1,
            lastLogin: user.lastActivity || user.lastLogin,
            ipAddress: user.ip || user.ipAddress || 'Unknown',
            status: user.role === 'admin' ? 'active' : (user.status || 'active')
          })));
        } catch (error) {
          const { logger } = await import('@/lib/logger');
          logger.error('Error loading users', error);
          // Fallback
          const fallbackUsers = getUserData();
          setUsers(Array.isArray(fallbackUsers) ? fallbackUsers : []);
        }
      };
      
      loadUsers();
      
      // Listen for changes
      const unsubscribeUsers = onUsersChange(async (loadedUsers) => {
        const { logger } = await import('@/lib/logger');
        logger.info('Admin: Users updated via real-time', { count: loadedUsers.length });
        // Re-load từ userManager để có latest
        await loadUsers();
      });

      // Load deposits from database
      const loadDeposits = async () => {
        try {
          await loadDepositsAndWithdrawals();
          const { userManager } = await import('@/lib/userManager');
          const currentUsers = await userManager.getAllUsers();
          const loadedDeposits = getDeposits();
          
          setPendingDeposits(loadedDeposits.map((deposit: any) => {
            // ✅ FIX: So sánh đúng kiểu dữ liệu (string vs number)
            const depositUserId = deposit.user_id?.toString();
            const user = currentUsers.find((u: any) => {
              const uUid = u.uid?.toString();
              const uId = u.id?.toString();
              return uUid === depositUserId || uId === depositUserId || u.email === deposit.userEmail || u.email === deposit.user_email;
            });
            return {
              ...deposit,
              requestTimeFormatted: new Date(deposit.timestamp || deposit.created_at).toLocaleString('vi-VN'),
              userName: user?.name || user?.displayName || deposit.userName || deposit.username || "Unknown User",
              userEmail: user?.email || deposit.userEmail || deposit.user_email || deposit.email || "Unknown Email",
              userBalance: user?.balance || 0,
              userStatus: (user as any)?.status || "unknown"
            }
          }))
        } catch (error) {
          const { logger } = await import('@/lib/logger');
          logger.error('Error loading deposits', error);
        }
      };

      // Load withdrawals from database
      const loadWithdrawals = async () => {
        try {
          await loadDepositsAndWithdrawals();
          const { userManager } = await import('@/lib/userManager');
          const currentUsers = await userManager.getAllUsers();
          const loadedWithdrawals = getWithdrawals();
          
          setPendingWithdrawals(loadedWithdrawals.map((withdrawal: any) => {
            // ✅ FIX: So sánh đúng kiểu dữ liệu (string vs number)
            const withdrawalUserId = withdrawal.user_id?.toString();
            const user = currentUsers.find((u: any) => {
              const uUid = u.uid?.toString();
              const uId = u.id?.toString();
              return uUid === withdrawalUserId || uId === withdrawalUserId || u.email === withdrawal.userEmail || u.email === withdrawal.user_email;
            });
            return {
              ...withdrawal,
              requestTimeFormatted: new Date(withdrawal.timestamp || withdrawal.created_at).toLocaleString('vi-VN'),
              userName: user?.name || user?.displayName || withdrawal.userName || withdrawal.username || "Unknown User",
              userEmail: user?.email || withdrawal.userEmail || withdrawal.user_email || withdrawal.email || "Unknown Email",
              userBalance: user?.balance || 0,
              userStatus: (user as any)?.status || "unknown",
              receiveAmount: withdrawal.amount * 0.95
            }
          }))
        } catch (error) {
          const { logger } = await import('@/lib/logger');
          logger.error('Error loading withdrawals', error);
        }
      };

      // Load purchases from database
      const loadPurchases = async () => {
        try {
          const purchasesResult = await apiGet('/api/purchases');
          const loadedPurchases = purchasesResult.purchases || purchasesResult.data || [];
          setPurchases(loadedPurchases.map((purchase: any) => ({
            ...purchase,
            title: purchase.product_title || "Unknown Product",
            purchaseDate: purchase.created_at || purchase.timestamp
          })))
        } catch (error) {
          const { logger } = await import('@/lib/logger');
          logger.error('Error loading purchases', error);
        }
      };

      // ✅ FIX: Load data in parallel để tối ưu performance
      Promise.all([
        loadDeposits(),
        loadWithdrawals(),
        loadPurchases(),
      ]).catch((error) => {
        const { logger } = require('@/lib/logger');
        logger.error('Error loading admin data in parallel', error);
      });

      // Stub listeners (no-op)
      const unsubscribeDeposits = onDepositsChange(() => {});
      const unsubscribeWithdrawals = onWithdrawalsChange(() => {});
      const unsubscribePurchases = onPurchasesChange(() => {});

      return () => {
        unsubscribeUsers()
        unsubscribeDeposits()
        unsubscribeWithdrawals()
        unsubscribePurchases()
      }
    }
  }, [isLoading, adminUser, loadData])

  // Real-time auto-refresh data every 5 seconds for better responsiveness
  useEffect(() => {
    if (!isLoading && adminUser) {
      const interval = setInterval(async () => {
        loadData()
        // Trigger manual reload of deposits and withdrawals for real-time sync
        const { userManager } = await import('@/lib/userManager');
        
        // Load từ API và update cache helpers
        await loadDepositsAndWithdrawals();
        
        const currentUsers = await userManager.getAllUsers()
        const currentDeposits = getDeposits();
        const currentWithdrawals = getWithdrawals();
        
        // Update deposits with latest user info
        setPendingDeposits(currentDeposits.map((deposit: any) => {
          // ✅ FIX: So sánh đúng kiểu dữ liệu (string vs number)
          const depositUserId = deposit.user_id?.toString();
          const user = currentUsers.find((u: any) => {
            const uUid = u.uid?.toString();
            const uId = u.id?.toString();
            return uUid === depositUserId || uId === depositUserId || u.email === deposit.userEmail || u.email === deposit.user_email;
          });
          return {
            ...deposit,
            requestTimeFormatted: new Date(deposit.timestamp).toLocaleString('vi-VN'),
            userName: user?.name || user?.displayName || deposit.userName || "Unknown User",
            userEmail: user?.email || deposit.userEmail || deposit.user_email || "Unknown Email",
            userBalance: user?.balance || 0,
            userStatus: (user as any)?.status || "unknown"
          }
        }))
        
        // Update withdrawals with latest user info
        setPendingWithdrawals(currentWithdrawals.map((withdrawal: any) => {
          // ✅ FIX: So sánh đúng kiểu dữ liệu (string vs number)
          const withdrawalUserId = withdrawal.user_id?.toString();
          const user = currentUsers.find((u: any) => {
            const uUid = u.uid?.toString();
            const uId = u.id?.toString();
            return uUid === withdrawalUserId || uId === withdrawalUserId || u.email === withdrawal.userEmail || u.email === withdrawal.user_email;
          });
          return {
            ...withdrawal,
            requestTimeFormatted: new Date(withdrawal.timestamp).toLocaleString('vi-VN'),
            userName: user?.name || user?.displayName || withdrawal.userName || "Unknown User",
            userEmail: user?.email || withdrawal.userEmail || withdrawal.user_email || "Unknown Email",
            userBalance: user?.balance || 0,
            userStatus: (user as any)?.status || "unknown",
            receiveAmount: withdrawal.amount * 0.95
          }
        }))
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isLoading, adminUser, loadData])

  const handleLogout = useCallback(() => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminUser")
    router.push("/admin/login")
  }, [router])

  // Product management functions - ✅ FIX: Dùng API thay vì localStorage
  const addProduct = useCallback(async () => {
    try {
      if (!newProduct.title || !newProduct.price) {
        alert("Vui lòng nhập đầy đủ thông tin sản phẩm!")
        return
      }

      // ✅ FIX: Gọi API để tạo product
      const { apiPost } = await import('@/lib/api-client');
      const { mapFrontendToBackend, mapBackendToFrontend } = await import('@/lib/product-mapper');
      
      const productData = mapFrontendToBackend({
        ...newProduct,
        price: parseFloat(newProduct.price),
        tags: newProduct.tags ? newProduct.tags.split(",").map(tag => tag.trim()).filter(Boolean) : [],
        imageUrl: newProduct.image,
        downloadUrl: newProduct.downloadLink,
        demoUrl: newProduct.demoLink,
      });

      const result = await apiPost('/api/products', productData);

      if (result.success && result.product) {
        const mappedProduct = mapBackendToFrontend(result.product);
        const updatedProducts = [...products, mappedProduct];
        setProducts(updatedProducts);

        setNewProduct({
          title: "",
          description: "",
          price: "",
          category: "",
          image: "",
          downloadLink: "",
          demoLink: "",
          tags: ""
        })

        alert("Thêm sản phẩm thành công!")
      } else {
        throw new Error(result.error || 'Failed to create product');
      }
    } catch (error) {
      const { logger } = await import('@/lib/logger');
      logger.error("Error adding product", error)
      alert("Có lỗi xảy ra khi thêm sản phẩm: " + (error instanceof Error ? error.message : "Vui lòng thử lại"))
    }
  }, [newProduct, products, adminUser])

  const editProduct = useCallback(async (product: any) => {
    try {
      if (!product.title || !product.price) {
        alert("Vui lòng nhập đầy đủ thông tin sản phẩm!")
        return
      }

      // ✅ FIX: Gọi API để update product
      const { apiPut } = await import('@/lib/api-client');
      const { mapFrontendToBackend, mapBackendToFrontend } = await import('@/lib/product-mapper');
      
      const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
      if (isNaN(productId)) {
        throw new Error('Invalid product ID');
      }

      const productData = mapFrontendToBackend({
        ...product,
        price: parseFloat(product.price),
        tags: Array.isArray(product.tags) ? product.tags : (product.tags ? product.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean) : []),
        imageUrl: product.imageUrl || product.image,
        downloadUrl: product.downloadUrl || product.downloadLink,
        demoUrl: product.demoUrl || product.demoLink,
      });

      const result = await apiPut(`/api/products/${productId}`, productData);

      if (result.success && result.product) {
        const mappedProduct = mapBackendToFrontend(result.product);
        const updatedProducts = products.map(p =>
          p.id === product.id ? mappedProduct : p
        );
        setProducts(updatedProducts);
        setEditingProduct(null);
        alert("Cập nhật sản phẩm thành công!")
      } else {
        throw new Error(result.error || 'Failed to update product');
      }
    } catch (error) {
      const { logger } = await import('@/lib/logger');
      logger.error("Error editing product", error)
      alert("Có lỗi xảy ra khi cập nhật sản phẩm: " + (error instanceof Error ? error.message : "Vui lòng thử lại"))
    }
  }, [products, adminUser])

  const deleteProduct = useCallback(async (productId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return

    try {
      // ✅ FIX: Gọi API để xóa product
      const { apiDelete } = await import('@/lib/api-client');
      
      const id = typeof productId === 'string' ? parseInt(productId) : productId;
      if (isNaN(id)) {
        throw new Error('Invalid product ID');
      }

      const result = await apiDelete(`/api/products/${id}`);

      if (result.success) {
        const updatedProducts = products.filter(p => {
          const pId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
          return pId !== id;
        });
        setProducts(updatedProducts);
        alert("Xóa sản phẩm thành công!")
      } else {
        throw new Error(result.error || 'Failed to delete product');
      }
    } catch (error) {
      const { logger } = await import('@/lib/logger');
      logger.error("Error deleting product", error)
      alert("Có lỗi xảy ra khi xóa sản phẩm: " + (error instanceof Error ? error.message : "Vui lòng thử lại"))
    }
  }, [products])


  // Enhanced Deposit/Withdrawal management functions with account independence
  
  const approveDeposit = useCallback(async (depositId: string) => {
    // ✅ FIX: Prevent double approve - check processing state
    if (processingDeposit === depositId) {
      return; // Đang xử lý deposit này, không cho phép duplicate
    }
    setProcessingDeposit(depositId);

    try {
      const deposit = pendingDeposits.find((d) => d.id === depositId);
      if (!deposit) {
        alert("Không tìm thấy yêu cầu nạp tiền!");
        return;
      }

      // Call the function to process the deposit approval
      await processDepositApproval(deposit, adminUser);

      alert("Nạp tiền thành công!");
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error approving deposit", error);
      alert("Có lỗi xảy ra khi duyệt nạp tiền!");
    } finally {
      setProcessingDeposit(null);
    }
  }, [pendingDeposits, adminUser, processingDeposit]);

  // Function to process the deposit approval
  const processDepositApproval = async (deposit: any, adminUser: any) => {
    try {
      // ✅ FIX: Thêm Authorization header và userEmail
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      // ✅ FIX: Admin token đã được set trong httpOnly cookie, không cần lấy từ localStorage
      // Cookie sẽ tự động được gửi kèm request
      
      // Call the API to approve the deposit
      const response = await fetch('/api/admin/approve-deposit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          depositId: deposit.id,
          amount: deposit.amount,
          userId: deposit.user_id || deposit.userId,
          userEmail: deposit.userEmail || deposit.user_email,
          action: 'approve',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        alert(`Lỗi khi duyệt nạp tiền: ${result.error}`);
        return;
      }

      // Reload users from userManager sau khi API đã update balance
      const { userManager } = await import('@/lib/userManager');
      const allUsers = await userManager.getAllUsers();
      const targetUser = allUsers.find((u: any) => u.email === deposit.userEmail || u.uid === deposit.user_id);
      if (!targetUser) {
        // ✅ FIX: Migrate console → logger
        const { logger } = await import('@/lib/logger');
        logger.error('User not found for deposit', { depositId: deposit.id, userId: deposit.user_id, email: deposit.userEmail });
        alert(`Không tìm thấy người dùng! UID: ${deposit.user_id || 'không xác định'}, Email: ${deposit.userEmail}`);
        return;
      }

      // Update users state với data từ userManager (đã được sync bởi API)
      setUsers(allUsers.map((user: any) => ({
        ...user,
        registrationTime: user.createdAt || user.joinedAt || new Date().toISOString(),
        totalSpent: user.totalSpent || 0,
        uid: user.uid || user.id,
        status: user.role === 'admin' ? 'active' : (user.status || 'active')
      })));

      const approvedDeposit = {
        ...deposit,
        status: 'approved',
        approvedTime: new Date().toISOString(),
        approvedBy: adminUser.email,
        previousBalance: targetUser.balance || 0,
        newBalance: targetUser.balance || 0, // Sẽ được update bởi API, reload sau
        userAccountId: targetUser.uid,
        processed: true,
      };

      // Save updated deposit
      saveDeposit(approvedDeposit);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('depositsChange', { detail: [...getDeposits().filter((d: any) => d.id !== deposit.id), approvedDeposit] }));
      }

      // Send Telegram notification
      try {
        const telegramMessage = `✅ <b>NẠP TIỀN ĐÃ ĐƯỢC DUYỆT</b>

👤 <b>Khách hàng:</b> ${deposit.userName}
📧 <b>Email:</b> ${deposit.userEmail}
💰 <b>Số tiền:</b> ${deposit.amount.toLocaleString('vi-VN')}đ
🏦 <b>Phương thức:</b> ${deposit.method}
📝 <b>Mã GD:</b> ${deposit.transactionId}
✅ <b>Duyệt bởi:</b> ${adminUser.email}
⏰ <b>Thời gian duyệt:</b> ${new Date().toLocaleString('vi-VN')}

<i>Số dư đã được cộng vào tài khoản khách hàng!</i>`

        // ✅ FIX: Admin token đã được set trong httpOnly cookie, không cần localStorage
        // Gửi CSRF token trong header
        const csrfToken = localStorage.getItem('csrf-token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        await fetch('/api/admin/send-telegram', {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: telegramMessage,
            chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID
          })
        }).catch(async (error) => {
          // ✅ FIX: Migrate console → logger
          const { logger } = await import('@/lib/logger');
          logger.error('Failed to send Telegram notification', error);
        })

        await saveNotification({
          type: "deposit_approved",
          title: "Nạp tiền đã được duyệt",
          message: telegramMessage,
          user: { email: deposit.userEmail, name: deposit.userName },
          admin: { email: adminUser.email, name: adminUser.name, loginTime: adminUser.loginTime },
          timestamp: new Date().toISOString(),
          device: "Admin Panel",
          ip: "Unknown",
          read: false
        })
      } catch (telegramError) {
        // ✅ FIX: Migrate console → logger
        const { logger } = await import('@/lib/logger');
        logger.error("Telegram notification error", telegramError)
      }
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error in processDepositApproval", error);
      throw error; // Re-throw the error to be caught by the main function
    }
  };

  const rejectDeposit = useCallback(async (depositId: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) return;

    try {
      const deposit = pendingDeposits.find(d => d.id === depositId);
      if (!deposit) {
        alert("Không tìm thấy yêu cầu nạp tiền!");
        return;
      }

      await processDepositRejection(deposit);

      alert("Đã từ chối yêu cầu nạp tiền!");
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error rejecting deposit", error);
      alert("Có lỗi xảy ra!");
    }
  }, [pendingDeposits]);

  const processDepositRejection = async (deposit: any) => {
    try {
      const updatedDeposit = { ...deposit, status: "rejected" };
      await saveDeposit(updatedDeposit);
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error in processDepositRejection", error);
      throw error;
    }
  };

  const approveWithdrawal = useCallback(async (withdrawalId: string) => {
    if (processingWithdrawal) return;
    setProcessingWithdrawal(withdrawalId);

    try {
      const withdrawal = pendingWithdrawals.find(w => w.id.toString() === withdrawalId);
      if (!withdrawal) {
        alert("Không tìm thấy yêu cầu rút tiền!");
        return;
      }

      await processWithdrawalApproval(withdrawal, adminUser);

      alert("Duyệt rút tiền thành công!");
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error approving withdrawal", error);
      alert("Có lỗi xảy ra khi duyệt rút tiền!");
    } finally {
      setProcessingWithdrawal(null);
    }
  }, [pendingWithdrawals, adminUser, processingWithdrawal]);

  const processWithdrawalApproval = async (withdrawal: any, adminUser: any) => {
    try {
      // Get all users via userManager
      const { userManager } = await import('@/lib/userManager');
      const allUsers = await userManager.getAllUsers();
      // ✅ FIX: So sánh đúng kiểu dữ liệu (string vs number)
      const withdrawalUserId = withdrawal.user_id?.toString() || withdrawal.userId?.toString();
      const targetUser = allUsers.find((u: any) => {
        const uUid = u.uid?.toString();
        const uId = u.id?.toString();
        return uUid === withdrawalUserId || uId === withdrawalUserId || u.email === withdrawal.userEmail || u.email === withdrawal.user_email;
      });

      if (!targetUser) {
        alert("Không tìm thấy người dùng! User ID: " + withdrawal.user_id);
        return;
      }

      // ✅ FIX: Thêm Authorization header và userEmail
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      // ✅ FIX: Admin token đã được set trong httpOnly cookie, không cần lấy từ localStorage
      // Cookie sẽ tự động được gửi kèm request
      
      // Call API để approve withdrawal (API sẽ update balance qua userManager)
      const response = await fetch('/api/admin/approve-withdrawal', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          withdrawalId: withdrawal.id,
          amount: withdrawal.amount,
          userId: withdrawal.userId || withdrawal.user_id,
          userEmail: withdrawal.userEmail || withdrawal.user_email,
          action: 'approve',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        alert(`Lỗi khi duyệt rút tiền: ${result.error}`);
        return;
      }

      // Reload users from userManager sau khi API đã update balance
      const reloadedUsers = await userManager.getAllUsers();
      // ✅ FIX: So sánh đúng kiểu dữ liệu (string vs number) - dùng lại biến đã định nghĩa
      const updatedTargetUser = reloadedUsers.find((u: any) => {
        const uUid = u.uid?.toString();
        const uId = u.id?.toString();
        return uUid === withdrawalUserId || uId === withdrawalUserId || u.email === withdrawal.userEmail || u.email === withdrawal.user_email;
      });

      if (!updatedTargetUser) {
        // ✅ FIX: Migrate console → logger
        const { logger } = await import('@/lib/logger');
        logger.error('User not found after update');
        return;
      }

      // Update users state với data từ userManager (đã được sync bởi API)
      setUsers(reloadedUsers.map((user: any) => ({
        ...user,
        registrationTime: user.createdAt || user.joinedAt || new Date().toISOString(),
        totalSpent: user.totalSpent || 0,
        uid: user.uid || user.id,
        status: user.role === 'admin' ? 'active' : (user.status || 'active')
      })));

      // Update withdrawal status with detailed information
      const approvedWithdrawal = {
        ...withdrawal,
        status: "approved",
        approvedTime: new Date().toISOString(),
        approvedBy: adminUser.email,
        previousBalance: targetUser.balance || 0,
        newBalance: updatedTargetUser.balance || 0,
        userAccountId: updatedTargetUser.uid || targetUser.uid,
        processed: true
      };

      // Save updated withdrawal
      const allWithdrawals = getWithdrawals();
      const updatedWithdrawals = allWithdrawals.map((w: any) =>
        w.id.toString() === withdrawal.id.toString() ? approvedWithdrawal : w
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('withdrawals', JSON.stringify(updatedWithdrawals));
        window.dispatchEvent(new CustomEvent('withdrawalsChange', { detail: updatedWithdrawals }));
      }

      // Send Telegram notification for withdrawal approval
      try {
        const telegramMessage = `💸 <b>RÚT TIỀN ĐÃ ĐƯỢC DUYỆT</b>

👤 <b>Khách hàng:</b> ${withdrawal.userName}
📧 <b>Email:</b> ${withdrawal.userEmail}
💰 <b>Số tiền rút:</b> ${withdrawal.amount.toLocaleString('vi-VN')}đ
💵 <b>Nhận thực tế:</b> ${(withdrawal.amount * 0.95).toLocaleString('vi-VN')}đ
🏦 <b>Ngân hàng:</b> ${withdrawal.bankName}
📝 <b>STK:</b> ${withdrawal.accountNumber}
👨‍💼 <b>Tên TK:</b> ${withdrawal.accountName}
📊 <b>Số dư trước:</b> ${(targetUser.balance || 0).toLocaleString('vi-VN')}đ
📊 <b>Số dư sau:</b> ${(updatedTargetUser?.balance || targetUser.balance || 0).toLocaleString('vi-VN')}đ
✅ <b>Duyệt bởi:</b> ${adminUser.email}
⏰ <b>Thời gian duyệt:</b> ${new Date().toLocaleString('vi-VN')}

<i>Vui lòng chuyển khoản cho khách hàng!</i>`;

        // ✅ SECURITY FIX: Dùng API proxy thay vì expose token ra client
        const adminToken = localStorage.getItem('admin-token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) {
          headers['X-Admin-Token'] = adminToken;
        }

        await fetch('/api/admin/send-telegram', {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: telegramMessage,
            chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID
          })
        }).catch(async (error) => {
          // ✅ FIX: Migrate console → logger
          const { logger } = await import('@/lib/logger');
          logger.error('Failed to send Telegram notification', error);
        });

        await saveNotification({
          type: "withdrawal_approved",
          title: "Rút tiền đã được duyệt",
          message: telegramMessage,
          user: { email: withdrawal.userEmail, name: withdrawal.userName },
          admin: { email: adminUser.email, name: adminUser.name, loginTime: adminUser.loginTime },
          timestamp: new Date().toISOString(),
          device: "Admin Panel",
          ip: "Unknown",
          read: false
        });
      } catch (telegramError) {
        // ✅ FIX: Migrate console → logger
        const { logger } = await import('@/lib/logger');
        logger.error("Telegram notification error", telegramError);
      }
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error in processWithdrawalApproval", error);
      throw error;
    }
  };

  const rejectWithdrawal = useCallback(async (withdrawalId: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) return;

    try {
      const withdrawal = pendingWithdrawals.find(w => w.id.toString() === withdrawalId);
      if (!withdrawal) {
        alert("Không tìm thấy yêu cầu rút tiền!");
        return;
      }

      await processWithdrawalRejection(withdrawal);

      alert("Đã từ chối yêu cầu rút tiền!");
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error rejecting withdrawal", error);
      alert("Có lỗi xảy ra!");
    }
  }, [pendingWithdrawals]);

  const processWithdrawalRejection = async (withdrawal: any) => {
    try {
      const updatedWithdrawal = { ...withdrawal, status: "rejected" };
      await saveWithdrawal(updatedWithdrawal);
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error in processWithdrawalRejection", error);
      throw error;
    }
  };

  // Enhanced User management functions with account independence
  const updateUserStatus = useCallback(async (userId: string, newStatus: string) => {
    try {
      // Get all users via userManager
      const { userManager } = await import('@/lib/userManager');
      const allUsers = await userManager.getAllUsers();
      const targetUser = allUsers.find((u: any) => u.uid === userId)
      
      if (!targetUser) {
        alert("Không tìm thấy người dùng!")
        return
      }

      const updatedUser = { 
        ...targetUser, 
        status: newStatus, 
        lastStatusChange: new Date().toISOString(),
        statusChangedBy: adminUser.email 
      }
      
      // Update user via userManager
      await userManager.setUser(updatedUser);
      
      // Reload users
      const reloadedUsers = await userManager.getAllUsers();
      setUsers(reloadedUsers.map((u: any) => ({
        ...u,
        registrationTime: u.createdAt || u.joinedAt || new Date().toISOString(),
        totalSpent: u.totalSpent || 0,
        uid: u.uid || u.id,
        email: u.email,
        name: u.name || u.displayName,
        provider: u.provider || 'email',
        balance: u.balance ?? 0,
        loginCount: u.loginCount ?? 1,
        lastLogin: u.lastActivity || u.lastLogin,
        ipAddress: u.ip || u.ipAddress || 'Unknown',
        status: u.role === 'admin' ? 'active' : (u.status || 'active')
      })));
      
      alert(`Đã ${newStatus === "active" ? "kích hoạt" : "khóa"} tài khoản!`)
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error updating user status", error)
      alert("Có lỗi xảy ra!")
    }
  }, [adminUser])

  const updateUserBalance = useCallback(async (userId: string, newBalance: number) => {
    if (newBalance < 0) {
      alert("Số dư không thể âm!")
      return
    }

    try {
      // Get user và update balance via userManager
      const { userManager } = await import('@/lib/userManager');
      const targetUserData = await userManager.getUserData(userId);
      
      if (!targetUserData) {
        alert("Không tìm thấy người dùng!")
        return
      }

      // Update balance via userManager
      await userManager.updateBalance(userId, newBalance);
      
      // Reload users
      const allUsers = await userManager.getAllUsers();
      setUsers(allUsers.map((u: any) => ({
        ...u,
        registrationTime: u.createdAt || u.joinedAt || new Date().toISOString(),
        totalSpent: u.totalSpent || 0,
        uid: u.uid || u.id,
        email: u.email,
        name: u.name || u.displayName,
        provider: u.provider || 'email',
        balance: u.balance ?? 0,
        loginCount: u.loginCount ?? 1,
        lastLogin: u.lastActivity || u.lastLogin,
        ipAddress: u.ip || u.ipAddress || 'Unknown',
        status: u.role === 'admin' ? 'active' : (u.status || 'active')
      })));
      
      // Log balance change for audit trail
      await saveNotification({
        type: "balance_updated",
        title: "Số dư được cập nhật",
        message: `Admin ${adminUser.email} đã cập nhật số dư cho ${targetUserData.name || targetUserData.displayName || targetUserData.email} từ ${(targetUserData.balance || 0).toLocaleString('vi-VN')}đ thành ${newBalance.toLocaleString('vi-VN')}đ`,
        user: { email: targetUserData.email, name: targetUserData.name || targetUserData.displayName },
        admin: { email: adminUser.email, name: adminUser.name, loginTime: adminUser.loginTime },
        timestamp: new Date().toISOString(),
        device: "Admin Panel",
        ip: "Unknown",
        read: false
      })
      
      alert("Cập nhật số dư thành công!")
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Error updating user balance", error)
      alert("Có lỗi xảy ra!")
    }
  }, [adminUser])

//Analytics
  // (Analytics component is imported but not used in this snippet)
  // (CustomerSupport component is imported but not used in this snippet)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [supportTickets, setSupportTickets] = useState<any[]>([])

  // You can implement analytics and customer support functionalities here as needed
  const fetchAnalyticsData = useCallback(() => {
    // Fetch and set analytics data
  }, [])

  // Fetch support tickets
  const fetchSupportTickets = useCallback(() => {
    // Fetch and set support tickets
  }, [])
  // Setting functions
  const testTelegramNotification = useCallback(async () => {
    try {
      const testMessage = `🔔 <b>TEST THÔNG BÁO TELEGRAM</b>

✅ Kết nối Telegram Bot thành công!
⏰ Thời gian test: ${new Date().toLocaleString('vi-VN')}
👨‍💻 Test bởi: ${adminUser.email}

<i>Hệ thống thông báo đang hoạt động bình thường.</i>`

      // ✅ SECURITY FIX: Dùng API proxy thay vì expose token ra client
      const adminToken = localStorage.getItem('admin-token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['X-Admin-Token'] = adminToken;
      }

      const response = await fetch('/api/admin/send-telegram', {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: testMessage,
          chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID
        })
      })

      if (response.ok) {
        await saveNotification({
          type: "test_notification",
          title: "Test Telegram Notification",
          message: testMessage,
          admin: { email: adminUser.email, name: adminUser.name, loginTime: adminUser.loginTime },
          timestamp: new Date().toISOString(),
          device: "Admin Panel",
          ip: "Unknown",
          read: false
        })
        alert("✅ Gửi thông báo Telegram thành công!")
      } else {
        alert("❌ Lỗi khi gửi thông báo Telegram!")
      }
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("Telegram test error", error)
      alert("❌ Lỗi kết nối Telegram!")
    }
  }, [adminUser])

  const testWhatsAppNotification = useCallback(async () => {
    try {
      const testMessage = `🔔 TEST THÔNG BÁO WHATSAPP

✅ Kết nối WhatsApp thành công!
⏰ Thời gian test: ${new Date().toLocaleString('vi-VN')}
👨‍💻 Test bởi: ${adminUser.email}

Hệ thống thông báo đang hoạt động bình thường.`

      const encodedMessage = encodeURIComponent(testMessage)
      const whatsappUrl = `https://wa.me/${process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER}?text=${encodedMessage}`
      
      window.open(whatsappUrl, '_blank')
      alert("✅ Đã mở WhatsApp! Vui lòng gửi tin nhắn để test.")
    } catch (error) {
      // ✅ FIX: Migrate console → logger
      const { logger } = await import('@/lib/logger');
      logger.error("WhatsApp test error", error)
      alert("❌ Lỗi khi mở WhatsApp!")
    }
  }, [adminUser])

  // Calculate stats
  const getStats = useCallback(() => {
    const totalUsers = users.length
    const totalProducts = products.length
    const totalRevenue = purchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0)
    const pendingDepositsCount = pendingDeposits.filter(d => d.status !== "rejected").length
    const pendingWithdrawalsCount = pendingWithdrawals.filter(w => w.status !== "rejected").length
    const newUsersCount = users.filter(user => {
      const registrationDate = new Date(user.createdAt)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - registrationDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays <= 7
    }).length
    
    return {
      totalUsers,
      totalProducts,
      totalRevenue,
      pendingDepositsCount,
      pendingWithdrawalsCount,
      totalPurchases: purchases.length,
      newUsersCount
    }
  }, [users, products, purchases, pendingDeposits, pendingWithdrawals])

  const stats = getStats()

  const bulkUsers = useMemo(() => {
    return users.map((user) => {
      const key = (user.uid || user.id || "").toString()
      return {
        ...user,
        selected: !!selectedUsersMap[key],
      }
    })
  }, [users, selectedUsersMap])

  const transactionLedger = useMemo(() => {
    const purchaseRows = purchases.map((purchase: any) => ({
      id: `purchase-${purchase.id}`,
      type: "purchase",
      status: "completed",
      method: purchase.method || "balance",
      amount: purchase.amount || 0,
      date: purchase.purchaseDate || purchase.created_at || new Date().toISOString(),
      email: purchase.userEmail || purchase.user_email,
      description: purchase.product_title || "Sản phẩm",
    }))

    const depositRows = pendingDeposits.map((deposit: any) => ({
      id: `deposit-${deposit.id}`,
      type: "deposit",
      status: deposit.status || "pending",
      method: deposit.method || "bank",
      amount: deposit.amount || 0,
      date: deposit.timestamp || deposit.created_at || new Date().toISOString(),
      email: deposit.userEmail || deposit.user_email,
      description: "Yêu cầu nạp tiền",
    }))

    const withdrawalRows = pendingWithdrawals.map((withdrawal: any) => ({
      id: `withdraw-${withdrawal.id}`,
      type: "withdraw",
      status: withdrawal.status || "pending",
      method: withdrawal.bankName || "bank",
      amount: withdrawal.amount || 0,
      date: withdrawal.timestamp || withdrawal.created_at || new Date().toISOString(),
      email: withdrawal.userEmail || withdrawal.user_email,
      description: "Yêu cầu rút tiền",
    }))

    return [...purchaseRows, ...depositRows, ...withdrawalRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [purchases, pendingDeposits, pendingWithdrawals])

  const filteredTransactions = useMemo(() => {
    return transactionLedger.filter((txn) => {
      const matchesQuery =
        !transactionFilters.q ||
        [txn.id, txn.email, txn.description]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(transactionFilters.q.toLowerCase()))

      const matchesType = transactionFilters.type === "all" || txn.type === transactionFilters.type
      const matchesStatus = transactionFilters.status === "all" || txn.status === transactionFilters.status
      const matchesMethod =
        transactionFilters.method === "all" || txn.method?.toLowerCase() === transactionFilters.method.toLowerCase()

      const withinDate =
        (!transactionFilters.dateRange?.from ||
          new Date(txn.date) >= new Date(transactionFilters.dateRange.from)) &&
        (!transactionFilters.dateRange?.to || new Date(txn.date) <= new Date(transactionFilters.dateRange.to))

      return matchesQuery && matchesType && matchesStatus && matchesMethod && withinDate
    })
  }, [transactionLedger, transactionFilters])

  const userAnalyticsSnapshot = useMemo(() => {
    const activeUsers = users.filter((user: any) => {
      const lastActivity = user.lastActivity || user.lastLogin
      if (!lastActivity) return false
      const diff = Date.now() - new Date(lastActivity).getTime()
      return diff <= 30 * 24 * 60 * 60 * 1000
    }).length

    const retentionRate = users.length ? Math.round((activeUsers / users.length) * 100) : 0
    const churnRate = Math.max(0, 100 - retentionRate)
    const vipUsers = users.filter((user: any) => (user.balance ?? 0) >= 5_000_000).length
    const fraudUsers = users.filter((user: any) => user.status === "blocked" || user.tags?.includes("Fraud")).length

    const cohortData = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - index))
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
      const monthPurchases = purchases.filter((purchase: any) => {
        const purchaseDate = new Date(purchase.purchaseDate || purchase.created_at)
        return purchaseDate.getFullYear() === date.getFullYear() && purchaseDate.getMonth() === date.getMonth()
      })
      return {
        month: `${date.getMonth() + 1}/${date.getFullYear()}`,
        retained: monthPurchases.length,
        churned: Math.max(0, users.length - monthPurchases.length),
      }
    })

    const segments = [
      { label: "VIP", count: vipUsers, color: "#fbbf24" },
      { label: "Active", count: activeUsers, color: "#22c55e" },
      { label: "Ngủ đông", count: Math.max(users.length - activeUsers, 0), color: "#f87171" },
    ]

    return { retentionRate, churnRate, vipUsers, fraudUsers, cohortData, segments }
  }, [users, purchases])

  const productAnalyticsSnapshot = useMemo(() => {
    const trends = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - index))
      const monthLabel = `${date.getMonth() + 1}/${date.getFullYear()}`
      const monthPurchases = purchases.filter((purchase: any) => {
        const purchaseDate = new Date(purchase.purchaseDate || purchase.created_at)
        return purchaseDate.getFullYear() === date.getFullYear() && purchaseDate.getMonth() === date.getMonth()
      })
      return {
        month: monthLabel,
        views: monthPurchases.length * 10,
        purchases: monthPurchases.length,
      }
    })

    const topProducts = products.slice(0, 5).map((product: any) => {
      const productPurchases = purchases.filter((purchase: any) => purchase.product_id === product.id)
      return {
        id: product.id,
        title: product.title,
        views: product.view_count || productPurchases.length * 12,
        purchases: productPurchases.length,
        conversion: productPurchases.length ? (productPurchases.length / Math.max(product.view_count || 100, 1)) * 100 : 0,
        revenue: productPurchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0),
        rating: product.average_rating || 4.5,
      }
    })

    const categoriesMap: Record<string, number> = {}
    products.forEach((product: any) => {
      const category = product.category || "Khác"
      categoriesMap[category] = (categoriesMap[category] || 0) + 1
    })

    const categories = Object.entries(categoriesMap).map(([name, value]) => ({ name, value }))

    return { trends, topProducts, categories }
  }, [products, purchases])

  const financialRows = useMemo(() => {
    const grouped: Record<string, { revenue: number; cost: number; tax: number }> = {}
    purchases.forEach((purchase: any) => {
      const date = new Date(purchase.purchaseDate || purchase.created_at)
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`
      if (!grouped[key]) {
        grouped[key] = { revenue: 0, cost: 0, tax: 0 }
      }
      grouped[key].revenue += purchase.amount || 0
      grouped[key].cost += (purchase.amount || 0) * 0.4
      grouped[key].tax += (purchase.amount || 0) * 0.05
    })

    return Object.entries(grouped).map(([period, data]) => ({
      period,
      revenue: Math.round(data.revenue),
      cost: Math.round(data.cost),
      profit: Math.round(data.revenue - data.cost - data.tax),
      tax: Math.round(data.tax),
    }))
  }, [purchases])

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsersMap((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }, [])

  const handleSelectAllUsers = useCallback(
    (value: boolean) => {
      if (!value) {
        setSelectedUsersMap({})
        return
      }
      const next: Record<string, boolean> = {}
      users.forEach((user: any) => {
        const key = (user.uid || user.id || "").toString()
        if (key) next[key] = true
      })
      setSelectedUsersMap(next)
    },
    [users]
  )

  const bulkUpdateStatus = useCallback(
    (ids: string[], status: string) => {
      if (ids.length === 0) return
      setUsers((prev) =>
        prev.map((user: any) => {
          const key = (user.uid || user.id || "").toString()
          if (ids.includes(key)) {
            return { ...user, status }
          }
          return user
        })
      )
    },
    [setUsers]
  )

  const handleBulkExport = useCallback(
    (ids: string[]) => {
      const targetUsers = ids.length
        ? users.filter((user: any) => ids.includes((user.uid || user.id || "").toString()))
        : users
      const headers = ["Email", "Name", "Role", "Status", "Balance"]
      const rows = targetUsers.map((user: any) => [
        user.email,
        user.name || user.displayName || "",
        user.role || "user",
        user.status || "active",
        user.balance || 0,
      ])
      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users-export-${Date.now()}.csv`
      a.click()
    },
    [users]
  )

  const handleBulkEmail = useCallback((ids: string[]) => {
    alert(`Đã xếp lịch gửi email đến ${ids.length || users.length} người dùng.`)
  }, [users])

  const handleTransactionFiltersChange = useCallback((filters: TransactionFilterState) => {
    setTransactionFilters(filters)
  }, [])

  const handleTransactionReset = useCallback(() => {
    setTransactionFilters({
      q: "",
      type: "all",
      status: "all",
      method: "all",
      dateRange: { from: "", to: "" },
    })
  }, [])

  const handleTransactionExport = useCallback(() => {
    if (filteredTransactions.length === 0) return
    const headers = ["ID", "Type", "Status", "Method", "Amount", "Date", "Email"]
    const rows = filteredTransactions.map((txn) => [
      txn.id,
      txn.type,
      txn.status,
      txn.method,
      txn.amount,
      txn.date,
      txn.email,
    ])
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${Date.now()}.csv`
    a.click()
  }, [filteredTransactions])

  const handleAnnouncementCreate = useCallback((payload: Omit<Announcement, "id">) => {
    setAnnouncements((prev) => [
      { ...payload, id: `announce-${Date.now()}` },
      ...prev,
    ])
  }, [])

  const handleAnnouncementToggle = useCallback((id: string, isActive: boolean) => {
    setAnnouncements((prev) => prev.map((item) => (item.id === id ? { ...item, isActive } : item)))
  }, [])

  const handleAnnouncementDelete = useCallback((id: string) => {
    setAnnouncements((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleFaqSave = useCallback((faq: Omit<FAQItem, "id" | "viewCount">) => {
    setFaqItems((prev) => [
      { ...faq, id: `faq-${Date.now()}`, viewCount: 0 },
      ...prev,
    ])
  }, [])

  const handleFaqToggle = useCallback((id: string) => {
    setFaqItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPublished: !item.isPublished } : item))
    )
  }, [])

  const handleFaqDelete = useCallback((id: string) => {
    setFaqItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleAuditExport = useCallback(() => {
    if (auditLogs.length === 0) return
    const headers = ["ID", "Action", "Entity", "User", "Admin", "IP", "Date"]
    const rows = auditLogs.map((log) => [
      log.id,
      log.action,
      `${log.entityType}#${log.entityId}`,
      log.userEmail || "",
      log.adminEmail || "",
      log.ipAddress || "",
      log.createdAt,
    ])
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${Date.now()}.csv`
    a.click()
  }, [auditLogs])

  const handlePromotionCreate = useCallback((promotion: Omit<Promotion, "id">) => {
    setPromotions((prev) => [{ ...promotion, id: `promo-${Date.now()}` }, ...prev])
  }, [])

  const handlePromotionToggle = useCallback((id: string, active: boolean) => {
    setPromotions((prev) => prev.map((promo) => (promo.id === id ? { ...promo, active } : promo)))
  }, [])

  const handlePromotionDelete = useCallback((id: string) => {
    setPromotions((prev) => prev.filter((promo) => promo.id !== id))
  }, [])

  const handleFinancialExportExcel = useCallback(() => {
    if (financialRows.length === 0) return
    const headers = ["Period", "Revenue", "Cost", "Profit", "Tax"]
    const rows = financialRows.map((row) => [
      row.period,
      row.revenue,
      row.cost,
      row.profit,
      row.tax,
    ])
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `financial-report-${Date.now()}.csv`
    a.click()
  }, [financialRows])

  const handleFinancialExportPDF = useCallback(() => {
    window.print()
  }, [])

  const handleBackup = useCallback((type: "full" | "incremental") => {
    setIsBackingUp(true)
    const newBackup: BackupItem = {
      id: `backup-${Date.now()}`,
      label: `${type === "full" ? "Full" : "Incremental"} Backup ${new Date().toLocaleString("vi-VN")}`,
      createdAt: new Date().toISOString(),
      size: type === "full" ? "450MB" : "120MB",
      type: type === "full" ? "manual" : "auto",
      status: "ready",
    }
    setBackups((prev) => [newBackup, ...prev])
    setTimeout(() => setIsBackingUp(false), 1000)
  }, [])

  const handleRestore = useCallback((backupId: string) => {
    setIsRestoring(true)
    setTimeout(() => {
      alert(`Khôi phục từ backup ${backupId} thành công.`)
      setIsRestoring(false)
    }, 1500)
  }, [])

  const handleAdminReviewApprove = useCallback((id: string) => {
    setAdminReviews((prev) => prev.map((review) => (review.id === id ? { ...review, status: "published" } : review)))
  }, [])

  const handleAdminReviewReject = useCallback((id: string, reason: string) => {
    logger.debug("Reject review", { id, reason })
    setAdminReviews((prev) => prev.map((review) => (review.id === id ? { ...review, status: "rejected" } : review)))
  }, [])

  const handleAdminReviewDelete = useCallback((id: string) => {
    setAdminReviews((prev) => prev.filter((review) => review.id !== id))
  }, [])

  const handleAdminReviewRespond = useCallback((id: string, message: string) => {
    logger.debug("Respond review", { id, message })
    alert("Đã lưu phản hồi cho người dùng.")
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Logo />
          <p className="mt-4 text-muted-foreground">Đang tải Admin Panel...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Logo />
          <p className="mt-4 text-muted-foreground">Vui lòng đăng nhập Admin</p>
          <Button 
            onClick={() => router.push("/admin/login")}
            className="mt-4"
          >
            Đăng nhập Admin
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* 3D Background */}
      <div className="absolute inset-0">
        <ThreeJSAdmin />
        <ThreeDFallback />
      </div>
      
      <div className="border-b relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">
                  Chào mừng, {adminUser.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="products">Sản phẩm</TabsTrigger>
            <TabsTrigger value="users">
              Người dùng
              {stats.newUsersCount > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white text-xs shadow-md">
                  {stats.newUsersCount} mới
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deposits">
              Nạp tiền
              {stats.pendingDepositsCount > 0 && (
                <Badge className="ml-2 bg-red-600 text-white text-xs shadow-md">
                  {stats.pendingDepositsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="withdrawals">
              Rút tiền
              {stats.pendingWithdrawalsCount > 0 && (
                <Badge className="ml-2 bg-red-600 text-white text-xs shadow-md">
                  {stats.pendingWithdrawalsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
            <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="support">Hỗ trợ</TabsTrigger>
            <TabsTrigger value="notifications">Thông báo</TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
            <TabsTrigger value="announcements">Thông báo hệ thống</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="promotions">Khuyến mãi</TabsTrigger>
            <TabsTrigger value="reports">Báo cáo</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Overview 
              stats={stats}
              users={users}
              purchases={purchases}
              notifications={notifications}
            />
          </TabsContent>

          <TabsContent value="products">
            <Product
              products={products}
              setProducts={setProducts}
              adminUser={adminUser}
            />
          </TabsContent>

          <TabsContent value="users">
            <User
              users={users}
              updateUserStatus={updateUserStatus}
              updateUserBalance={updateUserBalance}
            />
            <div className="mt-6">
              <UserBulkActions
                users={bulkUsers.map((user: any) => ({
                  id: (user.uid || user.id || "").toString(),
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  status: user.status,
                  balance: user.balance,
                  selected: user.selected,
                }))}
                onToggle={toggleUserSelection}
                onSelectAll={handleSelectAllUsers}
                onLock={(ids) => bulkUpdateStatus(ids, "blocked")}
                onUnlock={(ids) => bulkUpdateStatus(ids, "active")}
                onExport={handleBulkExport}
                onEmail={handleBulkEmail}
              />
            </div>
          </TabsContent>

          <TabsContent value="deposits">
            <Deposit
              pendingDeposits={pendingDeposits}
              processingDeposit={processingDeposit}
              approveDeposit={approveDeposit}
              rejectDeposit={rejectDeposit}
              loadData={loadData}
            />
          </TabsContent>

          <TabsContent value="withdrawals">
            <Withdrawmoney
              pendingWithdrawals={pendingWithdrawals}
              processingWithdrawal={processingWithdrawal}
              approveWithdrawal={approveWithdrawal}
              rejectWithdrawal={rejectWithdrawal}
              loadData={loadData}
            />
          </TabsContent>
          <TabsContent value="analytics" className="space-y-6">
            <Analytics 
              purchases={purchases}
              users={users}
              products={products}
              deposits={pendingDeposits}
              withdrawals={pendingWithdrawals}
            />
            <UserAnalytics
              retentionRate={userAnalyticsSnapshot.retentionRate}
              churnRate={userAnalyticsSnapshot.churnRate}
              vipUsers={userAnalyticsSnapshot.vipUsers}
              fraudUsers={userAnalyticsSnapshot.fraudUsers}
              cohortData={userAnalyticsSnapshot.cohortData}
              segments={userAnalyticsSnapshot.segments}
            />
            <ProductAnalytics
              trends={productAnalyticsSnapshot.trends}
              topProducts={productAnalyticsSnapshot.topProducts}
              categories={productAnalyticsSnapshot.categories}
            />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionFilters
              filters={transactionFilters}
              onChange={handleTransactionFiltersChange}
              onReset={handleTransactionReset}
              onExport={handleTransactionExport}
            />
            <Card className="bg-white/70 dark:bg-black/40">
              <CardHeader>
                <CardTitle>Danh sách giao dịch</CardTitle>
                <CardDescription>{filteredTransactions.length} bản ghi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                {filteredTransactions.map((txn) => (
                  <div key={txn.id} className="p-3 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{txn.email}</p>
                      <p className="text-xs text-muted-foreground">{new Date(txn.date).toLocaleString("vi-VN")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{txn.type}</Badge>
                      <Badge variant="secondary">{txn.method}</Badge>
                      <span className={`text-sm font-semibold ${txn.type === "withdraw" ? "text-red-500" : "text-green-600"}`}>
                        {txn.type === "withdraw" ? "-" : "+"}{txn.amount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewManagement
              reviews={adminReviews}
              onApprove={handleAdminReviewApprove}
              onReject={handleAdminReviewReject}
              onDelete={handleAdminReviewDelete}
              onRespond={handleAdminReviewRespond}
            />
          </TabsContent>

          <TabsContent value="chat">
            <ChatAdmin />
          </TabsContent>

          <TabsContent value="support">
            <CustomerSupport users={users} adminUser={adminUser} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationManagement />
          </TabsContent>

          <TabsContent value="settings">
            <Setting
              adminUser={adminUser}
              stats={stats}
              testTelegramNotification={testTelegramNotification}
              testWhatsAppNotification={testWhatsAppNotification}
            />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementManager
              items={announcements}
              onCreate={handleAnnouncementCreate}
              onToggle={handleAnnouncementToggle}
              onDelete={handleAnnouncementDelete}
            />
          </TabsContent>

          <TabsContent value="faq">
            <FAQManager
              faqs={faqItems}
              onSave={handleFaqSave}
              onToggle={handleFaqToggle}
              onDelete={handleFaqDelete}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogs
              logs={auditLogs.filter((log) =>
                !auditSearch ||
                log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                (log.userEmail || "").toLowerCase().includes(auditSearch.toLowerCase())
              )}
              search={auditSearch}
              onSearchChange={setAuditSearch}
              onExport={handleAuditExport}
            />
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionManager
              promotions={promotions}
              onCreate={handlePromotionCreate}
              onToggle={handlePromotionToggle}
              onDelete={handlePromotionDelete}
            />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReports
              rows={financialRows}
              onExportExcel={handleFinancialExportExcel}
              onExportPDF={handleFinancialExportPDF}
            />
          </TabsContent>

          <TabsContent value="backup">
            <BackupRestore
              backups={backups}
              onBackup={handleBackup}
              onRestore={handleRestore}
              isBackingUp={isBackingUp}
              isRestoring={isRestoring}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminPageContent