"use client"

import { useState, useEffect, useCallback } from "react"
import { logger } from "@/lib/logger-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Send, Users, User, Filter, Search, X } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Notification {
  id: string | number
  user_id: number
  user_email?: string
  user_name?: string
  type: 'system' | 'deposit' | 'withdraw' | 'chat' | 'promotion'
  title: string
  message: string
  is_read: boolean
  created_at: string
}

interface User {
  id: number
  email: string
  name: string
}

export function NotificationManagement() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  
  // Form state
  const [newNotification, setNewNotification] = useState({
    userId: "",
    userEmail: "",
    type: "system" as const,
    title: "",
    message: ""
  })

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const result = await apiGet('/api/users')
      if (result.success && result.users) {
        setUsers(result.users)
      }
    } catch (error) {
      logger.error('Error loading users', error)
    }
  }, [])

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      // Admin có thể xem tất cả notifications
      // Cần tạo API endpoint riêng cho admin
      const result = await apiGet('/api/admin/notifications')
      
      if (result.success && result.notifications) {
        const sorted = result.notifications.sort((a: Notification, b: Notification) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setNotifications(sorted)
      }
    } catch (error) {
      logger.error('Error loading notifications', error)
      // Fallback: Load từ user notifications nếu admin endpoint chưa có
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    loadNotifications()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadUsers, loadNotifications])

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesUser = selectedUser === "all" || n.user_id.toString() === selectedUser
    const matchesType = filterType === "all" || n.type === filterType
    const matchesSearch = searchQuery === "" || 
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesUser && matchesType && matchesSearch
  })

  // Send notification
  const sendNotification = useCallback(async () => {
    try {
      if (!newNotification.message) {
        alert("Vui lòng nhập nội dung thông báo!")
        return
      }

      if (newNotification.userId === "all") {
        // Gửi cho tất cả users
        if (!confirm("Bạn có chắc chắn muốn gửi thông báo cho TẤT CẢ người dùng?")) {
          return
        }
        
        // Gửi cho từng user
        const allUsers = users
        for (const user of allUsers) {
          await apiPost('/api/notifications', {
            userId: user.id,
            userEmail: user.email,
            type: newNotification.type,
            title: newNotification.title || "Thông báo hệ thống",
            message: newNotification.message
          })
        }
        
        alert(`Đã gửi thông báo cho ${allUsers.length} người dùng!`)
      } else {
        // Gửi cho user cụ thể
        const user = users.find(u => u.id.toString() === newNotification.userId)
        if (!user) {
          alert("Không tìm thấy người dùng!")
          return
        }

        await apiPost('/api/notifications', {
          userId: user.id,
          userEmail: user.email,
          type: newNotification.type,
          title: newNotification.title || "Thông báo",
          message: newNotification.message
        })
        
        alert("Đã gửi thông báo thành công!")
      }

      // Reset form
      setNewNotification({
        userId: "",
        userEmail: "",
        type: "system",
        title: "",
        message: ""
      })

      // Reload notifications
      loadNotifications()
    } catch (error: any) {
      logger.error('Error sending notification', error)
      alert("Có lỗi xảy ra khi gửi thông báo: " + (error.message || "Vui lòng thử lại"))
    }
  }, [newNotification, users, loadNotifications])

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💰'
      case 'withdraw':
        return '💸'
      case 'chat':
        return '💬'
      case 'promotion':
        return '🎁'
      default:
        return '🔔'
    }
  }

  // Get notification color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'bg-green-100 text-green-800'
      case 'withdraw':
        return 'bg-blue-100 text-blue-800'
      case 'chat':
        return 'bg-purple-100 text-purple-800'
      case 'promotion':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý thông báo</h2>
          <p className="text-muted-foreground">Gửi và quản lý thông báo cho người dùng</p>
        </div>
        <Badge className="bg-blue-600 text-white">
          {unreadCount} chưa đọc
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <Card className="bg-white/60 dark:bg-gray-800/60">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="w-5 h-5 mr-2" />
              Gửi thông báo mới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notification-type">Loại thông báo</Label>
              <Select
                value={newNotification.type}
                onValueChange={(value: any) => setNewNotification({ ...newNotification, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Hệ thống</SelectItem>
                  <SelectItem value="deposit">Nạp tiền</SelectItem>
                  <SelectItem value="withdraw">Rút tiền</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="promotion">Khuyến mãi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notification-user">Gửi đến</Label>
              <Select
                value={newNotification.userId}
                onValueChange={(value) => setNewNotification({ ...newNotification, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người dùng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Tất cả người dùng
                    </div>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        {user.name} ({user.email})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notification-title">Tiêu đề (tùy chọn)</Label>
              <Input
                id="notification-title"
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                placeholder="Tiêu đề thông báo"
              />
            </div>

            <div>
              <Label htmlFor="notification-message">Nội dung thông báo *</Label>
              <Textarea
                id="notification-message"
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                placeholder="Nhập nội dung thông báo..."
                rows={5}
                required
              />
            </div>

            <Button onClick={sendNotification} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Gửi thông báo
            </Button>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="bg-white/60 dark:bg-gray-800/60">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Danh sách thông báo ({filteredNotifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="space-y-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Người dùng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="system">Hệ thống</SelectItem>
                    <SelectItem value="deposit">Nạp tiền</SelectItem>
                    <SelectItem value="withdraw">Rút tiền</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="promotion">Khuyến mãi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notifications */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Đang tải...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Không có thông báo nào</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border rounded-lg ${
                      !notification.is_read
                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200'
                        : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <Badge className={getNotificationColor(notification.type)}>
                            {notification.type}
                          </Badge>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm mb-1">
                          {notification.title || 'Thông báo'}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          👤 {notification.user_email || 'Unknown'} • {new Date(notification.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

