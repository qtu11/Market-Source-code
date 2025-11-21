# Sử dụng image Node.js 22.18.0
FROM node:22.18.0-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Sao chép mã nguồn
COPY . .

# Build ứng dụng Next.js
RUN npm run build

# Mở port 3000
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]