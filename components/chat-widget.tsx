"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, X, Send, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { apiGet, apiPost } from "@/lib/api-client"

interface Message {
  id: number
  message: string
  isAdmin: boolean
  createdAt: string
  senderName?: string
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
 
  useEffect(() => {
    // Load current user - only on client side
    if (typeof window === 'undefined') return
    
    try {
      const userStr = localStorage.getItem("currentUser") || localStorage.getItem("qtusdev_user")
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      }
    } catch (error) {
      console.error("Error parsing user:", error)
    }
  }, [])

  const loadChatHistory = useCallback(async () => {
    if (!currentUser) return

    try {
      const result = await apiGet('/api/chat')
      
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
      const lastSeenMessageId = parseInt(localStorage.getItem('lastSeenMessageId') || '0')
      const unread = sortedMessages.filter(
        (m) => m.isAdmin && m.id > lastSeenMessageId
      ).length

      setUnreadCount(unread)
      setMessages(sortedMessages)

      // Update last seen message ID (only if chat is open)
      if (isOpen && sortedMessages.length > 0) {
        const lastMessageId = sortedMessages[sortedMessages.length - 1].id
        localStorage.setItem('lastSeenMessageId', lastMessageId.toString())
      }
    } catch (error: any) {
      // ✅ Better error handling - don't spam console if it's just auth error
      if (error.message?.includes('Unauthorized')) {
        console.warn('Chat: User not authenticated')
      } else {
        console.error('Error loading chat history:', error)
      }
    }
  }, [currentUser, isOpen])
 
  useEffect(() => {
    if (currentUser && isOpen) {
      loadChatHistory()
      
      // ✅ Realtime polling mỗi 2 giây
      pollingIntervalRef.current = setInterval(() => {
        loadChatHistory()
      }, 2000)

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
      const result = await apiPost('/api/chat', {
        message: messageText
      })

      // Add message to local state immediately
      const newMessage: Message = {
        id: result.message?.id || Date.now(),
        message: messageText,
        isAdmin: false,
        createdAt: result.message?.createdAt || new Date().toISOString(),
        senderName: currentUser.name || currentUser.email || 'You'
      }

      setMessages(prev => [...prev, newMessage])
      setMessageText("")
      
      // Reload chat history after a short delay
      setTimeout(() => {
        loadChatHistory()
      }, 500)
    } catch (error: any) {
      console.error('Error sending message:', error)
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

  // Don't show if user not logged in
  if (!currentUser) {
    return null
  }

  // ✅ Don't show on admin pages
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return null
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleOpenChat}
            size="lg"
            className="rounded-full w-16 h-16 shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white relative"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 ${isMinimized ? 'w-80' : 'w-96'} transition-all duration-300`}>
          <Card className="shadow-2xl border-2 border-purple-500/20 bg-white dark:bg-gray-900">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Chat với Admin
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseChat}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="p-0">
                {/* Messages Area */}
                <ScrollArea className="h-96 p-4">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.isAdmin
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <p className="text-xs font-semibold mb-1 opacity-70">
                              {msg.isAdmin ? 'Admin' : 'Bạn'}
                            </p>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className="text-xs opacity-50 mt-1">
                              {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Nhập tin nhắn..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || isLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Nhấn Enter để gửi, Shift+Enter để xuống dòng
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

