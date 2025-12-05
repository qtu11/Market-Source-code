import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, deletePasswordResetTokens, createPasswordResetTokenRecord } from '@/lib/database-mysql';
import { getClientIP } from '@/lib/api-auth';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { notifyPasswordReset } from '@/lib/server-notifications';
import { sendPasswordResetEmail } from '@/lib/email';

export const runtime = 'nodejs'

/**
 * ✅ FIX: Request Password Reset - Migrate từ localStorage sang PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    const { email, deviceInfo, ipAddress: providedIp } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email là bắt buộc' },
        { status: 400 }
      );
    }
    
    // ✅ FIX: Tìm user trong PostgreSQL thay vì localStorage
    const user = await getUserByEmail(email);
    
    if (!user) {
      // Không tiết lộ email có tồn tại hay không (security best practice)
      return NextResponse.json(
        { success: true, message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu' }
      );
    }
    
    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token hết hạn sau 1 giờ
    
    await deletePasswordResetTokens(user.id);
    await createPasswordResetTokenRecord(user.id, token, expiresAt);
    
    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (emailError) {
      logger.error('Failed to send password reset email', emailError, { email });
      return NextResponse.json(
        { success: false, error: 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.' },
        { status: 500 }
      );
    }
    
    const ipAddress = providedIp || getClientIP(request);

    notifyPasswordReset({
      email,
      ipAddress,
      deviceInfo,
    }).catch((error) => {
      logger.warn('Failed to send password reset notification', { error: error?.message });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu',
      // Trong production, không trả về token
      // token: process.env.NODE_ENV === 'development' ? token : undefined
    });
  } catch (error: any) {
    logger.error('API request password reset error', error, { endpoint: '/api/request-password-reset' });
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to request password reset' },
      { status: 500 }
    );
  }
}
