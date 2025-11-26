import { NextRequest, NextResponse } from 'next/server'
import { createAdminToken } from '@/lib/jwt'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
  deviceInfo: z.any().optional(),
  ipAddress: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 attempts per 15 minutes
    const { checkRateLimitAndRespond } = await import('@/lib/rate-limit')
    const rateLimitResponse = await checkRateLimitAndRespond(request, 5, 900, 'admin-login')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    
    // Validate input với Zod
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ'
      }, { status: 400 })
    }

    const { email, password, deviceInfo, ipAddress } = validation.data

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || ''
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || ''
    const adminPasswordPlain = process.env.ADMIN_PASSWORD || '' // Fallback for migration
    
    // Validate credentials
    if (!adminEmail || (!adminPasswordHash && !adminPasswordPlain)) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Admin credentials not configured in environment variables')
      }
      return NextResponse.json({
        success: false,
        error: 'Cấu hình hệ thống chưa hoàn tất'
      }, { status: 500 })
    }
    
    // Nếu chưa có hash, tạo hash từ plain password (chỉ lần đầu, chỉ trong development)
    if (!adminPasswordHash && adminPasswordPlain && process.env.NODE_ENV === 'development') {
      const hash = await bcryptjs.hash(adminPasswordPlain, 10)
      logger.warn('⚠️ ADMIN_PASSWORD_HASH chưa được set. Hash mới', { hash })
      logger.warn('⚠️ Vui lòng set ADMIN_PASSWORD_HASH vào .env và xóa ADMIN_PASSWORD')
    }
    
    // Admin credentials check với bcrypt hash
    if (email === adminEmail) {
      let isValid = false
      
      if (adminPasswordHash) {
        // Sử dụng hash
        isValid = await bcryptjs.compare(password, adminPasswordHash)
      } else if (adminPasswordPlain) {
        // Fallback: so sánh plain text (chỉ cho migration, nên xóa sau)
        isValid = password === adminPasswordPlain
        if (process.env.NODE_ENV === 'development') {
          logger.warn('⚠️ Đang dùng ADMIN_PASSWORD (plain text). Nên chuyển sang ADMIN_PASSWORD_HASH')
        }
      }
      
      if (isValid) {
        // Tạo JWT token
        const token = await createAdminToken('admin', adminEmail)
        
        // ✅ SECURITY FIX: Generate CSRF token cho admin session
        const { generateCSRFToken, setCSRFTokenCookie } = await import('@/lib/csrf')
        const csrfToken = generateCSRFToken()
        
        // Create response
        const response = NextResponse.json({
          success: true,
          user: {
            id: 'admin',
            email: adminEmail,
            name: 'Admin',
            role: 'admin',
            loginTime: new Date().toISOString(),
            deviceInfo,
            ipAddress
          },
          token, // Include JWT token in response
          csrfToken // Include CSRF token in response (client cần gửi trong header)
        })

        // Set HTTP-only cookie for admin token
        response.cookies.set('admin-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/',
        })
        
        // ✅ SECURITY FIX: Set CSRF token cookie (httpOnly)
        setCSRFTokenCookie(response, csrfToken)

        return response
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Thông tin đăng nhập không chính xác!'
    }, { status: 401 })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger.error('Admin login error', error)
    }
    return NextResponse.json({
      success: false,
      error: 'Lỗi hệ thống!'
    }, { status: 500 })
  }
}
