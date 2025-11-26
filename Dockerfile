# ✅ FIX: Sử dụng Node.js 20 LTS để tương thích Next.js ổn định
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies với npm ci để tái lập build
# ✅ FIX: Set DOCKER_BUILD/SKIP_DB_CHECK để bỏ qua kết nối DB khi build image
ENV DOCKER_BUILD=true
ENV SKIP_DB_CHECK=true
RUN npm ci --legacy-peer-deps

# Sao chép mã nguồn
COPY . .

# Build ứng dụng Next.js
RUN npm run build

# Mở port 3000
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]