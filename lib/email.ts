/**
 * Email Service using Resend
 * Fallback to console.log in development
 */

let resend: any = null;

async function getResend() {
  if (resend) return resend;
  
  try {
    // Dynamic import to avoid build errors if package not installed
    const resendModule = await import('resend');
    const Resend = resendModule.Resend || (resendModule as any).default;
    if (!Resend) throw new Error('Resend not found');
    
    resend = new Resend(process.env.RESEND_API_KEY);
    return resend;
  } catch (error) {
    console.warn('Resend not available, using console fallback');
    return null;
  }
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions) {
  const emailService = await getResend();
  
  if (!emailService) {
    // Fallback: log to console in development
    console.log('📧 Email (console fallback):', {
      to: options.to,
      subject: options.subject,
      html: options.html.substring(0, 100) + '...',
    });
    return { success: true, id: 'console-fallback' };
  }

  try {
    const result = await emailService.emails.send({
      from: options.from || process.env.EMAIL_FROM || 'noreply@qtusdevmarket.com',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    });

    return { success: true, id: result.id };
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Email templates
export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Chào mừng đến với QTUS Dev Market!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Chào mừng ${name}!</h1>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại QTUS Dev Market.</p>
        <p>Bạn có thể bắt đầu khám phá các sản phẩm source code chất lượng cao ngay bây giờ!</p>
        <a href="${process.env.NEXT_PUBLIC_URL}/products" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Xem sản phẩm
        </a>
      </div>
    `,
  });
}

export async function sendPurchaseConfirmationEmail(email: string, productName: string, amount: number) {
  return sendEmail({
    to: email,
    subject: `Xác nhận mua hàng: ${productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Cảm ơn bạn đã mua hàng!</h1>
        <p>Sản phẩm: <strong>${productName}</strong></p>
        <p>Số tiền: <strong>$${amount.toFixed(2)}</strong></p>
        <p>Bạn có thể tải sản phẩm từ dashboard của mình.</p>
        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Xem Dashboard
        </a>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetLink = `${process.env.NEXT_PUBLIC_URL}/auth/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Đặt lại mật khẩu</h1>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấp vào liên kết bên dưới để tiếp tục:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Đặt lại mật khẩu
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Liên kết này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
      </div>
    `,
  });
}

export async function sendDepositApprovalEmail(email: string, amount: number, newBalance: number) {
  return sendEmail({
    to: email,
    subject: `Nạp tiền thành công: $${amount.toFixed(2)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Nạp tiền thành công!</h1>
        <p>Số tiền nạp: <strong>$${amount.toFixed(2)}</strong></p>
        <p>Số dư hiện tại: <strong>$${newBalance.toFixed(2)}</strong></p>
        <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Xem Dashboard
        </a>
      </div>
    `,
  });
}

