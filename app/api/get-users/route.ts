import { NextResponse } from 'next/server'
import { pool } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        uid,
        email,
        name,
        username,
        avatar_url,
        balance,
        role,
        last_login,
        created_at,
        updated_at,
        last_active_ip,
        provider,
        login_count
      FROM users
      ORDER BY created_at DESC
      LIMIT 500
    `)

    const users = result.rows.map((user) => ({
      ...user,
      avatarUrl: user.avatar_url,
      lastActivity: user.last_login,
      ipAddress: user.last_active_ip,
    }))

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error: any) {
    logger.error('Get users error', error, { endpoint: '/api/get-users' })
    return NextResponse.json(
      { error: error.message || 'Lỗi khi lấy danh sách người dùng!' },
      { status: 500 }
    )
  }
}
