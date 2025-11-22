# Hướng dẫn cấu hình Netlify

## Vấn đề hiện tại

Website vẫn còn 2 lỗi trên production:
1. **ReactCurrentBatchConfig error** - Có thể do build cache
2. **API /api/products trả về 503** - Database connection issue

## Giải pháp

### 1. Xóa build cache trên Netlify

1. Vào Netlify Dashboard → Site settings → Build & deploy
2. Click "Clear cache and retry deploy"
3. Hoặc vào Deploys → Trigger deploy → Clear cache and deploy site

### 2. Cấu hình Environment Variables trên Netlify

Vào **Netlify Dashboard** → **Site settings** → **Environment variables**

#### Cách 1: Sử dụng DATABASE_URL (Khuyến nghị)

Thêm biến:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Cách 2: Sử dụng NETLIFY_DATABASE_URL

Nếu Netlify tự động tạo `NETLIFY_DATABASE_URL`, code sẽ tự động sử dụng.

#### Cách 3: Sử dụng các biến riêng lẻ

Thêm các biến sau:
```
DB_HOST=db.qrozeqsmqvkqxqenhike.supabase.co
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_PORT=5432
```

### 3. Các biến môi trường cần thiết khác

Đảm bảo có các biến sau:

**Firebase:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

**NextAuth:**
```
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=https://qtusdev.website
```

**Các biến khác:**
```
NEXT_PUBLIC_SITE_URL=https://qtusdev.website
SKIP_DB_CHECK=false
```

### 4. Kiểm tra sau khi deploy

1. Vào `/health/database` để kiểm tra database connection
2. Kiểm tra console logs trên Netlify để xem lỗi chi tiết
3. Test API endpoint `/api/products`

## Lưu ý

- Database URL từ Supabase thường có format:
  ```
  postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  ```
- Nếu sử dụng connection pooler, port là `6543`
- Nếu sử dụng direct connection, port là `5432`
- Code đã tự động thêm SSL config cho Supabase khi detect Netlify environment

## Sau khi sửa

1. Commit và push code mới lên Git
2. Netlify sẽ tự động rebuild
3. Xóa cache nếu vẫn còn lỗi
4. Kiểm tra lại website

