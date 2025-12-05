import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { findValidPasswordResetToken, consumePasswordResetToken, updateUserPasswordHash } from "@/lib/database-mysql"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

const resetSchema = z.object({
  token: z.string().min(32, 'Token không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;
    const tokenRecord = await findValidPasswordResetToken(token);

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await updateUserPasswordHash(tokenRecord.user_id, passwordHash);
    await consumePasswordResetToken(token);

    return NextResponse.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công',
    });
  } catch (error: any) {
    logger.error('Reset password API error', error, { endpoint: '/api/reset-password' });
    return NextResponse.json(
      { success: false, error: error.message || 'Không thể đặt lại mật khẩu' },
      { status: 500 }
    );
  }
}
