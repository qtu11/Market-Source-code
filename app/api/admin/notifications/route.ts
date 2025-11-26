import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-auth"
import { pool } from "@/lib/database"

export const runtime = 'nodejs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET: Get all notifications (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const isRead = searchParams.get('isRead')

    let query = `
      SELECT 
        n.*,
        u.email as user_email,
        u.name as user_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.deleted_at IS NULL
    `
    const params: any[] = []
    let paramIndex = 1

    if (userId) {
      query += ` AND n.user_id = $${paramIndex}`
      params.push(parseInt(userId))
      paramIndex++
    }

    if (type) {
      query += ` AND n.type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (isRead !== null) {
      query += ` AND n.is_read = $${paramIndex}`
      params.push(isRead === 'true')
      paramIndex++
    }

    query += ` ORDER BY n.created_at DESC LIMIT 1000`

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      notifications: result.rows
    })
  } catch (error: any) {
    const { logger } = await import('@/lib/logger')
    logger.error('Admin notifications GET error', error, { endpoint: '/api/admin/notifications' })
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
