# 🚀 Hướng dẫn cấu hình NEXT_PUBLIC_SITE_URL

## 📋 NEXT_PUBLIC_SITE_URL là gì?

`NEXT_PUBLIC_SITE_URL` là URL chính thức của website bạn. Nó được sử dụng để:
- Tạo link trong thông báo WhatsApp
- Redirect sau khi thanh toán
- Tạo link chia sẻ
- API callbacks

## 🔧 Cách cấu hình

### 1. **Phát triển Local (Development)**
\`\`\`env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
\`\`\`

### 2. **Deploy trên Vercel**
\`\`\`env
NEXT_PUBLIC_SITE_URL=https://your-project-name.vercel.app
\`\`\`

### 3. **Domain tùy chỉnh**
\`\`\`env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
\`\`\`

## 📝 Các bước thiết lập

### Bước 1: Tạo file .env.local
Tạo file `.env.local` trong thư mục gốc của project:

\`\`\`env
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Telegram Bot
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID

# Firebase (đã có sẵn)
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain_here
# ... các config Firebase khác
\`\`\`

### Bước 2: Restart server
\`\`\`bash
npm run dev
# hoặc
yarn dev
\`\`\`

### Bước 3: Kiểm tra
- Mở browser: `http://localhost:3000`
- Thử tính năng nạp tiền
- Kiểm tra thông báo WhatsApp có link đúng không

## 🌐 Deploy lên Vercel

### Bước 1: Push code lên GitHub
\`\`\`bash
git add .
git commit -m "Add telegram approve buttons"
git push origin main
\`\`\`

### Bước 2: Deploy trên Vercel
1. Truy cập [vercel.com](https://vercel.com)
2. Import project từ GitHub
3. Thêm Environment Variables:
   - `NEXT_PUBLIC_SITE_URL`: `https://your-project.vercel.app`
   - `TELEGRAM_BOT_TOKEN`: `YOUR_TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`: `YOUR_TELEGRAM_CHAT_ID`

### Bước 3: Cập nhật Telegram Webhook
Sau khi deploy, cần cập nhật webhook URL cho Telegram bot:

\`\`\`bash
curl -X POST "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook" \
-H "Content-Type: application/json" \
-d '{"url": "https://your-project.vercel.app/api/telegram-webhook"}'
\`\`\`

## 🔍 Troubleshooting

### Lỗi thường gặp:

1. **Link không hoạt động**
   - Kiểm tra `NEXT_PUBLIC_SITE_URL` có đúng không
   - Đảm bảo không có dấu `/` ở cuối URL

2. **Webhook không hoạt động**
   - Kiểm tra URL webhook đã set đúng chưa
   - Verify SSL certificate của domain

3. **Environment variables không load**
   - Restart server sau khi thay đổi .env
   - Kiểm tra tên biến có đúng không (phân biệt hoa thường)

## 📱 Test thông báo

Để test thông báo có nút duyệt:
1. Đăng nhập vào website
2. Thử nạp tiền
3. Kiểm tra Telegram có nhận thông báo với nút "Duyệt" không
4. Bấm nút để test tính năng

## 🎯 Lưu ý quan trọng

- `NEXT_PUBLIC_SITE_URL` phải là URL công khai (không localhost khi deploy)
- Telegram webhook chỉ hoạt động với HTTPS (trừ localhost)
- Nhớ cập nhật URL khi chuyển từ development sang production
