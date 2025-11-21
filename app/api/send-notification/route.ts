import { NextResponse } from 'next/server'
import { saveNotification } from '@/lib/admin-helpers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, title, message, user, admin, device, ip } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Thiếu thông tin cần thiết!' },
        { status: 400 }
      )
    }

    const notification = {
      type,
      title,
      message,
      user: user || null,
      admin: admin || null,
      timestamp: new Date().toISOString(),
      device: device || 'Unknown',
      ip: ip || 'Unknown',
      read: false
    }

    saveNotification(notification)

    // Gửi Telegram nếu cần
    if (message && process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN) {
      try {
        await fetch('/api/send-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        })
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError)
      }
    }

    return NextResponse.json({
      success: true,
      notification,
      message: 'Thông báo đã được gửi!'
    })
  } catch (error: any) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi khi gửi thông báo!' },
      { status: 500 }
    )
  }
}
