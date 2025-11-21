import { logger } from './logger';

type DeviceInfo = {
  deviceType?: string;
  browser?: string;
  os?: string;
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

function formatDeviceInfo(deviceInfo?: DeviceInfo) {
  if (!deviceInfo) {
    return 'Thiết bị: Unknown';
  }

  const type = deviceInfo.deviceType || 'Unknown';
  const browser = deviceInfo.browser || 'Unknown';
  const os = deviceInfo.os || 'Unknown';

  return `Thiết bị: ${type} (${browser})\n💻 OS: ${os}`;
}

async function sendTelegramMessage(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn('Telegram credentials missing, skip notification');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    logger.error('Telegram notification failed', error);
  }
}

async function sendWhatsAppMessage(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    logger.warn('Twilio credentials missing, skip WhatsApp notification');
    return;
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
        To: `whatsapp:${to}`,
        Body: body,
      }),
    });
  } catch (error) {
    logger.error('WhatsApp notification failed', error);
  }
}

export async function notifyDepositRequest(payload: {
  userName?: string;
  userEmail?: string;
  amount: number;
  method: string;
  transactionId: string;
  ipAddress?: string;
  deviceInfo?: DeviceInfo;
}) {
  const message = `💳 <b>YÊU CẦU NẠP TIỀN MỚI</b>

👤 <b>Khách hàng:</b> ${payload.userName || 'Unknown'}
📧 <b>Email:</b> ${payload.userEmail || 'Unknown'}
💰 <b>Số tiền:</b> ${payload.amount.toLocaleString('vi-VN')}đ
🏦 <b>Phương thức:</b> ${payload.method}
📝 <b>Mã giao dịch:</b> ${payload.transactionId}
🌐 <b>IP:</b> ${payload.ipAddress || 'Unknown'}
📱 <b>${formatDeviceInfo(payload.deviceInfo)}

⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}

<i>Vui lòng kiểm tra và duyệt yêu cầu!</i>`;

  await sendTelegramMessage(message);
}

export async function notifyWithdrawalRequest(payload: {
  userName?: string;
  userEmail?: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ipAddress?: string;
  deviceInfo?: DeviceInfo;
}) {
  const message = `💸 <b>YÊU CẦU RÚT TIỀN MỚI</b>

👤 <b>Khách hàng:</b> ${payload.userName || 'Unknown'}
📧 <b>Email:</b> ${payload.userEmail || 'Unknown'}
💰 <b>Số tiền:</b> ${payload.amount.toLocaleString('vi-VN')}đ
🏦 <b>Ngân hàng:</b> ${payload.bankName}
📝 <b>Tài khoản:</b> ${payload.accountName} - ${payload.accountNumber}
🌐 <b>IP:</b> ${payload.ipAddress || 'Unknown'}
📱 <b>${formatDeviceInfo(payload.deviceInfo)}
⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}

<i>Vui lòng kiểm tra và xử lý!</i>`;

  await sendTelegramMessage(message);
}

export async function notifyPasswordReset(payload: {
  email: string;
  ipAddress?: string;
  deviceInfo?: DeviceInfo;
}) {
  const message = `🔄 <b>YÊU CẦU ĐẶT LẠI MẬT KHẨU</b>

📧 <b>Email:</b> ${payload.email}
🌐 <b>IP:</b> ${payload.ipAddress || 'Unknown'}
📱 <b>${formatDeviceInfo(payload.deviceInfo)}
⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}

<i>Vui lòng kiểm tra yêu cầu này.</i>`;

  await sendTelegramMessage(message);

  const adminWhatsapp = process.env.ADMIN_WHATSAPP || '';
  if (adminWhatsapp) {
    await sendWhatsAppMessage(adminWhatsapp, message.replace(/<[^>]*>/g, ''));
  }
}

export async function notifyPurchaseSuccess(payload: {
  userName?: string;
  userEmail?: string;
  amount: number;
  productTitle: string;
}) {
  const message = `🛒 <b>ĐƠN HÀNG MỚI</b>

👤 <b>Khách hàng:</b> ${payload.userName || 'Unknown'}
📧 <b>Email:</b> ${payload.userEmail || 'Unknown'}
🛍️ <b>Sản phẩm:</b> ${payload.productTitle}
💰 <b>Giá trị:</b> ${payload.amount.toLocaleString('vi-VN')}đ
⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}

<i>Đơn hàng đã thanh toán thành công.</i>`;

  await sendTelegramMessage(message);
}

