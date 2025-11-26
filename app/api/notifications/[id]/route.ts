import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getUserIdByEmail } from "@/lib/database"
import { pool } from "@/lib/database"

export const runtime = 'nodejs'

// PUT: Update notification (mark as read/unread)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const routeParams = await params
    const authUser = await verifyFirebaseToken(request)
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = await getUserIdByEmail(authUser.email || '')
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { is_read } = body

    // Update notification
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [is_read, routeParams.id, userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      notification: result.rows[0]
    })
  } catch (error: any) {
    const { logger } = await import('@/lib/logger')
    logger.error('Notification PUT error', error, { endpoint: '/api/notifications/[id]' })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const routeParams = await params
    const authUser = await verifyFirebaseToken(request)
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = await getUserIdByEmail(authUser.email || '')
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Soft delete notification
    const result = await pool.query(
      `UPDATE notifications 
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [routeParams.id, userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    })
  } catch (error: any) {
    const { logger } = await import('@/lib/logger')
    logger.error('Notification DELETE error', error, { endpoint: '/api/notifications/[id]' })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
