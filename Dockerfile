# ✅ FIX: Sử dụng Node.js 22 LTS (đồng bộ với netlify.toml)
FROM node:22-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
# ✅ FIX: Set DOCKER_BUILD để kích hoạt standalone output
ENV DOCKER_BUILD=true
RUN npm install

# Sao chép mã nguồn
COPY . .

# Build ứng dụng Next.js
RUN npm run build

# Mở port 3000
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]