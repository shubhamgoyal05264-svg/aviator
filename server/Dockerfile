FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g prisma@5.22.0
COPY . .
EXPOSE 3000
CMD sh -c "prisma generate && npm run dev"
