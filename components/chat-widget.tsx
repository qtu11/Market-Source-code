"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { MessageCircle, X, Send, Minimize2, LogIn, LifeBuoy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { apiGet, apiPost } from "@/lib/api-client"
import { logger } from "@/lib/logger-client"
import { cn } from "@/lib/utils"
import type { User } from "@/types"

interface Message {
  id: number
  message: string
  isAdmin: boolean
  createdAt: string
  senderName?: string
}

export function ChatWidget() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])
 
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const userStr =
        localStorage.getItem("currentUser") ||
        localStorage.getItem("qtusdev_user") ||
        localStorage.getItem("qtusdev_user_fallback")
      if (userStr) {
        const user = JSON.parse(userStr) as User
        setCurrentUser(user)
      }
    } catch (error) {
      logger.error("Error parsing user:", error)
    }
  }, [])

  const loadChatHistory = useCallback(async () => {
    if (!currentUser) return

    try {
      const result = await apiGet("/api/chat")
      
      // ✅ Handle API response errors
      if (!result || !result.success) {
        console.warn('Chat API returned error:', result?.error)
        return
      }
      
      const chatMessages = result.messages || []
      
      const mappedMessages: Message[] = chatMessages.map((m: any) => ({
        id: m.id,
        message: m.message || m.content || '',
        isAdmin: m.is_admin || m.isAdmin || false,
        createdAt: m.created_at || m.createdAt || new Date().toISOString(),
        senderName: m.user_name || m.user_email || (m.is_admin || m.isAdmin ? 'Admin' : 'User'),
      }))

      // Sort by created_at
      const sortedMessages = mappedMessages.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB
      })

      // Count unread messages (messages from admin that user hasn't seen)
      if (typeof window !== "undefined") {
        const lastSeenMessageId = parseInt(localStorage.getItem("lastSeenMessageId") || "0")
        const unread = sortedMessages.filter(m => m.isAdmin && m.id > lastSeenMessageId).length
        setUnreadCount(unread)

        if (isOpen && sortedMessages.length > 0) {
          const lastMessageId = sortedMessages[sortedMessages.length - 1].id
          localStorage.setItem("lastSeenMessageId", lastMessageId.toString())
        }
      }
      
      setMessages(sortedMessages)
    } catch (error: any) {
      // ✅ Better error handling - don't spam console if it's just auth error
      if (error.message?.includes("Unauthorized")) {
        console.warn("Chat: User not authenticated")
      } else {
        logger.error("Error loading chat history:", error)
      }
    }
  }, [currentUser, isOpen])
 
  useEffect(() => {
    if (currentUser && isOpen) {
      loadChatHistory()
      
      // ✅ Realtime polling mỗi 2 giây
      pollingIntervalRef.current = setInterval(() => {
        loadChatHistory()
      }, 2500)

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    } else {
      // ✅ Clear interval when chat is closed
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [currentUser, isOpen, loadChatHistory])

  useEffect(() => {
    // Scroll to bottom khi có tin nhắn mới
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageText.trim() || isLoading || !currentUser) return

    setIsLoading(true)
    try {
      const result = await apiPost("/api/chat", {
        message: messageText
      })

      // Add message to local state immediately
      const newMessage: Message = {
        id: result.message?.id || Date.now(),
        message: messageText,
        isAdmin: false,
        createdAt: result.message?.createdAt || new Date().toISOString(),
        senderName: currentUser.name || currentUser.email || "You"
      }

      setMessages(prev => [...prev, newMessage])
      setMessageText("")
      
      // Reload chat history after a short delay
      setTimeout(() => {
        loadChatHistory()
      }, 500)
    } catch (error: any) {
      logger.error("Error sending message:", error)
      alert("Lỗi gửi tin nhắn: " + (error.message || "Vui lòng thử lại"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChat = () => {
    setIsOpen(true)
    setIsMinimized(false)
    setUnreadCount(0)
    if (currentUser) {
      loadChatHistory()
    }
  }

  const handleCloseChat = () => {
    setIsOpen(false)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
  }

  if (!isMounted) {
    return null
  }

  if (pathname?.startsWith("/admin")) {
    return null
  }

  const isAuthenticated = Boolean(currentUser)
  const statusLabel = isAuthenticated ? "Admin đang trực tuyến" : "Đăng nhập để chat"

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/50 to-pink-500/50 blur-2xl opacity-80 animate-pulse" />
          <Button
            onClick={handleOpenChat}
            size="lg"
            className="relative rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border border-white/20"
            aria-label="Mở chat hỗ trợ"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 transition-all duration-300",
            isMinimized ? "w-80" : "w-[26rem]"
          )}
        >
          <Card className="shadow-2xl border border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Hỗ trợ trực tuyến
                </CardTitle>
                <span className="text-xs text-white/80 flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full animate-pulse", isAuthenticated ? "bg-emerald-300" : "bg-yellow-300")} />
                  {statusLabel}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  aria-label={isMinimized ? "Mở rộng cửa sổ chat" : "Thu nhỏ cửa sổ chat"}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseChat}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  aria-label="Đóng chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="p-0">
                {isAuthenticated ? (
                  <>
                    <ScrollArea className="h-96 p-4">
                      <div className="space-y-3">
                        {messages.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!</p>
                          </div>
                        ) : (
                          messages.map(msg => (
                            <div key={msg.id} className={cn("flex", msg.isAdmin ? "justify-start" : "justify-end")}>
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                                  msg.isAdmin
                                    ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white border border-white/20 dark:border-slate-700"
                                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                )}
                              >
                                <p className="text-xs font-semibold mb-1 opacity-80">
                                  {msg.isAdmin ? "Admin QtusDev" : "Bạn"}
                                </p>
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                <p className="text-[11px] opacity-60 mt-2">
                                  {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="border-t border-white/10 bg-slate-50 dark:bg-slate-900/40 p-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Nhập tin nhắn..."
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          rows={2}
                          className="resize-none bg-white/80 dark:bg-slate-900/60"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageText.trim() || isLoading}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                        <span>Nhấn Enter để gửi • Shift + Enter để xuống dòng</span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-300 hover:underline"
                          onClick={() => router.push("/support")}
                        >
                          <LifeBuoy className="w-3 h-3" />
                          Xem trung tâm hỗ trợ
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Đăng nhập để trò chuyện</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Bạn cần đăng nhập để kết nối trực tiếp với đội ngũ hỗ trợ và lưu lịch sử hội thoại.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600" onClick={() => router.push("/auth/login")}>
                        <LogIn className="w-4 h-4 mr-2" />
                        Đăng nhập ngay
                      </Button>
                      <Button variant="outline" onClick={() => router.push("/support")}>
                        <LifeBuoy className="w-4 h-4 mr-2" />
                        Xem hướng dẫn hỗ trợ
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

